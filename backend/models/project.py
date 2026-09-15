from pydantic import BaseModel
from typing import Optional

class ProjectCreate(BaseModel):
    # We add a default value here so the button can just send a blank request!
    title: str = "Untitled Project"
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    user_id: int
    status: Optional[str] = "draft"
    target_journal: Optional[str] = None

    class Config:
        from_attributes = True