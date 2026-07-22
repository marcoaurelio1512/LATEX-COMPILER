from __future__ import annotations

from contextlib import contextmanager
from typing import Generator, Iterator, Optional

from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.engine import Engine

from app.core.config import settings
from app.models import db as _models  # noqa: F401

engine: Engine = create_engine(
    settings.db_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


def configure_engine(url: Optional[str] = None) -> Engine:
    global engine
    engine = create_engine(
        url or settings.db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )
    return engine


def init_db() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
