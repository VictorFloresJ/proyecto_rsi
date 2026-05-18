from fastapi import FastAPI, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from database import get_db, engine
import models

# In a real app we'd use Alembic. Here we rely on the init.sql, but we can call create_all just in case
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Service", version="1.0.0")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "user-service"}

@app.get("/users")
def get_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.id).offset(skip).limit(limit).all()
    return [{"id": u.id, "username": u.username, "email": u.email} for u in users]

@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "username": user.username, "email": user.email, "preferences": user.preferences}

@app.put("/users/{user_id}/preferences")
def update_user_preferences(user_id: int, preferences: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update preferences
    user.preferences = preferences
    
    # Reset purchases and ratings if preferences are cleared (profile reset)
    if not preferences:
        db.query(models.Rating).filter(models.Rating.user_id == user_id).delete()
        db.query(models.Purchase).filter(models.Purchase.user_id == user_id).delete()
        
    db.commit()
    db.refresh(user)
    return {"status": "success", "preferences": user.preferences}

@app.get("/users/{user_id}/ratings")
def get_user_ratings(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ratings = db.query(models.Rating).filter(models.Rating.user_id == user_id).all()
    return [{"game_id": r.game_id, "rating": r.rating} for r in ratings]

from pydantic import BaseModel

class RatingInput(BaseModel):
    user_id: int
    game_id: str
    rating: float

@app.get("/ratings")
def get_all_ratings(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    ratings = db.query(models.Rating).offset(skip).limit(limit).all()
    return [{"user_id": r.user_id, "game_id": r.game_id, "rating": r.rating} for r in ratings]

@app.post("/ratings")
def submit_rating(rating_input: RatingInput, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == rating_input.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing_rating = db.query(models.Rating).filter(
        models.Rating.user_id == rating_input.user_id,
        models.Rating.game_id == rating_input.game_id
    ).first()
    
    if existing_rating:
        existing_rating.rating = rating_input.rating
    else:
        new_rating = models.Rating(
            user_id=rating_input.user_id,
            game_id=rating_input.game_id,
            rating=rating_input.rating
        )
        db.add(new_rating)
        
    db.commit()
    return {"status": "success", "message": "Rating saved"}

class PurchaseInput(BaseModel):
    game_id: str

@app.post("/users/{user_id}/purchases")
def submit_purchase(user_id: int, purchase_input: PurchaseInput, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    existing_purchase = db.query(models.Purchase).filter(
        models.Purchase.user_id == user_id,
        models.Purchase.game_id == purchase_input.game_id
    ).first()
    
    if not existing_purchase:
        new_purchase = models.Purchase(
            user_id=user_id,
            game_id=purchase_input.game_id
        )
        db.add(new_purchase)
        db.commit()
        
    return {"status": "success", "message": "Purchase saved"}

@app.get("/users/{user_id}/purchases")
def get_user_purchases(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    purchases = db.query(models.Purchase).filter(models.Purchase.user_id == user_id).all()
    return [p.game_id for p in purchases]

