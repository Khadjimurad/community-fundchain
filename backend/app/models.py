from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import json

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True)  # bytes32 as hex string
    name = Column(String, nullable=False)
    description = Column(Text)
    target = Column(Float, nullable=False)  # in ETH
    soft_cap = Column(Float, nullable=False)
    hard_cap = Column(Float, default=0)
    created_at = Column(DateTime, default=func.now())
    deadline = Column(DateTime, nullable=True)
    status = Column(String, default="active")  # draft, active, funding_ready, voting, ready_to_payout, paid, cancelled, archived
    category = Column(String, nullable=False)
    priority = Column(Integer, default=0)
    soft_cap_enabled = Column(Boolean, default=False)
    total_allocated = Column(Float, default=0)
    total_paid_out = Column(Float, default=0)
    
    # Block tracking
    created_block = Column(Integer)
    updated_block = Column(Integer)
    
    # Relationships
    allocations = relationship("Allocation", back_populates="project")
    payouts = relationship("Payout", back_populates="project")
    vote_results = relationship("VoteResult", back_populates="project")
    
    __table_args__ = (
        Index('idx_project_status', 'status'),
        Index('idx_project_category', 'category'),
        Index('idx_project_created_at', 'created_at'),
    )

class Member(Base):
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True)
    address = Column(String, unique=True, nullable=False)
    total_donated = Column(Float, default=0)
    weight = Column(Integer, default=0)
    member_since = Column(DateTime, default=func.now())
    has_token = Column(Boolean, default=False)
    
    # Relationships
    donations = relationship("Donation", back_populates="donor")
    allocations = relationship("Allocation", back_populates="donor")
    votes = relationship("Vote", back_populates="voter")
    
    __table_args__ = (
        Index('idx_member_address', 'address'),
        Index('idx_member_weight', 'weight'),
    )

class Donation(Base):
    __tablename__ = "donations"
    
    id = Column(Integer, primary_key=True)
    receipt_id = Column(String, unique=True, nullable=False)
    donor_address = Column(String, ForeignKey('members.address'), nullable=False)
    amount = Column(Float, nullable=False)  # in ETH
    timestamp = Column(DateTime, default=func.now())
    tx_hash = Column(String, nullable=False)
    block_number = Column(Integer, nullable=False)
    
    # Relationships
    donor = relationship("Member", back_populates="donations")
    allocations = relationship("Allocation", back_populates="donation")
    
    __table_args__ = (
        Index('idx_donation_donor', 'donor_address'),
        Index('idx_donation_timestamp', 'timestamp'),
        Index('idx_donation_block', 'block_number'),
    )

class Allocation(Base):
    __tablename__ = "allocations"
    
    id = Column(Integer, primary_key=True)
    project_id = Column(String, ForeignKey('projects.id'), nullable=False)
    donor_address = Column(String, ForeignKey('members.address'), nullable=False)
    donation_id = Column(Integer, ForeignKey('donations.id'), nullable=True)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    allocation_type = Column(String, default="direct")  # direct, topup, reassign
    tx_hash = Column(String, nullable=False)
    block_number = Column(Integer, nullable=False)
    
    # For reassignments
    from_project_id = Column(String, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="allocations")
    donor = relationship("Member", back_populates="allocations")
    donation = relationship("Donation", back_populates="allocations")
    
    __table_args__ = (
        Index('idx_allocation_project', 'project_id'),
        Index('idx_allocation_donor', 'donor_address'),
        Index('idx_allocation_timestamp', 'timestamp'),
    )

class VotingRound(Base):
    __tablename__ = "voting_rounds"
    
    id = Column(Integer, primary_key=True)
    round_id = Column(Integer, unique=True, nullable=False)
    start_commit = Column(DateTime, nullable=False)
    end_commit = Column(DateTime, nullable=False)
    end_reveal = Column(DateTime, nullable=False)
    finalized = Column(Boolean, default=False)
    counting_method = Column(String, default="weighted")  # weighted, borda
    snapshot_block = Column(Integer, nullable=False)
    total_participants = Column(Integer, default=0)
    total_revealed = Column(Integer, default=0)
    total_active_members = Column(Integer, default=0)
    cancellation_threshold = Column(Integer, default=66)
    auto_cancellation_enabled = Column(Boolean, default=False)
    
    # Relationships
    votes = relationship("Vote", back_populates="round")
    results = relationship("VoteResult", back_populates="round")
    
    __table_args__ = (
        Index('idx_voting_round_id', 'round_id'),
        Index('idx_voting_start', 'start_commit'),
    )

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True)
    round_id = Column(Integer, ForeignKey('voting_rounds.round_id'), nullable=False)
    voter_address = Column(String, ForeignKey('members.address'), nullable=False)
    project_id = Column(String, ForeignKey('projects.id'), nullable=False)
    choice = Column(String, nullable=False)  # not_participating, abstain, against, for
    weight = Column(Integer, default=1)
    committed_at = Column(DateTime, nullable=True)
    revealed_at = Column(DateTime, nullable=True)
    tx_hash = Column(String, nullable=False)
    block_number = Column(Integer, nullable=False)
    
    # Relationships
    round = relationship("VotingRound", back_populates="votes")
    voter = relationship("Member", back_populates="votes")
    
    __table_args__ = (
        Index('idx_vote_round', 'round_id'),
        Index('idx_vote_project', 'project_id'),
        Index('idx_vote_voter', 'voter_address'),
    )

