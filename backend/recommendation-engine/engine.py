import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MultiLabelBinarizer
import httpx
import os

USER_SERVICE_URL = os.environ.get("USER_SERVICE_URL", "http://user-service:8001")
CATALOG_SERVICE_URL = os.environ.get("CATALOG_SERVICE_URL", "http://catalog-service:8002")

class HybridRecommender:
    def __init__(self):
        self.games_df = pd.DataFrame()
        self.ratings_df = pd.DataFrame()
        self.content_sim_matrix = None
        self.user_item_matrix = None
        self.collab_sim_matrix = None
        
    async def load_data(self):
        async with httpx.AsyncClient() as client:
            # Fetch games
            games_resp = await client.get(f"{CATALOG_SERVICE_URL}/games?limit=1000")
            if games_resp.status_code == 200:
                self.games_df = pd.DataFrame(games_resp.json())
                
            # Fetch ratings
            ratings_resp = await client.get(f"{USER_SERVICE_URL}/ratings?limit=10000")
            if ratings_resp.status_code == 200:
                self.ratings_df = pd.DataFrame(ratings_resp.json())
                
        self._build_content_model()
        self._build_collab_model()

    def _build_content_model(self):
        if self.games_df.empty:
            return
            
        # Feature engineering: genres
        mlb = MultiLabelBinarizer()
        genres_encoded = mlb.fit_transform(self.games_df['genres'])
        
        # Calculate cosine similarity between games based on genres
        self.content_sim_matrix = cosine_similarity(genres_encoded)
        
    def _build_collab_model(self):
        if self.ratings_df.empty:
            return
            
        # Create user-item rating matrix
        self.user_item_matrix = self.ratings_df.pivot(
            index='user_id', 
            columns='game_id', 
            values='rating'
        ).fillna(0)
        
        # Calculate cosine similarity between items based on user ratings
        # Transpose to get item-item similarity
        self.collab_sim_matrix = cosine_similarity(self.user_item_matrix.T)
        self.collab_game_ids = self.user_item_matrix.columns.tolist()

    def get_recommendations(self, user_id: int, limit: int = 10):
        if self.games_df.empty:
            return []
            
        # Fetch user preferences dynamically from user-service
        user_pref_genres = []
        try:
            with httpx.Client() as client:
                user_resp = client.get(f"{USER_SERVICE_URL}/users/{user_id}", timeout=2.0)
                if user_resp.status_code == 200:
                    user_data = user_resp.json()
                    preferences = user_data.get("preferences", {})
                    if preferences and isinstance(preferences, dict):
                        user_pref_genres = preferences.get("genres", [])
        except Exception as e:
            print(f"Failed to fetch user preferences: {e}")

        # Cold start handling (New User - either no ratings overall or this user has no ratings)
        if self.ratings_df.empty or user_id not in self.ratings_df['user_id'].values:
            return self._get_cold_start_recommendations(limit, user_pref_genres)
            
        # Get user's rated games
        user_ratings = self.ratings_df[self.ratings_df['user_id'] == user_id]
        rated_game_ids = user_ratings['game_id'].tolist()
        
        scores = {}
        explanations = {}
        
        # 1. Collaborative Filtering scoring
        if self.collab_sim_matrix is not None:
            user_idx = self.user_item_matrix.index.get_loc(user_id)
            user_vector_raw = self.user_item_matrix.iloc[user_idx].values
            
            # Center ratings around 0 (e.g. 5 becomes +2, 1 becomes -2). Unrated (0) stay 0.
            user_vector_centered = np.where(user_vector_raw > 0, user_vector_raw - 3, 0)
            
            # Predict ratings using weighted sum of item similarities
            cf_scores = self.collab_sim_matrix.dot(user_vector_centered)
            
            for i, g_id in enumerate(self.collab_game_ids):
                if g_id not in rated_game_ids:
                    scores[g_id] = scores.get(g_id, 0) + (cf_scores[i] * 0.6) # Weight CF at 60%
                    explanations[g_id] = "Te recomendamos esto porque jugadores con gustos similares lo jugaron."

        # 2. Content-Based Filtering scoring
        # Find games similar to the ones the user rated highly (>= 4)
        highly_rated = user_ratings[user_ratings['rating'] >= 4]['game_id'].tolist()
        if highly_rated and self.content_sim_matrix is not None:
            for g_id in highly_rated:
                if g_id in self.games_df['_id'].values:
                    idx = self.games_df[self.games_df['_id'] == g_id].index[0]
                    sim_scores = self.content_sim_matrix[idx]
                    liked_title = self.games_df.iloc[idx]['title']
                    
                    for i, sim_score in enumerate(sim_scores):
                        similar_game_id = self.games_df.iloc[i]['_id']
                        if similar_game_id not in rated_game_ids:
                            scores[similar_game_id] = scores.get(similar_game_id, 0) + (sim_score * 0.4) # Add to score
                            if similar_game_id not in explanations:
                                explanations[similar_game_id] = f"Te recomendamos esto porque es similar a otros juegos de tu biblioteca."
                            # Override explanation if content is stronger
                            if sim_score > 0.8:
                                explanations[similar_game_id] = f"Te recomendamos esto porque te gustó {liked_title}."
                                
        # Penalize games similar to the ones the user disliked (<= 2)
        poorly_rated = user_ratings[user_ratings['rating'] <= 2]['game_id'].tolist()
        if poorly_rated and self.content_sim_matrix is not None:
            for g_id in poorly_rated:
                if g_id in self.games_df['_id'].values:
                    idx = self.games_df[self.games_df['_id'] == g_id].index[0]
                    sim_scores = self.content_sim_matrix[idx]
                    
                    for i, sim_score in enumerate(sim_scores):
                        similar_game_id = self.games_df.iloc[i]['_id']
                        if similar_game_id not in rated_game_ids:
                            # Subtract score, making it less likely to be recommended
                            scores[similar_game_id] = scores.get(similar_game_id, 0) - (sim_score * 0.4)
        
        # 3. Onboarding preferences boosting
        if user_pref_genres:
            for g_id in scores.keys():
                game_row = self.games_df[self.games_df['_id'] == g_id]
                if not game_row.empty:
                    game_genres = game_row.iloc[0].get('genres', [])
                    matching_genres = [g for g in game_genres if g in user_pref_genres]
                    if matching_genres:
                        scores[g_id] += len(matching_genres) * 0.3 # Boost by 0.3 points per matching genre
                        current_explanation = explanations.get(g_id, f"Te recomendamos esto por tus gustos en {', '.join(matching_genres)}.")
                        if not current_explanation.startswith("Te recomendamos esto porque te gustó"):
                            explanations[g_id] = f"Recomendado por tu interés en {', '.join(matching_genres)}. " + current_explanation

        # 4. Post-processing (Boosting for discount)
        for g_id in scores.keys():
            game_row = self.games_df[self.games_df['_id'] == g_id]
            if not game_row.empty:
                discount = game_row.iloc[0].get('discount_percentage', 0)
                if discount > 0:
                    scores[g_id] += (discount / 100.0) * 0.5 # Boost up to 0.5 points
                    current_explanation = explanations.get(g_id, "Recomendado basado en tus preferencias.")
                    explanations[g_id] = current_explanation + f" ¡Además, tiene un {discount}% de descuento!"
                    
        # Sort and return top N
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        results = []
        for g_id, score in sorted_scores:
            results.append({
                "game_id": g_id,
                "score": round(score, 2),
                "explanation": explanations.get(g_id, "Recomendado basado en tu perfil.")
            })
            
        return results
        
    def _get_cold_start_recommendations(self, limit: int, user_pref_genres: list = None):
        if self.games_df.empty:
            return []
            
        if user_pref_genres is None:
            user_pref_genres = []
            
        results = []
        scored_games = []
        
        for _, row in self.games_df.iterrows():
            base_score = 1.0
            game_genres = row.get('genres', [])
            matching_genres = [g for g in game_genres if g in user_pref_genres]
            
            # Boost score based on matching preferred genres
            if matching_genres:
                base_score += len(matching_genres) * 0.5
                explanation = f"Te recomendamos esto porque te gusta el género {', '.join(matching_genres)}."
            else:
                explanation = "Altamente recomendado para nuevos jugadores."
                
            # Boost for discount
            discount = row.get('discount_percentage', 0)
            if discount > 0:
                base_score += (discount / 100.0) * 0.5
                explanation += f" ¡Además, tiene un {discount}% de descuento!"
                
            scored_games.append({
                "game_id": row['_id'],
                "score": base_score,
                "explanation": explanation,
                "matching_count": len(matching_genres)
            })
            
        # Sort first by matching count (to prioritize matching genres), then by score
        scored_games.sort(key=lambda x: (x['matching_count'] > 0, x['score']), reverse=True)
        
        for item in scored_games[:limit]:
            results.append({
                "game_id": item['game_id'],
                "score": round(item['score'], 2),
                "explanation": item['explanation']
            })
            
        return results

recommender = HybridRecommender()
