import os
from uuid import uuid4

from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.pool import StaticPool
from datetime import datetime

# Load configuration from backend/.env so the server behaves the same no
# matter which directory it is started from.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# A file-backed SQLite database keeps users and activities after a backend
# restart. The previous in-memory database erased accounts on every restart,
# making valid credentials appear to fail at login.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fitness.db")
# Initial administrator provisioning is controlled only by deployment
# environment variables. Public registration never reads these settings.
INITIAL_ADMIN_USERNAME = os.getenv("INITIAL_ADMIN_USERNAME", "").strip()
INITIAL_ADMIN_PASSWORD = os.getenv("INITIAL_ADMIN_PASSWORD", "")
INITIAL_ADMIN_EMAIL = os.getenv("INITIAL_ADMIN_EMAIL", "admin@example.com").strip()
INITIAL_ADMIN_FIRST_NAME = os.getenv("INITIAL_ADMIN_FIRST_NAME", "Admin").strip()
INITIAL_ADMIN_LAST_NAME = os.getenv("INITIAL_ADMIN_LAST_NAME", "User").strip()

engine_options = {}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}
    if DATABASE_URL == "sqlite:///:memory:":
        engine_options["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("first_name", "last_name", name="uq_users_full_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    # Stable public account identifier, e.g. USR001. The unique constraint is
    # enforced by both the model and the SQLite unique index migration below.
    user_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    # Roles are assigned by backend provisioning and never accepted from the
    # public registration payload.
    role = Column(String, nullable=False, default="client")
    created_at = Column(DateTime, default=datetime.utcnow)

    workouts = relationship("Workout", back_populates="user")

    @property
    def userId(self) -> str:
        """Public API-compatible name for this account's unique primary key."""
        return self.user_id


class RegisteredName(Base):
    """Normalized names claimed by registrations; unique even on legacy databases."""
    __tablename__ = "registered_names"

    name_key = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)


class Workout(Base):
    __tablename__ = "workouts"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_type", "recorded_at", name="uq_workouts_user_activity_timestamp"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    activity_type = Column(String)  # e.g., "running", "cycling", "walking"
    distance = Column(Float)  # in km
    duration = Column(Float)  # in minutes
    calories_burned = Column(Float)
    steps = Column(Integer)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")


class ActivitySubmission(Base):
    """Unique activity keys used to reject concurrent duplicate submissions."""
    __tablename__ = "activity_submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "activity_type", "recorded_at", name="uq_activity_submission"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String, nullable=False)
    recorded_at = Column(DateTime, nullable=False)


# Create tables
Base.metadata.create_all(bind=engine)

# `create_all` does not add constraints to databases created by older versions.
# The activity index makes the race-sensitive rule effective for that database.
# Normalized registration names live in `registered_names`, which avoids deleting
# legacy duplicate accounts while enforcing uniqueness for every new request.
if DATABASE_URL.startswith("sqlite"):
    with engine.begin() as connection:
        user_columns = {
            column[1]
            for column in connection.exec_driver_sql("PRAGMA table_info(users)")
        }
        if "role" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'client'")
            )
        if "user_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN user_id TEXT"))
        connection.execute(text(
            "UPDATE users SET user_id = printf('USR%03d', id) "
            "WHERE user_id IS NULL OR trim(user_id) = ''"
        ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_user_id ON users(user_id)"
        ))
        # Migrate an account created by the earlier local prototype. The old
        # field is deliberately not consulted for any future authorization.
        if "is_admin" in user_columns:
            connection.execute(
                text("UPDATE users SET role = 'admin' WHERE is_admin = 1")
            )
        connection.execute(text(
            "INSERT OR IGNORE INTO registered_names (name_key, user_id) "
            "SELECT lower(trim(first_name)) || '|' || lower(trim(last_name)), min(id) "
            "FROM users GROUP BY lower(trim(first_name)), lower(trim(last_name))"
        ))
        connection.execute(text(
            "INSERT OR IGNORE INTO activity_submissions (user_id, activity_type, recorded_at) "
            "SELECT user_id, activity_type, recorded_at FROM workouts "
            "WHERE activity_type IS NOT NULL GROUP BY user_id, activity_type, recorded_at"
        ))


def provision_initial_admin() -> None:
    """Create the first admin from deployment configuration when needed.

    Passwords are immediately hashed and the plain deployment value is never
    stored in SQLite. Existing accounts are never promoted by their username;
    this prevents public sign-up from granting administrator access.
    """
    session = SessionLocal()
    try:
        if session.query(User).filter(User.role == "admin").first():
            return
        if not INITIAL_ADMIN_USERNAME or not INITIAL_ADMIN_PASSWORD:
            raise RuntimeError(
                "No administrator exists. Set INITIAL_ADMIN_USERNAME and "
                "INITIAL_ADMIN_PASSWORD in backend/.env before starting the API."
            )
        from auth import get_password_hash

        existing = session.query(User).filter(User.username == INITIAL_ADMIN_USERNAME).first()
        if existing:
            raise RuntimeError(
                "The configured initial administrator username already belongs "
                "to a client account. Choose a new INITIAL_ADMIN_USERNAME."
            )
        admin = User(
            # A temporary unique value allows SQLite to allocate the numeric
            # key first; it is replaced by USR### before commit.
            user_id=f"PENDING-{uuid4().hex}",
            username=INITIAL_ADMIN_USERNAME,
            email=INITIAL_ADMIN_EMAIL,
            first_name=INITIAL_ADMIN_FIRST_NAME,
            last_name=INITIAL_ADMIN_LAST_NAME,
            hashed_password=get_password_hash(INITIAL_ADMIN_PASSWORD),
            role="admin",
        )
        session.add(admin)
        session.flush()
        admin.user_id = f"USR{admin.id:03d}"
        session.commit()
    finally:
        session.close()


provision_initial_admin()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
