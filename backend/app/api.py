from fastapi import Depends, HTTPException, Query, Path
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import csv
import json
import io

from .database import get_db
from .models import (
    Project, Member, Donation, Allocation, VotingRound, Vote, VoteResult,
    Payout, AggregateStats, ProjectResponse, DonationResponse, VoteResponse,
    DonorStatsResponse, TreasuryStatsResponse
)
from .config import get_settings
from .privacy import PrivacyFilter

settings = get_settings()
privacy_filter = PrivacyFilter(k_threshold=settings.k_anonymity_threshold)

# Projects endpoints
async def list_projects(
    status: Optional[str] = Query(None, description="Filter by project status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, le=1000, description="Number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip"),
    db: AsyncSession = Depends(get_db)
) -> List[ProjectResponse]:
    """Get list of projects with optional filtering."""
    
    query = select(Project)
    
    # Apply filters
    if status:
        query = query.where(Project.status == status)
    if category:
        query = query.where(Project.category == category)
    
    # Order by priority and creation date
    query = query.order_by(desc(Project.priority), desc(Project.created_at))
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return [ProjectResponse.from_orm(project) for project in projects]

async def get_project(
    project_id: str = Path(..., description="Project ID"),
    db: AsyncSession = Depends(get_db)
) -> ProjectResponse:
    """Get a specific project by ID."""
    
    query = select(Project).where(Project.id == project_id)
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return ProjectResponse.from_orm(project)

async def get_project_progress(
    project_id: str = Path(..., description="Project ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get project funding progress and statistics."""
    
    # Get project
    project_query = select(Project).where(Project.id == project_id)
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get allocation statistics (sums are advisory; authoritative amount is Project.total_allocated)
    allocation_query = select(
        func.count(Allocation.id).label('allocation_count'),
        func.sum(Allocation.amount).label('total_allocated'),
        func.count(func.distinct(Allocation.donor_address)).label('unique_donors')
    ).where(Allocation.project_id == project_id)
    
    allocation_result = await db.execute(allocation_query)
    allocation_stats = allocation_result.first()
    
    # Get payout statistics
    payout_query = select(
        func.sum(Payout.amount).label('total_paid_out'),
        func.count(Payout.id).label('payout_count')
    ).where(Payout.project_id == project_id)
    
    payout_result = await db.execute(payout_query)
    payout_stats = payout_result.first()
    
    # Calculate progress metrics
    # Prefer Project.total_allocated (authoritative, e.g., after admin distribution),
    # fall back to sum of Allocation amounts if missing
    total_allocated = float(project.total_allocated or (allocation_stats.total_allocated or 0))
    total_paid_out = float(payout_stats.total_paid_out or 0)
    target = project.target
    soft_cap = project.soft_cap
    
    progress_to_target = (total_allocated / target * 100) if target > 0 else 0
    progress_to_soft_cap = (total_allocated / soft_cap * 100) if soft_cap > 0 else 0
    
    lacking_to_target = max(0, target - total_allocated)
    lacking_to_soft_cap = max(0, soft_cap - total_allocated)
    
    return {
        "project_id": project_id,
        "project_name": project.name,
        "target": target,
        "soft_cap": soft_cap,
        "hard_cap": project.hard_cap,
        "total_allocated": total_allocated,
        "total_paid_out": total_paid_out,
        "progress_to_target_percent": round(progress_to_target, 2),
        "progress_to_soft_cap_percent": round(progress_to_soft_cap, 2),
        "lacking_to_target": lacking_to_target,
        "lacking_to_soft_cap": lacking_to_soft_cap,
        "unique_donors": allocation_stats.unique_donors or 0,
        "allocation_count": allocation_stats.allocation_count or 0,
        "payout_count": payout_stats.payout_count or 0,
        "is_target_reached": total_allocated >= target,
        "is_soft_cap_reached": total_allocated >= soft_cap,
        "status": project.status,
        "eta_estimate": _calculate_project_eta(project, total_allocated)
    }

async def get_projects_by_category(
    category: str = Path(..., description="Project category"),
    include_inactive: bool = Query(False, description="Include inactive projects"),
    db: AsyncSession = Depends(get_db)
) -> List[ProjectResponse]:
    """Get all projects in a specific category."""
    
    query = select(Project).where(Project.category == category)
    
    if not include_inactive:
        active_statuses = ["active", "funding_ready", "voting", "ready_to_payout"]
        query = query.where(Project.status.in_(active_statuses))
    
    query = query.order_by(desc(Project.priority), desc(Project.created_at))
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return [ProjectResponse.from_orm(project) for project in projects]

# Donations endpoints
async def list_donations(
    donor_address: Optional[str] = Query(None, description="Filter by donor address"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[DonationResponse]:
    """Get list of donations with optional filtering."""
    
    query = select(Donation).options(selectinload(Donation.donor))
    
    # Apply filters
    if donor_address:
        query = query.where(Donation.donor_address == donor_address)
    if project_id:
        # Filter by allocations to specific project
        allocation_subquery = select(Allocation.donation_id).where(
            Allocation.project_id == project_id
        )
        query = query.where(Donation.id.in_(allocation_subquery))
    
    # Order by timestamp
    query = query.order_by(desc(Donation.timestamp))
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    donations = result.scalars().all()
    
    # Apply privacy filtering for public queries
    if not donor_address:  # Public query
        donations = privacy_filter.filter_donations(donations)
    
    return [DonationResponse.from_orm(donation) for donation in donations]

async def get_donation(
    receipt_id: str = Path(..., description="Donation receipt ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get donation details with allocations."""
    
    # Get donation
    donation_query = select(Donation).where(Donation.receipt_id == receipt_id)
    donation_result = await db.execute(donation_query)
    donation = donation_result.scalar_one_or_none()
    
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    # Get allocations for this donation
    allocation_query = select(Allocation).options(
        selectinload(Allocation.project)
    ).where(Allocation.donation_id == donation.id)
    
    allocation_result = await db.execute(allocation_query)
    allocations = allocation_result.scalars().all()
    
    return {
        "donation": DonationResponse.from_orm(donation),
        "allocations": [
            {
                "project_id": alloc.project_id,
                "project_name": alloc.project.name if alloc.project else "Unknown",
                "amount": alloc.amount,
                "allocation_type": alloc.allocation_type,
                "timestamp": alloc.timestamp
            }
            for alloc in allocations
        ]
    }

# Allocations endpoints
async def list_allocations(
    project_id: Optional[str] = Query(None, description="Filter by project"),
    donor_address: Optional[str] = Query(None, description="Filter by donor"),
    allocation_type: Optional[str] = Query(None, description="Filter by allocation type"),
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get list of allocations with filtering."""
    
    query = select(Allocation).options(
        selectinload(Allocation.project),
        selectinload(Allocation.donor)
    )
    
    # Apply filters
    if project_id:
        query = query.where(Allocation.project_id == project_id)
    if donor_address:
        query = query.where(Allocation.donor_address == donor_address)
    if allocation_type:
        query = query.where(Allocation.allocation_type == allocation_type)
    
    # Order by timestamp
    query = query.order_by(desc(Allocation.timestamp))
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    allocations = result.scalars().all()
    
    # Apply privacy filtering for public queries
    if not donor_address:  # Public query
        allocations = privacy_filter.filter_allocations(allocations)
    
    return [
        {
            "id": alloc.id,
            "project_id": alloc.project_id,
            "project_name": alloc.project.name if alloc.project else "Unknown",
            "donor_address": alloc.donor_address if donor_address else None,  # Hide for public
            "amount": alloc.amount,
            "allocation_type": alloc.allocation_type,
            "timestamp": alloc.timestamp,
            "from_project_id": alloc.from_project_id
        }
        for alloc in allocations
    ]

# Voting endpoints
async def get_voting_summary(
    round_id: Optional[int] = Query(None, description="Specific voting round"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    db: AsyncSession = Depends(get_db)
) -> List[VoteResponse]:
    """Get voting results summary."""
    
    query = select(VoteResult).options(
        selectinload(VoteResult.project),
        selectinload(VoteResult.round)
    )
    
    if round_id:
        query = query.where(VoteResult.round_id == round_id)
    if project_id:
        query = query.where(VoteResult.project_id == project_id)
    
    # Get latest results if no round specified
    if not round_id:
        latest_round_query = select(func.max(VotingRound.round_id))
        latest_round_result = await db.execute(latest_round_query)
        latest_round = latest_round_result.scalar()
        if latest_round:
            query = query.where(VoteResult.round_id == latest_round)
    
    query = query.order_by(desc(VoteResult.final_priority))
    
    result = await db.execute(query)
    vote_results = result.scalars().all()
    
    # Calculate turnout percentage for each result
    responses = []
    for result in vote_results:
        if result.round:
            turnout_percentage = (
                (result.round.total_revealed / result.round.total_active_members * 100)
                if result.round.total_active_members > 0 else 0
            )
        else:
            turnout_percentage = 0
        
        responses.append(VoteResponse(
            project_id=result.project_id,
            for_weight=result.for_weight,
            against_weight=result.against_weight,
            abstained_count=result.abstained_count,
            not_participating_count=result.not_participating_count,
            turnout_percentage=round(turnout_percentage, 2)
        ))
    
    return responses

async def get_voting_round_details(
    round_id: int = Path(..., description="Voting round ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed voting round information."""
    
    # Get voting round
    round_query = select(VotingRound).where(VotingRound.round_id == round_id)
    round_result = await db.execute(round_query)
    voting_round = round_result.scalar_one_or_none()
    
    if not voting_round:
        raise HTTPException(status_code=404, detail="Voting round not found")
    
    # Get results for this round
    results_query = select(VoteResult).options(
        selectinload(VoteResult.project)
    ).where(VoteResult.round_id == round_id)
    
    results_result = await db.execute(results_query)
    results = results_result.scalars().all()
    
    # Calculate overall statistics
    total_votes = len(results)
    total_for_weight = sum(r.for_weight for r in results)
    total_against_weight = sum(r.against_weight for r in results)
    total_abstained = sum(r.abstained_count for r in results)
    
    turnout_percentage = (
        (voting_round.total_revealed / voting_round.total_active_members * 100)
        if voting_round.total_active_members > 0 else 0
    )
    
    return {
        "round_id": round_id,
        "start_commit": voting_round.start_commit,
        "end_commit": voting_round.end_commit,
        "end_reveal": voting_round.end_reveal,
        "finalized": voting_round.finalized,
        "counting_method": voting_round.counting_method,
        "total_participants": voting_round.total_participants,
        "total_revealed": voting_round.total_revealed,
        "total_active_members": voting_round.total_active_members,
        "turnout_percentage": round(turnout_percentage, 2),
        "statistics": {
            "total_projects": total_votes,
            "total_for_weight": total_for_weight,
            "total_against_weight": total_against_weight,
            "total_abstained": total_abstained
        },
        "results": [
            {
                "project_id": r.project_id,
                "project_name": r.project.name if r.project else "Unknown",
                "for_weight": r.for_weight,
                "against_weight": r.against_weight,
                "abstained_count": r.abstained_count,
                "not_participating_count": r.not_participating_count,
                "final_priority": r.final_priority,
                "borda_points": r.borda_points
            }
            for r in sorted(results, key=lambda x: x.final_priority, reverse=True)
        ]
    }

async def finalize_latest_round(db: AsyncSession) -> Dict[str, Any]:
    """Mark latest non-finalized round as finalized (MVP)."""
    latest_round_query = select(VotingRound).where(VotingRound.finalized == False).order_by(desc(VotingRound.round_id)).limit(1)
    result = await db.execute(latest_round_query)
    round_obj = result.scalar_one_or_none()
    if not round_obj:
        return {"status": "noop", "message": "No active round"}
    round_obj.finalized = True
    await db.commit()
    return {"status": "success", "round_id": round_obj.round_id}

# Commit-Reveal Voting functions
async def get_current_voting_round_info(db: AsyncSession) -> Dict[str, Any]:
    """Get latest voting round information (active or finalized)."""
    # Берем самый последний раунд (включая финализированные)
    round_query = select(VotingRound).order_by(desc(VotingRound.round_id)).limit(1)
    round_result = await db.execute(round_query)
    round_obj = round_result.scalar_one_or_none()

    if not round_obj:
        return {
            "round_id": None,
            "phase": "no_active_round",
            "phase_message": "No active voting round",
            "time_remaining": 0,
            "start_commit": None,
            "end_commit": None,
            "end_reveal": None,
            "counting_method": "weighted",
            "total_participants": 0,
            "total_revealed": 0,
            "total_active_members": 0,
            "turnout_percentage": 0.0,
            "projects": []
        }

    # Фаза с учетом флага finalized
    if round_obj.finalized:
        phase = "finalized"
        phase_message = "Voting round finalized"
        time_remaining = 0
    else:
        now = datetime.utcnow()
        if now < round_obj.start_commit:
            phase = "pending"
            phase_message = "Voting round is pending"
            time_remaining = int((round_obj.start_commit - now).total_seconds())
        elif now < round_obj.end_commit:
            phase = "commit"
            phase_message = "Commit phase is active"
            time_remaining = int((round_obj.end_commit - now).total_seconds())
        elif now < round_obj.end_reveal:
            phase = "reveal"
            phase_message = "Reveal phase is active"
            time_remaining = int((round_obj.end_reveal - now).total_seconds())
        else:
            phase = "ended"
            phase_message = "Voting round has ended"
            time_remaining = 0

    projects_query = select(Project).join(
        VoteResult, VoteResult.project_id == Project.id
    ).where(VoteResult.round_id == round_obj.round_id)

    projects_result = await db.execute(projects_query)
    projects = projects_result.scalars().all()

    return {
        "round_id": round_obj.round_id,
        "phase": phase,
        "phase_message": phase_message,
        "time_remaining": time_remaining,
        "start_commit": round_obj.start_commit.isoformat() if round_obj.start_commit else None,
        "end_commit": round_obj.end_commit.isoformat() if round_obj.end_commit else None,
        "end_reveal": round_obj.end_reveal.isoformat() if round_obj.end_reveal else None,
        "counting_method": round_obj.counting_method or "weighted",
        "total_participants": round_obj.total_participants or 0,
        "total_revealed": round_obj.total_revealed or 0,
        "total_active_members": round_obj.total_active_members or 0,
        "turnout_percentage": round(
            (round_obj.total_revealed / round_obj.total_active_members * 100)
            if round_obj.total_active_members and round_obj.total_revealed else 0.0, 1
        ),
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "category": p.category,
                "target": p.target,
                "total_allocated": p.total_allocated
            }
            for p in projects
        ]
    }

async def get_user_voting_status(round_id: int, user_address: Optional[str], db: AsyncSession) -> Dict[str, Any]:
    """Get voting status for a specific user in a round."""
    if not user_address:
        return {"error": "User address required"}
    
    # Get voting round
    round_query = select(VotingRound).where(VotingRound.round_id == round_id)
    round_result = await db.execute(round_query)
    voting_round = round_result.scalar_one_or_none()
    
    if not voting_round:
        raise HTTPException(status_code=404, detail="Voting round not found")
    
    # Check if user has voted
    vote_query = select(Vote).where(
        and_(Vote.round_id == round_id, Vote.voter_address == user_address)
    )
    vote_result = await db.execute(vote_query)
    user_votes = vote_result.scalars().all()
    
    has_committed = len(user_votes) > 0 and any(v.committed_at for v in user_votes)
    has_revealed = len(user_votes) > 0 and any(v.revealed_at for v in user_votes)
    
    # Get user's SBT weight (placeholder)
    weight = 1  # This would come from SBT contract in real implementation
    
    return {
        "round_id": round_id,
        "user_address": user_address,
        "has_committed": has_committed,
        "has_revealed": has_revealed,
        "weight": weight,
        "eligible_to_vote": True,  # This would check SBT ownership
        "votes_cast": len(user_votes),
        "voting_power": weight
    }

# Payouts endpoints
async def list_payouts(
    project_id: Optional[str] = Query(None, description="Filter by project"),
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get list of payouts."""
    
    query = select(Payout).options(selectinload(Payout.project))
    
    if project_id:
        query = query.where(Payout.project_id == project_id)
    
    query = query.order_by(desc(Payout.timestamp))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    payouts = result.scalars().all()
    
    return [
        {
            "payout_id": payout.payout_id,
            "project_id": payout.project_id,
            "project_name": payout.project.name if payout.project else "Unknown",
            "amount": payout.amount,
            "recipient_address": payout.recipient_address,
            "timestamp": payout.timestamp,
            "tx_hash": payout.tx_hash,
            "multisig_tx_id": payout.multisig_tx_id
        }
        for payout in payouts
    ]

# User stats endpoints
async def get_user_stats(
    user_address: str,
    db: AsyncSession
) -> DonorStatsResponse:
    """Get comprehensive user statistics."""
    
    # Get member
    member_query = select(Member).where(Member.address == user_address)
    member_result = await db.execute(member_query)
    member = member_result.scalar_one_or_none()
    
    if not member:
        # Возвращаем пустую статистику вместо ошибки 404
        return DonorStatsResponse(
            total_donated=0.0,
            supported_projects=0,
            average_share_percentile=0.0,
            allocations=[]
        )
    
    # Get donation statistics
    donation_query = select(
        func.count(Donation.id).label('donation_count'),
        func.sum(Donation.amount).label('total_donated'),
        func.avg(Donation.amount).label('avg_donation')
    ).where(Donation.donor_address == user_address)
    
    donation_result = await db.execute(donation_query)
    donation_stats = donation_result.first()
    
    # Get allocation statistics
    allocation_query = select(
        Allocation.project_id,
        func.sum(Allocation.amount).label('total_allocated')
    ).where(
        Allocation.donor_address == user_address
    ).group_by(Allocation.project_id)
    
    allocation_result = await db.execute(allocation_query)
    allocations = allocation_result.all()
    
    # Calculate percentile ranking
    percentile = await _calculate_donor_percentile(db, member.total_donated)
    
    # Get supported projects count
    supported_projects = len(allocations)
    
    # Build allocation details
    allocation_details = []
    for alloc in allocations:
        # Get project total for share calculation
        project_total_query = select(
            func.sum(Allocation.amount)
        ).where(Allocation.project_id == alloc.project_id)
        
        project_total_result = await db.execute(project_total_query)
        project_total = project_total_result.scalar() or 0
        
        share = (alloc.total_allocated / project_total * 100) if project_total > 0 else 0
        
        allocation_details.append({
            "project_id": alloc.project_id,
            "amount": alloc.total_allocated,
            "share_percentage": round(share, 2)
        })
    
    return DonorStatsResponse(
        total_donated=member.total_donated,
        supported_projects=supported_projects,
        average_share_percentile=percentile,
        allocations=allocation_details
    )

# Treasury endpoints
async def get_treasury_stats(
    db: AsyncSession = Depends(get_db)
) -> TreasuryStatsResponse:
    """Get overall treasury statistics."""
    
    # Get donation totals
    donation_query = select(
        func.sum(Donation.amount).label('total_donations'),
        func.count(Donation.id).label('donation_count'),
        func.count(func.distinct(Donation.donor_address)).label('unique_donors')
    )
    
    donation_result = await db.execute(donation_query)
    donation_stats = donation_result.first()
    
    # Get allocation totals
    allocation_query = select(
        func.sum(Allocation.amount).label('total_allocated')
    )
    
    allocation_result = await db.execute(allocation_query)
    allocation_stats = allocation_result.first()
    
    # Get payout totals (only executed payouts with multisig_tx_id)
    payout_query = select(
        func.sum(Payout.amount).label('total_paid_out')
    ).where(Payout.multisig_tx_id.isnot(None))
    
    payout_result = await db.execute(payout_query)
    payout_stats = payout_result.first()
    
    # Get active projects count (including new statuses)
    active_projects_query = select(func.count(Project.id)).where(
        Project.status.in_(["active", "funding_ready", "voting", "ready_to_payout", "3", "4", "5"])
    )
    
    active_projects_result = await db.execute(active_projects_query)
    active_projects_count = active_projects_result.scalar()
    
    total_donations = float(donation_stats.total_donations or 0)
    total_allocated = float(allocation_stats.total_allocated or 0)
    total_paid_out = float(payout_stats.total_paid_out or 0)
    
    # Treasury balance = donations - allocated (not payouts)
    # This represents the actual available balance for new allocations
    total_balance = total_donations - total_allocated
    
    return TreasuryStatsResponse(
        total_balance=total_balance,
        total_donations=total_donations,
        total_allocated=total_allocated,
        total_paid_out=total_paid_out,
        active_projects_count=active_projects_count or 0,
        donors_count=donation_stats.unique_donors or 0
    )

async def get_treasury_transactions(
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get treasury transactions including donations, allocations, and payouts."""
    
    transactions = []
    
    # Get recent donations
    donations_query = select(Donation).order_by(desc(Donation.timestamp)).offset(offset).limit(limit)
    donations_result = await db.execute(donations_query)
    donations = donations_result.scalars().all()
    
    for donation in donations:
        transactions.append({
            "id": f"donation_{donation.id}",
            "hash": donation.tx_hash,
            "type": "donation",
            "amount": float(donation.amount),
            "timestamp": donation.timestamp,
            "from_address": donation.donor_address,
            "to_address": None,
            "project_id": None
        })
    
    # Get recent allocations
    allocations_query = select(Allocation).order_by(desc(Allocation.timestamp)).offset(offset).limit(limit)
    allocations_result = await db.execute(allocations_query)
    allocations = allocations_result.scalars().all()
    
    for allocation in allocations:
        transactions.append({
            "id": f"allocation_{allocation.id}",
            "hash": f"alloc_{allocation.id}",
            "type": "allocation",
            "amount": float(allocation.amount),
            "timestamp": allocation.timestamp,
            "from_address": None,
            "to_address": allocation.project_id,
            "project_id": allocation.project_id
        })
    
    # Get recent payouts
    payouts_query = select(Payout).order_by(desc(Payout.timestamp)).offset(offset).limit(limit)
    payouts_result = await db.execute(payouts_query)
    payouts = payouts_result.scalars().all()
    
    for payout in payouts:
        transactions.append({
            "id": f"payout_{payout.payout_id}",
            "hash": payout.tx_hash,
            "type": "payout",
            "amount": float(payout.amount),
            "timestamp": payout.timestamp,
            "from_address": None,
            "to_address": payout.recipient_address,
            "project_id": payout.project_id
        })
    
    # Sort all transactions by timestamp (most recent first)
    transactions.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Apply limit to combined results
    return transactions[:limit]

# Helper functions
def _calculate_project_eta(project: Project, current_allocated: float) -> Optional[str]:
    """Calculate estimated time to reach project target."""
    if project.deadline:
        return project.deadline.isoformat()
    
    # Simple linear projection based on recent donation velocity
    # This is a placeholder - in production you'd want more sophisticated modeling
    if current_allocated >= project.target:
        return "Target reached"
    
    remaining = project.target - current_allocated
    if remaining <= 0:
        return "Target reached"
    
    # Placeholder calculation
    return f"Estimated: {remaining:.2f} ETH remaining"

async def _calculate_donor_percentile(db: AsyncSession, donor_amount: float) -> int:
    """Calculate donor's percentile ranking."""
    
    # Count donors with less total donated
    lower_count_query = select(func.count(Member.id)).where(
        Member.total_donated < donor_amount
    )
    
    lower_count_result = await db.execute(lower_count_query)
    lower_count = lower_count_result.scalar() or 0
    
    # Get total donors count
    total_count_query = select(func.count(Member.id)).where(
        Member.total_donated > 0
    )
    
    total_count_result = await db.execute(total_count_query)
    total_count = total_count_result.scalar() or 1
    
    percentile = int((lower_count / total_count) * 100) if total_count > 0 else 0
    return min(99, max(1, percentile))  # Clamp between 1-99

async def get_system_logs(
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    level: Optional[str] = Query(None, description="Filter by log level"),
    module: Optional[str] = Query(None, description="Filter by module"),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get system logs with optional filtering."""
    from .models import SystemLog
    
    # Build query with filters
    query = select(SystemLog).order_by(desc(SystemLog.timestamp))
    
    if level:
        query = query.where(SystemLog.level == level.upper())
    
    if module:
        query = query.where(SystemLog.module == module)
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "level": log.level,
            "module": log.module,
            "message": log.message,
            "details": log.details,
            "user_address": log.user_address,
            "ip_address": log.ip_address
        }
        for log in logs
    ]

async def create_system_log(
    level: str,
    message: str,
    module: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    user_address: Optional[str] = None,
    ip_address: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new system log entry."""
    from .models import SystemLog
    
    log_entry = SystemLog(
        level=level.upper(),
        message=message,
        module=module,
        details=details,
        user_address=user_address,
        ip_address=ip_address
    )
    
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    
    return {
        "id": log_entry.id,
        "timestamp": log_entry.timestamp,
        "level": log_entry.level,
        "module": log_entry.module,
        "message": log_entry.message,
        "details": log_entry.details,
        "user_address": log_entry.user_address,
        "ip_address": log_entry.ip_address
    }

# Distribution planning
async def compute_distribution_plan(
    method: str,
    cap: str,
    budget: Optional[float],
    db: AsyncSession,
) -> Dict[str, Any]:
    """Compute a distribution plan based on voting priorities.

    method: 'sequential' | 'proportional'
    cap: 'target' | 'soft_cap'
    budget: optional, defaults to treasury balance
    """
    # Determine available budget
    treasury = await get_treasury_stats(db)
    available_budget = treasury.total_balance if budget is None else max(0.0, float(budget))

    # Build latest voting results map (project_id -> {final_priority, borda_points})
    latest_round_query = select(func.max(VotingRound.round_id))
    latest_round_result = await db.execute(latest_round_query)
    latest_round_id = latest_round_result.scalar()

    vote_map: Dict[str, Dict[str, Any]] = {}
    if latest_round_id:
        vr_query = select(VoteResult).where(VoteResult.round_id == latest_round_id)
        vr_result = await db.execute(vr_query)
        for r in vr_result.scalars().all():
            vote_map[r.project_id] = {
                "final_priority": r.final_priority or 0,
                "borda_points": r.borda_points or 0,
            }

    # Fetch projects
    proj_result = await db.execute(select(Project))
    projects = proj_result.scalars().all()

    # Calculate needs and weights
    items = []
    for p in projects:
        target_value = p.target if cap == "target" else (p.soft_cap or p.target)
        current_alloc = float(p.total_allocated or 0)
        need = max(0.0, float(target_value) - current_alloc)
        if need <= 0:
            continue
        vote_info = vote_map.get(p.id, {})
        final_priority = vote_info.get("final_priority", 0)
        borda_points = vote_info.get("borda_points", 0)
        items.append({
            "project_id": p.id,
            "name": p.name,
            "category": p.category,
            "target": float(p.target),
            "soft_cap": float(p.soft_cap),
            "total_allocated": current_alloc,
            "need": need,
            "final_priority": final_priority or int(p.priority or 0),
            "borda_points": borda_points or 0,
        })

    # Sort or weight
    plan_entries = []
    remaining = available_budget
    if method == "sequential":
        # Higher priority first; fallback to project.priority
        items.sort(key=lambda x: (x["final_priority"], x["borda_points"]) , reverse=True)
        for it in items:
            if remaining <= 0:
                break
            allocate = min(it["need"], remaining)
            if allocate <= 0:
                continue
            plan_entries.append({
                "project_id": it["project_id"],
                "name": it["name"],
                "need": round(it["need"], 6),
                "allocated": round(allocate, 6),
            })
            remaining -= allocate
    else:
        # Proportional by weights: prefer borda_points, then final_priority, then 1
        weights = []
        for it in items:
            w = it["borda_points"] if it["borda_points"] > 0 else (it["final_priority"] if it["final_priority"] > 0 else 1)
            weights.append(max(0.0, float(w)))
        total_weight = sum(weights) if weights else 0.0

        if total_weight <= 0 or available_budget <= 0:
            total_weight = 1.0

        # Initial proportional allocation with cap by need
        provisional = []
        for it, w in zip(items, weights):
            share = available_budget * (w / total_weight) if total_weight > 0 else 0.0
            allocated = min(it["need"], share)
            provisional.append({
                "project_id": it["project_id"],
                "name": it["name"],
                "need": round(it["need"], 6),
                "allocated": round(allocated, 6),
                "remaining_need": max(0.0, it["need"] - allocated),
                "weight": w,
            })

        # Redistribute any leftover due to capping until either no leftover or no demand
        leftover = available_budget - sum(p["allocated"] for p in provisional)
        # Prevent infinite loops; at most number of projects iterations
        for _ in range(len(provisional)):
            if leftover <= 1e-9:
                break
            demanders = [p for p in provisional if p["remaining_need"] > 1e-9]
            if not demanders:
                break
            total_w = sum(p["weight"] for p in demanders)
            if total_w <= 0:
                break
            for p in demanders:
                add = min(p["remaining_need"], leftover * (p["weight"] / total_w))
                p["allocated"] = round(p["allocated"] + add, 6)
                p["remaining_need"] = max(0.0, p["remaining_need"] - add)
            leftover = available_budget - sum(p["allocated"] for p in provisional)

        plan_entries = [{"project_id": p["project_id"], "name": p["name"], "need": p["need"], "allocated": p["allocated"]} for p in provisional]
        remaining = max(0.0, available_budget - sum(p["allocated"] for p in provisional))

    total_allocated_plan = round(sum(e["allocated"] for e in plan_entries), 6)
    return {
        "method": method,
        "cap": cap,
        "budget": round(available_budget, 6),
        "total_allocated": total_allocated_plan,
        "remaining_budget": round(remaining, 6),
        "projects": plan_entries,
        "projects_count": len(plan_entries),
        "round_id": latest_round_id,
    }

async def apply_distribution(
    method: str,
    cap: str,
    budget: Optional[float],
    db: AsyncSession,
) -> Dict[str, Any]:
    """Apply a computed distribution plan to projects (MVP: updates project.total_allocated)."""
    plan = await compute_distribution_plan(method=method, cap=cap, budget=budget, db=db)
    applied: List[Dict[str, Any]] = []
    for entry in plan.get("projects", []):
        pid = entry["project_id"]
        amount = float(entry.get("allocated", 0) or 0)
        if amount <= 0:
            continue
        # load project for update
        proj_result = await db.execute(select(Project).where(Project.id == pid))
        proj = proj_result.scalar_one_or_none()
        if not proj:
            continue
        # cap by need again to be safe
        target_value = proj.target if cap == "target" else (proj.soft_cap or proj.target)
        current_alloc = float(proj.total_allocated or 0)
        need = max(0.0, float(target_value) - current_alloc)
        to_add = min(need, amount)
        if to_add <= 0:
            continue
        proj.total_allocated = float(current_alloc + to_add)
        # optional status bump
        if proj.total_allocated >= target_value and proj.status in ("active", "voting", "funding_ready"):
            proj.status = "ready_to_payout"
        applied.append({
            "project_id": pid,
            "allocated_added": round(to_add, 6),
            "new_total_allocated": round(proj.total_allocated, 6),
            "status": proj.status,
        })
    await db.commit()
    plan["applied"] = applied
    return plan