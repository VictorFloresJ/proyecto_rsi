import os
import random
import time
import requests
import uuid
import psycopg2
from pymongo import MongoClient
from faker import Faker
import re

fake = Faker()

# Database connection details
PG_HOST = os.environ.get("PG_HOST", "127.0.0.1")
PG_PORT = os.environ.get("PG_PORT", "5433")
PG_USER = os.environ.get("PG_USER", "admin")
PG_PASS = os.environ.get("PG_PASS", "adminpassword")
PG_DB = os.environ.get("PG_DB", "videodb")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://root:rootpassword@localhost:27018/")

STEAM_API_KEY = os.environ.get("STEAM_API_KEY", "")
if not STEAM_API_KEY:
    # Attempt to load from a .env file if available
    try:
        from dotenv import load_dotenv
        load_dotenv()
        STEAM_API_KEY = os.environ.get("STEAM_API_KEY", "")
    except ImportError:
        pass


NUM_USERS = 10
NUM_RATINGS = 60
TARGET_GAMES = 500

def get_pg_connection():
    max_retries = 5
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                user=PG_USER,
                password=PG_PASS,
                database=PG_DB
            )
            return conn
        except psycopg2.OperationalError as e:
            print(f"Waiting for PostgreSQL to be ready... (Attempt {i+1}/{max_retries}). Error: {e}")
            time.sleep(5)
    raise Exception("Failed to connect to PostgreSQL")

def get_mongo_connection():
    max_retries = 5
    for i in range(max_retries):
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            return client
        except Exception as e:
            print(f"Waiting for MongoDB to be ready... (Attempt {i+1}/{max_retries})")
            time.sleep(5)
    raise Exception("Failed to connect to MongoDB")

def clean_html(raw_html):
    if not raw_html:
        return ""
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.strip()

def fetch_top_steam_games(limit=100):
    print("Fetching top games from SteamSpy...")
    try:
        response = requests.get("https://steamspy.com/api.php?request=all&page=0", timeout=10)
        data = response.json()
        app_ids = list(data.keys())
        # Shuffle to get a good mix if we limit it
        random.shuffle(app_ids)
        return app_ids
    except Exception as e:
        print(f"Failed to fetch from SteamSpy: {e}")
        # Fallback list of popular games if SteamSpy fails
        return ["730", "570", "271590", "1172470", "1091500", "1086940", "292030", "413150", "289070", "252490", "105600", "892970", "250900", "381210", "1245620", "359550"]

