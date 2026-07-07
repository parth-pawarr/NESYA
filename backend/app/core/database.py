"""
NESYA — Async SQLAlchemy database engine, session factory, and declarative Base.
Uses asyncpg driver for PostgreSQL with production-ready connection pooling.
"""
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

from app.core.config import settings

# ── Alembic naming convention (required for auto-generated migrations) ─────────
NAMING_CONVENTION: dict = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    metadata = metadata


# ── Async engine with PostgreSQL connection pooling ───────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,      # Discard stale connections before use
    echo=settings.DB_ECHO,
    connect_args={"server_settings": {"jit": "off"}},  # Disable JIT for compatibility
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionFactory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,   # Avoid lazy-load after commit
    autoflush=False,
    autocommit=False,
)


# ── Dependency (FastAPI) ──────────────────────────────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[return]
    """Yields an async DB session; commits on success, rolls back on error."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Gracefully close all pooled connections (call on shutdown)."""
    await engine.dispose()
