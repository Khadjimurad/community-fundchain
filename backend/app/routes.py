from fastapi import APIRouter
from .schemas import Project, VoteSummary

router = APIRouter()

@router.get("/healthz")
def healthz():
    return {"status": "ok"}

# Demo/mock endpoints — заполните реальной логикой
@router.get("/projects")
def list_projects():
    return [
        {"id": "0x01", "name": "Колодец", "description": "Водоснабжение", "target": 1000, "softCap": 700, "status": "active", "category": "infra"},
        {"id": "0x02", "name": "Лекарства", "description": "Помощь семье", "target": 500, "softCap": 350, "status": "active", "category": "aid"}
    ]

@router.get("/projects/{id}/progress")
def project_progress(id: str):
    return {"projectId": id, "allocated": 0, "target": 0, "softCap": 0}

@router.get("/votes/priority/summary")
def votes_summary():
    return [
        {"projectId": "0x01", "forWeight": 10, "againstWeight": 3, "abstained": 1, "turnout": 5},
        {"projectId": "0x02", "forWeight": 2, "againstWeight": 6, "abstained": 0, "turnout": 4},
    ]

@router.get("/me/stats")
def me_stats():
    return {"supportedProjects": 2, "percentile": 65, "allocations": [{"projectId": "0x01", "share": 0.6}, {"projectId": "0x02", "share": 0.4}]}
