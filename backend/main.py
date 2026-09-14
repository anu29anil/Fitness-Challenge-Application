from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from typing import List

from database import get_db, User, Workout
from schemas import (
    UserCreate, UserResponse, UserLogin, ActivityCreate, ActivityResponse,
)
from auth import (
    create_access_token, decode_token, verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES, Token, TokenData
)
import crud

app = FastAPI(title="Neogov Fitness Challenge API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> int:
    """Get current authenticated user from token."""
    token = credentials.credentials
    token_data = decode_token(token)
    if token_data is None or token_data.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = crud.get_user_by_id(db, token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user.id


def get_current_admin(
    user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
) -> User:
    """Allow aggregate data only to an account with the server-side admin role."""
    user = crud.get_user_by_id(db, user_id)
    if not user or user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required",
        )
    return user


def get_current_client(
    user_id: int = Depends(get_current_user), db: Session = Depends(get_db)
) -> int:
    """Keep client activity endpoints unavailable to administrator accounts."""
    user = crud.get_user_by_id(db, user_id)
    if not user or user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client account access is required",
        )
    return user.id


def serialize_activity(item: Workout) -> dict:
    metric = crud.ACTIVITY_POINTS[item.activity_type][0]
    value = getattr(item, metric) or 0
    return {
        "id": item.id,
        "user_id": item.user_id,
        "user_name": f"{item.user.first_name} {item.user.last_name}",
        "username": item.user.username,
        "activity_type": item.activity_type,
        "value": value,
        "points": crud.activity_points(item.activity_type, value),
        "recorded_at": item.recorded_at,
    }


# ==================== Auth Endpoints ====================
@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    db_user = crud.get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    db_email = crud.get_user_by_email(db, user.email)
    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    db_full_name = crud.get_user_by_full_name(db, user.first_name, user.last_name)
    if db_full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this first and last name is already registered"
        )
    
    # Create new user
    try:
        new_user = crud.create_user(db, user)
        return new_user
    except IntegrityError:
        db.rollback()
        # Covers a registration race after the application-level checks above.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with these details is already registered")


@app.post("/api/auth/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token."""
    db_user = crud.get_user_by_username(db, user.username)
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        # JWT requires the standard "sub" (subject) claim to be a string.
        # An integer subject causes token decoding to fail and makes the
        # frontend redirect back to the login page when it requests /users/me.
        data={"sub": str(db_user.id), "username": db_user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "username": db_user.username
    }


# ==================== User Endpoints ====================
@app.get("/api/users/me", response_model=UserResponse)
def get_current_user_info(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile."""
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/api/activities", response_model=ActivityResponse)
def log_activity(activity: ActivityCreate, user_id: int = Depends(get_current_client), db: Session = Depends(get_db)):
    if crud.get_duplicate_activity(db, user_id, activity.activity_type, activity.activity_date):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This activity has already been recorded for that date")
    try:
        item = crud.create_activity(db, user_id, activity.activity_type, activity.value, activity.activity_date)
    except IntegrityError:
        db.rollback()
        # Covers identical concurrent submissions which pass the pre-insert check.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This activity has already been recorded for that date")
    return {"id": item.id, "activity_type": item.activity_type, "value": activity.value, "points": crud.activity_points(activity.activity_type, activity.value), "recorded_at": item.recorded_at}


@app.get("/api/activities", response_model=List[ActivityResponse])
def get_activities(user_id: int = Depends(get_current_client), db: Session = Depends(get_db)):
    rows = []
    for item in crud.get_user_workouts(db, user_id):
        if item.activity_type in crud.ACTIVITY_POINTS:
            metric = crud.ACTIVITY_POINTS[item.activity_type][0]
            value = getattr(item, metric) or 0
            rows.append({"id": item.id, "activity_type": item.activity_type, "value": value, "points": crud.activity_points(item.activity_type, value), "recorded_at": item.recorded_at})
    return rows


@app.get("/api/leaderboard")
def get_global_leaderboard(db: Session = Depends(get_db)):
    return crud.get_activity_leaderboard(db)


@app.get("/api/leaderboard/trend")
def get_leaderboard_trend(user_id: int = Depends(get_current_client), db: Session = Depends(get_db)):
    return crud.get_rank_trend(db, user_id)


@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID."""
    user = crud.get_user_by_id(db, user_id)
    if not user or user.role != "client":
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ==================== Administrator Endpoints ====================
@app.get("/api/admin/overview")
def get_admin_overview(
    _: User = Depends(get_current_admin), db: Session = Depends(get_db)
):
    """A protected overview of all registrations and client activity."""
    users = db.query(User).filter(User.role == "client").all()
    activities = (
        db.query(Workout)
        .join(User)
        .filter(User.role == "client", Workout.activity_type.in_(crud.ACTIVITY_POINTS.keys()))
        .order_by(Workout.recorded_at.desc())
        .all()
    )
    today = datetime.utcnow().date()
    start = today - timedelta(days=6)
    active_user_ids = {
        item.user_id for item in activities if item.recorded_at.date() >= start
    }
    growth = []
    for offset in range(7):
        day = start + timedelta(days=offset)
        growth.append({
            "date": day.isoformat(),
            "users": sum(1 for user in users if user.created_at.date() <= day),
        })
    return {
        "total_users": len(users),
        "total_activities": len(activities),
        "active_users": len(active_user_ids),
        "growth": growth,
        "recent_activities": [serialize_activity(item) for item in activities[:5]],
    }


@app.get("/api/admin/users")
def get_admin_users(_: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    results = []
    for user in db.query(User).filter(User.role == "client").order_by(User.created_at.desc()).all():
        activities = [
            item for item in user.workouts
            if item.activity_type in crud.ACTIVITY_POINTS
        ]
        results.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
            "role": user.role,
            "activity_count": len(activities),
            "points": sum(
                crud.activity_points(
                    item.activity_type,
                    getattr(item, crud.ACTIVITY_POINTS[item.activity_type][0]) or 0,
                )
                for item in activities
            ),
        })
    return results


@app.get("/api/admin/activities")
def get_admin_activities(
    _: User = Depends(get_current_admin), db: Session = Depends(get_db)
):
    rows = (
        db.query(Workout)
        .join(User)
        .filter(User.role == "client", Workout.activity_type.in_(crud.ACTIVITY_POINTS.keys()))
        .order_by(Workout.recorded_at.desc())
        .all()
    )
    return [serialize_activity(item) for item in rows]


# ==================== Health Check ====================
@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Fitness Challenge API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
