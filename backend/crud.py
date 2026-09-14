from sqlalchemy import func
from sqlalchemy.orm import Session
from database import User, Workout, normalize_name
from schemas import UserCreate
from auth import get_password_hash
from datetime import datetime
from uuid import uuid4
import math
from typing import Optional, List


# ==================== User Operations ====================
def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user."""
    hashed_password = get_password_hash(user.password)
    first_name = " ".join(user.first_name.split())
    last_name = " ".join(user.last_name.split())
    db_user = User(
        # The temporary value satisfies the non-null unique column while the
        # database allocates the numeric key used to derive USR###.
        user_id=f"PENDING-{uuid4().hex}",
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        first_name=first_name,
        last_name=last_name,
        normalized_first_name=normalize_name(first_name),
        normalized_last_name=normalize_name(last_name),
        role="client",
    )
    db.add(db_user)
    db.flush()
    db_user.user_id = f"USR{db_user.id:03d}"
    db.flush()
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_full_name(db: Session, first_name: str, last_name: str) -> Optional[User]:
    """Find a user by a normalized, case-insensitive full name."""
    normalized_first_name = normalize_name(first_name)
    normalized_last_name = normalize_name(last_name)
    return (
        db.query(User)
        .filter(
            User.normalized_first_name == normalized_first_name,
            User.normalized_last_name == normalized_last_name,
        )
        .first()
    )


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_all_users(db: Session) -> List[User]:
    """Get all users."""
    return db.query(User).filter(User.role == "client").all()


def get_user_workouts(db: Session, user_id: int) -> List[Workout]:
    """Get activity records for a user."""
    return db.query(Workout).filter(Workout.user_id == user_id).all()


ACTIVITY_POINTS = {
    "running": ("distance", 100), "walking": ("distance", 50), "cycling": ("distance", 25),
    "swimming": ("duration", 15), "gym": ("duration", 5), "daily_steps": ("steps", 0.01),
}

def activity_points(activity_type: str, value: float) -> int:
    metric, rate = ACTIVITY_POINTS[activity_type]
    return int(value // 100) if metric == "steps" else (math.floor(value) * rate if metric == "duration" else math.floor(value * rate))

def create_activity(db: Session, user_id: int, activity_type: str, value: float, recorded_at: datetime) -> Workout:
    fields = {"distance": None, "duration": None, "steps": None}
    metric = ACTIVITY_POINTS[activity_type][0]
    fields[metric] = int(value) if metric == "steps" else value
    item = Workout(user_id=user_id, activity_type=activity_type, recorded_at=recorded_at, **fields)
    db.add(item); db.commit(); db.refresh(item)
    return item

def get_duplicate_activity(db: Session, user_id: int, activity_type: str, recorded_at: datetime) -> Optional[Workout]:
    """Find a matching activity before insert; the workout constraint covers races."""
    return (
        db.query(Workout)
        .filter(
            Workout.user_id == user_id,
            Workout.activity_type == activity_type,
            Workout.recorded_at == recorded_at,
        )
        .first()
    )

def competition_ranked_totals(totals):
    """Return totals in competition-ranking order: 1, 2, 2, 4."""
    ranked = []
    previous_points = None
    rank = 0
    for position, (user_id, points) in enumerate(sorted(totals.items(), key=lambda row: (-row[1], row[0])), 1):
        if points != previous_points:
            rank = position
            previous_points = points
        ranked.append((rank, user_id, points))
    return ranked

def get_activity_leaderboard(db: Session):
    totals = {}
    for item in db.query(Workout).join(User).filter(User.role == "client").all():
        if item.activity_type in ACTIVITY_POINTS:
            metric = ACTIVITY_POINTS[item.activity_type][0]
            totals[item.user_id] = totals.get(item.user_id, 0) + activity_points(item.activity_type, getattr(item, metric) or 0)
    rows = []
    for rank, user_id, points in competition_ranked_totals(totals):
        user = get_user_by_id(db, user_id)
        if user: rows.append({"rank": rank, "user_id": user_id, "username": user.username, "first_name": user.first_name, "last_name": user.last_name, "points": points})
    return rows

def get_rank_trend(db: Session, user_id: int):
    """Return the user's cumulative rank for every date with saved activity."""
    from datetime import timedelta
    activities = [
        item for item in db.query(Workout).join(User).filter(User.role == "client").all()
        if item.activity_type in ACTIVITY_POINTS
    ]
    if not activities:
        return []
    start = min(item.recorded_at.date() for item in activities)
    end = max(item.recorded_at.date() for item in activities)
    totals = {}
    trend = []
    for day_offset in range((end - start).days + 1):
        day = start + timedelta(days=day_offset)
        for item in activities:
            if item.recorded_at.date() == day:
                metric = ACTIVITY_POINTS[item.activity_type][0]
                totals[item.user_id] = totals.get(item.user_id, 0) + activity_points(item.activity_type, getattr(item, metric) or 0)
        if user_id in totals:
            rank = next(rank for rank, ranked_user_id, _ in competition_ranked_totals(totals) if ranked_user_id == user_id)
            trend.append({"date": day.isoformat(), "rank": rank})
    return trend


