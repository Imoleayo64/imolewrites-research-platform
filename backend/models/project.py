from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    field: str
    description: str
    target_journal: str


class Project(ProjectCreate):
    id: str
