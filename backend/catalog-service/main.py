from fastapi import FastAPI, HTTPException, Query
from contextlib import asynccontextmanager
from typing import List, Optional
from database import init_db
from models import Game

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Catalog Service", version="1.0.0", lifespan=lifespan)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "catalog-service"}

@app.get("/games", response_model=List[Game])
async def get_games(
    skip: int = 0, 
    limit: int = Query(default=100, le=10000),
    genre: Optional[str] = None,
    platform: Optional[str] = None
):
    query = {}
    if genre:
        query["genres"] = genre
    if platform:
        query["platforms"] = platform
        
    games = await Game.find(query).skip(skip).limit(limit).to_list()
    return games

@app.get("/games/{game_id}", response_model=Game)
async def get_game(game_id: str):
    game = await Game.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game
