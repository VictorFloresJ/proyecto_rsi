from pydantic import BaseModel, Field
from beanie import Document
from typing import List, Optional

class SystemRequirements(BaseModel):
    os: Optional[str] = None
    processor: Optional[str] = None
    memory: Optional[str] = None
    graphics: Optional[str] = None

class Game(Document):
    id: str = Field(alias="_id") # Use the string UUID we generated in the seeding script
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    developer: Optional[str] = None
    publisher: Optional[str] = None
    release_date: Optional[str] = None
    price: float
    discount_percentage: int = 0
    genres: List[str] = []
    platforms: List[str] = []
    system_requirements: Optional[SystemRequirements] = None

    class Settings:
        name = "games"
