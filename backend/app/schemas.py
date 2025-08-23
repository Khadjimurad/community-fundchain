from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ProjectStatus(str, Enum):
    """Project status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    FUNDING_READY = "funding_ready"
    VOTING = "voting"
    READY_TO_PAYOUT = "ready_to_payout"
    PAID = "paid"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class AllocationType(str, Enum):
    """Allocation type enumeration."""
    DIRECT = "direct"
    TOPUP = "topup"
    REASSIGN = "reassign"

class VoteChoice(str, Enum):
    """Vote choice enumeration."""
    NOT_PARTICIPATING = "not_participating"
    ABSTAIN = "abstain"
    AGAINST = "against"
    FOR = "for"

class CountingMethod(str, Enum):
    """Voting counting method enumeration."""
    WEIGHTED = "weighted"
    BORDA = "borda"

# Request models
class ProjectCreateRequest(BaseModel):
    """Request model for creating a project."""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., max_length=2000)
    target: float = Field(..., gt=0)
    soft_cap: float = Field(..., gt=0)
    hard_cap: Optional[float] = Field(None, gt=0)
    category: str = Field(..., min_length=1, max_length=50)
    deadline: Optional[datetime] = None
    soft_cap_enabled: bool = False
    
    @validator('soft_cap')
    def soft_cap_must_be_less_than_target(cls, v, values):
        if 'target' in values and v > values['target']:
            raise ValueError('soft_cap must be less than or equal to target')
        return v
    
    @validator('hard_cap')
    def hard_cap_must_be_greater_than_target(cls, v, values):
        if v is not None and 'target' in values and v < values['target']:
            raise ValueError('hard_cap must be greater than or equal to target')
        return v

class DonorStatsResponse(BaseModel):
    """Response model for donor statistics."""
    total_donated: float
    supported_projects: int
    average_share_percentile: int
    allocations: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class TreasuryStatsResponse(BaseModel):
    """Response model for treasury statistics."""
    total_balance: float
    total_donations: float
    total_allocated: float
    total_paid_out: float
    active_projects_count: int
    donors_count: int
    
    class Config:
        from_attributes = True

# Legacy models for backward compatibility
class Project(BaseModel):
    """Legacy project model."""
    id: str
    name: str
    description: str
    target: int
    softCap: int = 0
    status: str = "active"
    category: Optional[str] = None

class VoteSummary(BaseModel):
    """Legacy vote summary model."""
    projectId: str
    forWeight: int
    againstWeight: int
    abstained: int
    turnout: int
