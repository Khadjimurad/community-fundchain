from pydantic import BaseModel
from typing import List, Optional

class Project(BaseModel):
    id: str
    name: str
    description: str
    target: int
    softCap: int = 0
    status: str = "active"
    category: Optional[str] = None

class VoteSummary(BaseModel):
    projectId: str
    forWeight: int
    againstWeight: int
    abstained: int
    turnout: int