def seed_data():
    print("Starting data seeding process...")

    # Connect to MongoDB
    mongo_client = get_mongo_connection()
    db_mongo = mongo_client["catalogdb"]
    games_collection = db_mongo["games"]

    # Clear existing games
    games_collection.delete_many({})

    # 1. Generate Games (MongoDB) via Steam API
    app_ids = fetch_top_steam_games()
    games = []
    seen_ids = set()
    
    print(f"Attempting to fetch details for {TARGET_GAMES} games from Steam API...")
    for app_id in app_ids:
        if str(app_id) in seen_ids:
            continue
        seen_ids.add(str(app_id))
        
        if len(games) >= TARGET_GAMES:
            break
            
        try:
            url = f"https://store.steampowered.com/api/appdetails?appids={app_id}&l=en"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 429:
                print("Rate limited by Steam API. Waiting 10 seconds...")
                time.sleep(10)
                continue
                
            data = resp.json()
            if not data or str(app_id) not in data or not data[str(app_id)].get("success"):
                continue
                
            app_data = data[str(app_id)]["data"]
            
            # Skip if not a game
            if app_data.get("type") != "game":
                continue
                
            # Extract fields
            title = app_data.get("name", "Unknown Game")
            desc = clean_html(app_data.get("short_description", ""))
            image_url = app_data.get("header_image", "")
            
            developers = app_data.get("developers", ["Unknown"])
            developer = developers[0] if developers else "Unknown"
            
            publishers = app_data.get("publishers", ["Unknown"])
            publisher = publishers[0] if publishers else "Unknown"
            
            release_date = app_data.get("release_date", {}).get("date", "Unknown")
            
            # Price
            price_overview = app_data.get("price_overview", {})
            if app_data.get("is_free"):
                price = 0.0
                discount = 0
            elif price_overview:
                price = price_overview.get("initial", 0) / 100.0
                discount = price_overview.get("discount_percent", 0)
            else:
                price = round(random.uniform(9.99, 59.99), 2) # Fallback
                discount = 0
                
            # Genres
            genres_data = app_data.get("genres", [])
            genres = [g.get("description") for g in genres_data]
            if not genres:
                genres = ["Action"]
                
            # Platforms
            plats = app_data.get("platforms", {})
            platforms = []
            if plats.get("windows"): platforms.append("Windows")
            if plats.get("mac"): platforms.append("Mac")
            if plats.get("linux"): platforms.append("Linux")
            if not platforms: platforms = ["PC"]
            
            # PC Requirements
            reqs = app_data.get("pc_requirements", {})
            req_str = clean_html(reqs.get("minimum", ""))
            
            game = {
                "_id": str(app_id), # Use Steam App ID as our document ID
                "title": title,
                "description": desc,
                "image_url": image_url,
                "developer": developer,
                "publisher": publisher,
                "release_date": release_date,
                "price": price,
                "discount_percentage": discount,
                "genres": genres,
                "platforms": platforms,
                "system_requirements": {
                    "os": "Windows 10",
                    "processor": "See Steam page for full requirements",
                    "memory": "8 GB RAM",
                    "graphics": "DirectX 11 compatible",
                    "raw_steam_reqs": req_str[:500] # store raw just in case
                }
            }
            
            games.append(game)
            print(f"[{len(games)}/{TARGET_GAMES}] Added: {title}")
            
            # Steam API rate limit friendly sleep
            time.sleep(1.5)
            
        except Exception as e:
            print(f"Error fetching app {app_id}: {e}")
            time.sleep(2)
            
    if not games:
        print("Failed to fetch any games from Steam API. Aborting.")
        return
        
    games_collection.insert_many(games)
    print(f"Successfully inserted {len(games)} real Steam games into MongoDB.")

    # Extract game IDs for relational mapping
    game_ids = [game["_id"] for game in games]

    # Connect to PostgreSQL
    pg_conn = get_pg_connection()
    pg_cursor = pg_conn.cursor()

    # Clear existing data in Postgres
    pg_cursor.execute("DELETE FROM purchases;")
    pg_cursor.execute("DELETE FROM ratings;")
    pg_cursor.execute("DELETE FROM users;")
    pg_conn.commit()

    # 2. Generate Users (PostgreSQL)
    print(f"Generating {NUM_USERS} users...")
    user_ids = []
    for _ in range(NUM_USERS):
        username = fake.user_name()
        email = fake.email()
        password = fake.password(length=12) # In a real app, this would be hashed
        
        pg_cursor.execute(
            "INSERT INTO users (username, email, hashed_password) VALUES (%s, %s, %s) RETURNING id;",
            (username, email, password)
        )
        user_id = pg_cursor.fetchone()[0]
        user_ids.append(user_id)
    
    pg_conn.commit()
    print("Users inserted into PostgreSQL.")

    # 3. Generate Ratings (PostgreSQL)
    print(f"Generating {NUM_RATINGS} ratings...")
    rating_pairs = set()
    ratings_count = 0

    while ratings_count < NUM_RATINGS:
        user_id = random.choice(user_ids)
        game_id = random.choice(game_ids)
        
        pair = (user_id, game_id)
        if pair not in rating_pairs:
            rating_pairs.add(pair)
            rating_val = random.randint(1, 5)
            
            try:
                pg_cursor.execute(
                    "INSERT INTO ratings (user_id, game_id, rating) VALUES (%s, %s, %s);",
                    (user_id, game_id, rating_val)
                )
                ratings_count += 1
            except Exception as e:
                pg_conn.rollback()
                print(f"Error inserting rating: {e}")
                continue
    
    pg_conn.commit()
    print("Ratings inserted into PostgreSQL.")

    pg_cursor.close()
    pg_conn.close()
    mongo_client.close()
    
    print("Data seeding completed successfully!")

if __name__ == "__main__":
    seed_data()
