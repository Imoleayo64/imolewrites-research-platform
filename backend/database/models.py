from sqlalchemy import Column, Integer, String, Text

from backend.database.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    field = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    target_journal = Column(String(255), nullable=False)