class VoteResult(Base):
    __tablename__ = "vote_results"
    
    id = Column(Integer, primary_key=True)
    round_id = Column(Integer, ForeignKey('voting_rounds.round_id'), nullable=False)
    project_id = Column(String, ForeignKey('projects.id'), nullable=False)
    for_weight = Column(Integer, default=0)
    against_weight = Column(Integer, default=0)
    abstained_count = Column(Integer, default=0)
    not_participating_count = Column(Integer, default=0)
    borda_points = Column(Integer, default=0)
    final_priority = Column(Integer, default=0)
    
    # Relationships
    round = relationship("VotingRound", back_populates="results")
    project = relationship("Project", back_populates="vote_results")
    
    __table_args__ = (
        Index('idx_result_round', 'round_id'),
        Index('idx_result_project', 'project_id'),
        Index('idx_result_priority', 'final_priority'),
    )

class Payout(Base):
    __tablename__ = "payouts"
    
    id = Column(Integer, primary_key=True)
    payout_id = Column(String, unique=True, nullable=False)
    project_id = Column(String, ForeignKey('projects.id'), nullable=False)
    amount = Column(Float, nullable=False)
    recipient_address = Column(String, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    tx_hash = Column(String, nullable=False)
    block_number = Column(Integer, nullable=False)
    multisig_tx_id = Column(Integer, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="payouts")
    
    __table_args__ = (
        Index('idx_payout_project', 'project_id'),
        Index('idx_payout_timestamp', 'timestamp'),
    )

class BlockchainEvent(Base):
    __tablename__ = "blockchain_events"
    
    id = Column(Integer, primary_key=True)
    contract_address = Column(String, nullable=False)
    event_name = Column(String, nullable=False)
    event_data = Column(JSON, nullable=False)
    tx_hash = Column(String, nullable=False)
    block_number = Column(Integer, nullable=False)
    log_index = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    processed = Column(Boolean, default=False)
    
    __table_args__ = (
        Index('idx_event_contract', 'contract_address'),
        Index('idx_event_name', 'event_name'),
        Index('idx_event_block', 'block_number'),
        Index('idx_event_processed', 'processed'),
    )

class IndexerState(Base):
    __tablename__ = "indexer_state"
    
    id = Column(Integer, primary_key=True)
    contract_address = Column(String, unique=True, nullable=False)
    last_processed_block = Column(Integer, default=0)
    last_updated = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('idx_indexer_contract', 'contract_address'),
    )

class AggregateStats(Base):
    __tablename__ = "aggregate_stats"
    
    id = Column(Integer, primary_key=True)
    stat_type = Column(String, nullable=False)  # treasury_balance, total_donations, active_projects, etc.
    stat_key = Column(String, nullable=False)   # Additional key for categorization
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    calculated_at_block = Column(Integer, nullable=False)
    
    __table_args__ = (
        Index('idx_stats_type', 'stat_type'),
        Index('idx_stats_key', 'stat_key'),
        Index('idx_stats_timestamp', 'timestamp'),
    )

# Pydantic models for API responses
class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    target: float
    soft_cap: float
    hard_cap: float
    created_at: datetime
    deadline: Optional[datetime]
    status: str
    category: str
    priority: int
    soft_cap_enabled: bool
    total_allocated: float
    total_paid_out: float
    
    class Config:
        from_attributes = True

class DonationResponse(BaseModel):
    receipt_id: str
    donor_address: str
    amount: float
    timestamp: datetime
    tx_hash: str
    
    class Config:
        from_attributes = True

class VoteResponse(BaseModel):
    project_id: str
    for_weight: int
    against_weight: int
    abstained_count: int
    not_participating_count: int
    turnout_percentage: float
    
    class Config:
        from_attributes = True

class DonorStatsResponse(BaseModel):
    total_donated: float
    supported_projects: int
    average_share_percentile: int
    allocations: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

class TreasuryStatsResponse(BaseModel):
    total_balance: float
    total_donations: float
    total_allocated: float
    total_paid_out: float
    active_projects_count: int
    donors_count: int
    
    class Config:
        from_attributes = True