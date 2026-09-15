from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database.database import Base
import json


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=True)
    field = Column(String(255), nullable=True)
    role = Column(String(50), nullable=True, default="Researcher")
    bio = Column(Text, nullable=True)
    avatar_key = Column(String(500), nullable=True)  # storage key for uploaded profile photo
    is_admin = Column(Integer, nullable=False, default=0)  # 0/1 flag (SQLite-friendly boolean)

    mendeley_access_token = Column(String(2000), nullable=True)
    mendeley_refresh_token = Column(String(2000), nullable=True)
    mendeley_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # A user can have many projects
    projects = relationship("ProjectModel", back_populates="owner")


class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Links project to a specific user
    
    title = Column(String(255), nullable=False, default="Untitled Project")
    field = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    target_journal = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="draft")  # draft, submitted, in_review, revisions, published
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("UserModel", back_populates="projects")
    chapters = relationship("ChapterModel", back_populates="project", cascade="all, delete-orphan")


class ChapterModel(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False) # Links chapter to a project
    
    title = Column(String(255), nullable=False, default="Untitled Document")
    content = Column(Text, nullable=True) # This stores your actual editor text/HTML!
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship back to the project
    project = relationship("ProjectModel", back_populates="chapters")


class CitationModel(Base):
    __tablename__ = "citations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    doi = Column(String(255), nullable=True)
    title = Column(String(500), nullable=False)
    authors_json = Column(Text, nullable=True)  # JSON list of {given, family}
    year = Column(Integer, nullable=True)
    venue = Column(String(500), nullable=True)
    volume = Column(String(50), nullable=True)
    issue = Column(String(50), nullable=True)
    pages = Column(String(50), nullable=True)
    url = Column(String(1000), nullable=True)
    source_type = Column(String(100), nullable=True, default="journal-article")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def as_dict(self):
        return {
            "id": self.id,
            "doi": self.doi,
            "title": self.title,
            "authors": json.loads(self.authors_json) if self.authors_json else [],
            "year": self.year,
            "venue": self.venue,
            "volume": self.volume,
            "issue": self.issue,
            "pages": self.pages,
            "url": self.url,
            "type": self.source_type,
        }


class UsageEventModel(Base):
    """Lightweight activity log used to power real (not fabricated) analytics."""
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # ai_chat, humanize, journal_recommend, paper_search, project_save, citation_added
    value = Column(Integer, nullable=True)  # optional numeric payload, e.g. word count at save time
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProjectMemberModel(Base):
    """Real project membership for collaboration — who can view/edit a project besides its owner."""
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False, default="editor")  # editor, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PdfDocumentModel(Base):
    __tablename__ = "pdf_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    storage_key = Column(String(500), nullable=False)
    page_count = Column(Integer, nullable=True)
    extracted_text = Column(Text, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PdfAnnotationModel(Base):
    __tablename__ = "pdf_annotations"

    id = Column(Integer, primary_key=True, index=True)
    pdf_id = Column(Integer, ForeignKey("pdf_documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    highlighted_text = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    color = Column(String(20), nullable=True, default="#fde047")
    position_json = Column(Text, nullable=True)  # JSON array of {xPct,yPct,widthPct,heightPct} rects, relative to the page
    created_at = Column(DateTime(timezone=True), server_default=func.now())