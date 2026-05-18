import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models import Game

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://root:rootpassword@127.0.0.1:27018/")
DB_NAME = os.environ.get("MONGO_DB", "catalogdb")

async def init_db():
    client = AsyncIOMotorClient(MONGO_URI)
    database = client[DB_NAME]
    await init_beanie(database=database, document_models=[Game])
