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


def standardize_name(value: str) -> str:
    """Store display names with collapsed whitespace and consistent casing."""
    return " ".join(value.split()).title()


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
    steps = Column(Integer)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")


# Create tables
Base.metadata.create_all(bind=engine)

# `create_all` does not alter existing SQLite tables. Migrate older local
# databases to a standardized-name users model.
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
        # Migrate an account created by the earlier local prototype. The old
        # field is deliberately not consulted for any future authorization.
        if "is_admin" in user_columns:
            connection.execute(
                text("UPDATE users SET role = 'admin' WHERE is_admin = 1")
            )
        # Rebuild legacy users tables so normalized helper columns disappear.
        # Names are standardized before inserting into the direct unique pair.
        if "normalized_first_name" in user_columns or "normalized_last_name" in user_columns:
            legacy_users = connection.execute(text(
                "SELECT id, user_id, username, email, hashed_password, first_name, "
                "last_name, role, created_at FROM users"
            )).mappings().all()
            connection.execute(text(
                "CREATE TABLE users_rebuilt ("
                "id INTEGER NOT NULL PRIMARY KEY, user_id VARCHAR NOT NULL UNIQUE, "
                "username VARCHAR UNIQUE, email VARCHAR UNIQUE, hashed_password VARCHAR, "
                "first_name VARCHAR, last_name VARCHAR, role VARCHAR NOT NULL DEFAULT 'client', "
                "created_at DATETIME, CONSTRAINT uq_users_full_name UNIQUE (first_name, last_name)"
                ")"
            ))
            for user in legacy_users:
                connection.execute(
                    text(
                        "INSERT INTO users_rebuilt "
                        "(id, user_id, username, email, hashed_password, first_name, last_name, role, created_at) "
                        "VALUES (:id, :user_id, :username, :email, :hashed_password, "
                        ":first_name, :last_name, :role, :created_at)"
                    ),
                    {
                        **user,
                        "first_name": standardize_name(user["first_name"] or ""),
                        "last_name": standardize_name(user["last_name"] or ""),
                    },
                )
            connection.execute(text("DROP TABLE users"))
            connection.execute(text("ALTER TABLE users_rebuilt RENAME TO users"))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_user_id ON users(user_id)"
        ))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_users_full_name ON users(first_name, last_name)"
        ))
        workout_columns = {
            column[1]
            for column in connection.exec_driver_sql("PRAGMA table_info(workouts)")
        }
        if "calories_burned" in workout_columns:
            connection.execute(text(
                "CREATE TABLE workouts_rebuilt ("
                "id INTEGER NOT NULL PRIMARY KEY, "
                "user_id INTEGER, activity_type VARCHAR, distance FLOAT, "
                "duration FLOAT, steps INTEGER, recorded_at DATETIME, "
                "created_at DATETIME, "
                "CONSTRAINT uq_workouts_user_activity_timestamp "
                "UNIQUE (user_id, activity_type, recorded_at), "
                "FOREIGN KEY(user_id) REFERENCES users (id)"
                ")"
            ))
            connection.execute(text(
                "INSERT INTO workouts_rebuilt "
                "(id, user_id, activity_type, distance, duration, steps, recorded_at, created_at) "
                "SELECT id, user_id, activity_type, distance, duration, steps, recorded_at, created_at "
                "FROM workouts"
            ))
            connection.execute(text("DROP TABLE workouts"))
            connection.execute(text("ALTER TABLE workouts_rebuilt RENAME TO workouts"))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_workouts_user_activity_timestamp "
            "ON workouts(user_id, activity_type, recorded_at)"
        ))
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_workouts_user_id ON workouts(user_id)"
        ))
        connection.execute(text("DROP TABLE IF EXISTS registered_names"))
        connection.execute(text("DROP TABLE IF EXISTS activity_submissions"))


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
            first_name=standardize_name(INITIAL_ADMIN_FIRST_NAME),
            last_name=standardize_name(INITIAL_ADMIN_LAST_NAME),
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
