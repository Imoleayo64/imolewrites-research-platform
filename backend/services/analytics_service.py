from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database.models import UsageEventModel, ProjectModel, ChapterModel, CitationModel

AI_FEATURE_TYPES = ["ai_chat", "humanize", "journal_recommend"]


def log_event(db: Session, user_id: int, event_type: str, value: int | None = None):
    ev = UsageEventModel(user_id=user_id, event_type=event_type, value=value)
    db.add(ev)
    db.commit()


def get_overview(db: Session, user_id: int, days: int = 30) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # --- Totals ---
    total_words = 0
    chapters = (
        db.query(ChapterModel)
        .join(ProjectModel, ChapterModel.project_id == ProjectModel.id)
        .filter(ProjectModel.user_id == user_id)
        .all()
    )
    for ch in chapters:
        if ch.content:
            total_words += len(ch.content.split())

    citations_count = db.query(CitationModel).filter(CitationModel.user_id == user_id).count()

    ai_interactions = (
        db.query(UsageEventModel)
        .filter(UsageEventModel.user_id == user_id, UsageEventModel.event_type.in_(AI_FEATURE_TYPES))
        .count()
    )
    papers_searched = (
        db.query(UsageEventModel)
        .filter(UsageEventModel.user_id == user_id, UsageEventModel.event_type == "paper_search")
        .count()
    )
    publications = (
        db.query(ProjectModel)
        .filter(ProjectModel.user_id == user_id, ProjectModel.status == "published")
        .count()
    )

    # --- AI usage by feature ---
    rows = (
        db.query(UsageEventModel.event_type, func.count(UsageEventModel.id))
        .filter(UsageEventModel.user_id == user_id, UsageEventModel.event_type.in_(AI_FEATURE_TYPES))
        .group_by(UsageEventModel.event_type)
        .all()
    )
    label_map = {"ai_chat": "AI Assistant", "humanize": "Humanizer", "journal_recommend": "Journal Match"}
    ai_usage_by_feature = [{"label": label_map.get(t, t), "count": c} for t, c in rows]

    # --- Activity over time (last `days` days), bucketed daily ---
    recent_events = (
        db.query(UsageEventModel)
        .filter(UsageEventModel.user_id == user_id, UsageEventModel.created_at >= since)
        .all()
    )
    day_buckets: dict[str, dict[str, int]] = {}
    for i in range(days):
        d = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        day_buckets[d] = {"writes": 0, "citations": 0}

    for ev in recent_events:
        d = ev.created_at.strftime("%Y-%m-%d") if ev.created_at else None
        if d not in day_buckets:
            continue
        if ev.event_type == "project_save":
            day_buckets[d]["writes"] += 1
        elif ev.event_type == "citation_added":
            day_buckets[d]["citations"] += 1

    activity_over_time = [
        {"date": d, "writes": v["writes"], "citations": v["citations"]}
        for d, v in sorted(day_buckets.items())
    ]

    # --- Activity by type (counts, not fabricated hours) ---
    type_counts = {"writing": 0, "ai_assistant": 0, "citations": 0, "paper_search": 0}
    all_events = db.query(UsageEventModel).filter(UsageEventModel.user_id == user_id).all()
    for ev in all_events:
        if ev.event_type == "project_save":
            type_counts["writing"] += 1
        elif ev.event_type in AI_FEATURE_TYPES:
            type_counts["ai_assistant"] += 1
        elif ev.event_type == "citation_added":
            type_counts["citations"] += 1
        elif ev.event_type == "paper_search":
            type_counts["paper_search"] += 1

    # --- Publication tracking (real project statuses) ---
    tracked_projects = (
        db.query(ProjectModel)
        .filter(ProjectModel.user_id == user_id, ProjectModel.status != "draft")
        .order_by(ProjectModel.updated_at.desc())
        .limit(10)
        .all()
    )
    publication_tracking = [
        {
            "title": p.title,
            "journal": p.target_journal,
            "status": p.status,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in tracked_projects
    ]

    return {
        "totals": {
            "total_words": total_words,
            "citations_count": citations_count,
            "ai_interactions": ai_interactions,
            "papers_searched": papers_searched,
            "publications": publications,
        },
        "ai_usage_by_feature": ai_usage_by_feature,
        "activity_over_time": activity_over_time,
        "activity_by_type": type_counts,
        "publication_tracking": publication_tracking,
    }
