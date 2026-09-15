from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.models import UserModel, ProjectModel, CitationModel, UsageEventModel
from backend.services.gemini_service import gemini_service


def get_admin_overview(db: Session) -> dict:
    total_users = db.query(UserModel).count()
    total_projects = db.query(ProjectModel).count()
    total_citations = db.query(CitationModel).count()
    total_ai_events = (
        db.query(UsageEventModel)
        .filter(UsageEventModel.event_type.in_(["ai_chat", "humanize", "journal_recommend"]))
        .count()
    )

    status_rows = (
        db.query(ProjectModel.status, func.count(ProjectModel.id))
        .group_by(ProjectModel.status)
        .all()
    )
    projects_by_status = {status or "draft": count for status, count in status_rows}

    recent_users = (
        db.query(UserModel)
        .order_by(UserModel.id.desc())
        .limit(10)
        .all()
    )
    recent_users_list = [
        {
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "is_admin": bool(u.is_admin),
        }
        for u in recent_users
    ]

    return {
        "totals": {
            "total_users": total_users,
            "total_projects": total_projects,
            "total_citations": total_citations,
            "total_ai_interactions": total_ai_events,
        },
        "projects_by_status": projects_by_status,
        "recent_users": recent_users_list,
        "system": {
            "ai_service_configured": gemini_service.is_configured(),
        },
    }
