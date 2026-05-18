from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List
from engine import recommender

app = FastAPI(title="Recommendation Engine", version="1.0.0")

class RecommendationRequest(BaseModel):
    user_id: int
    limit: int = 10

class RecommendationResponse(BaseModel):
    game_id: str
    score: float
    explanation: str

@app.on_event("startup")
async def startup_event():
    print("Loading data into Recommendation Engine...")
    await recommender.load_data()
    print("Data loaded successfully.")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "recommendation-engine"}

@app.post("/recommend", response_model=List[RecommendationResponse])
def get_recommendations(req: RecommendationRequest, background_tasks: BackgroundTasks):
    results = recommender.get_recommendations(user_id=req.user_id, limit=req.limit)
    return results

@app.post("/refresh")
async def refresh_data():
    print("Force reloading data into Recommendation Engine...")
    await recommender.load_data()
    return {"status": "success", "message": "Cache reloaded"}
