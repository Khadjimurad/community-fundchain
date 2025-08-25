from fastapi import APIRouter, Depends, HTTPException, Query, Path, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime
import csv
import json
import io
import logging
from sqlalchemy import select, func

logger = logging.getLogger(__name__)

from .database import get_db
from .models import ProjectResponse, DonationResponse, VoteResponse, DonorStatsResponse, TreasuryStatsResponse, Donation
from .api import (
    list_projects, get_project, get_project_progress, get_projects_by_category,
    list_donations, get_donation, list_allocations, get_voting_summary,
    get_voting_round_details, list_payouts, get_user_stats, get_treasury_stats,
    get_current_voting_round_info, get_user_voting_status, get_treasury_transactions,
    compute_distribution_plan, apply_distribution, finalize_latest_round
)
from .privacy import privacy_filter
from .config import get_settings
from .indexer import indexer

settings = get_settings()
router = APIRouter()

# Health check endpoints
@router.get("/healthz", tags=["🏥 Health"])
async def healthz():
    """Basic health check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health", tags=["🏥 Health"])
async def health():
    """Health check endpoint for setup scripts."""
    return {"status": "healthy", "service": "fundchain-backend", "timestamp": datetime.utcnow().isoformat()}

# Projects endpoints
@router.get("/projects", response_model=List[ProjectResponse], tags=["💼 Projects"])
async def api_list_projects(
    status: Optional[str] = Query(None, description="Filter by project status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, le=1000, description="Number of projects to return"),
    offset: int = Query(0, ge=0, description="Number of projects to skip"),
    db: AsyncSession = Depends(get_db)
) -> List[ProjectResponse]:
    """Get list of projects with optional filtering."""
    return await list_projects(status, category, limit, offset, db)

@router.get("/projects/{project_id}", response_model=ProjectResponse, tags=["💼 Projects"])
async def api_get_project(
    project_id: str = Path(..., description="Project ID"),
    db: AsyncSession = Depends(get_db)
) -> ProjectResponse:
    """Get a specific project by ID."""
    return await get_project(project_id, db)

@router.get("/projects/{project_id}/progress", tags=["💼 Projects"])
async def api_get_project_progress(
    project_id: str = Path(..., description="Project ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get project funding progress and statistics."""
    return await get_project_progress(project_id, db)

@router.get("/projects/category/{category}", response_model=List[ProjectResponse], tags=["💼 Projects"])
async def api_get_projects_by_category(
    category: str = Path(..., description="Project category"),
    include_inactive: bool = Query(False, description="Include inactive projects"),
    db: AsyncSession = Depends(get_db)
) -> List[ProjectResponse]:
    """Get all projects in a specific category."""
    return await get_projects_by_category(category, include_inactive, db)

# Donations endpoints
@router.get("/donations", response_model=List[DonationResponse], tags=["💰 Donations"])
async def api_list_donations(
    donor_address: Optional[str] = Query(None, description="Filter by donor address"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[DonationResponse]:
    """Get list of donations with optional filtering."""
    return await list_donations(donor_address, project_id, limit, offset, db)

@router.get("/donations/{receipt_id}", tags=["💰 Donations"])
async def api_get_donation(
    receipt_id: str = Path(..., description="Donation receipt ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get donation details with allocations."""
    return await get_donation(receipt_id, db)

# Allocations endpoints
@router.get("/allocations", tags=["📈 Allocations"])
async def api_list_allocations(
    project_id: Optional[str] = Query(None, description="Filter by project"),
    donor_address: Optional[str] = Query(None, description="Filter by donor"),
    allocation_type: Optional[str] = Query(None, description="Filter by allocation type"),
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get list of allocations with filtering."""
    return await list_allocations(project_id, donor_address, allocation_type, limit, offset, db)

# Voting endpoints
@router.get("/votes/priority/summary", response_model=List[VoteResponse], tags=["🗽️ Voting"])
async def api_get_voting_summary(
    round_id: Optional[int] = Query(None, description="Specific voting round"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    db: AsyncSession = Depends(get_db)
) -> List[VoteResponse]:
    """Get voting results summary."""
    return await get_voting_summary(round_id, project_id, db)

@router.get("/votes/rounds/{round_id}", tags=["🗽️ Voting"])
async def api_get_voting_round_details(
    round_id: int = Path(..., description="Voting round ID"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed voting round information."""
    return await get_voting_round_details(round_id, db)

# Commit-Reveal Voting endpoints
@router.get("/votes/current-round", tags=["🗽️ Voting"])
async def get_current_voting_round(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get current active voting round information."""
    return await get_current_voting_round_info(db)

@router.post("/votes/{round_id}/commit", tags=["🗽️ Voting"])
async def commit_vote(
    round_id: int = Path(..., description="Voting round ID"),
    request: Dict[str, Any] = {},
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Submit a commit for voting round."""
    # This would interface with Web3 to call the commit function
    # For now, return placeholder response
    return {
        "status": "success",
        "message": "Commit submitted",
        "round_id": round_id,
        "hash": request.get("hash", "0x..."),
        "phase": "commit"
    }

@router.post("/votes/{round_id}/reveal", tags=["🗽️ Voting"])
async def reveal_vote(
    round_id: int = Path(..., description="Voting round ID"),
    request: Dict[str, Any] = {},
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Reveal a vote for voting round."""
    # This would interface with Web3 to call the reveal function
    # For now, return placeholder response
    return {
        "status": "success",
        "message": "Vote revealed",
        "round_id": round_id,
        "projects": request.get("projects", []),
        "choices": request.get("choices", []),
        "weight": request.get("weight", 1),
        "phase": "reveal"
    }

@router.get("/votes/{round_id}/status", tags=["🗽️ Voting"])
async def get_voting_round_status(
    round_id: int = Path(..., description="Voting round ID"),
    user_address: Optional[str] = Query(None, description="Check user voting status"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get voting round status for a user."""
    return await get_user_voting_status(round_id, user_address, db)

@router.post("/votes/sync-blockchain", tags=["🗽️ Voting"])
async def sync_voting_with_blockchain(
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Sync voting data with blockchain smart contracts."""
    try:
        logger.info("🔄 Starting blockchain sync for voting data...")
        
        # Import web3 client for blockchain interaction
        from .web3_client import get_web3_client
        
        web3_client = get_web3_client()
        
        # Get current voting round from blockchain
        ballot_contract = web3_client.get_contract("BallotCommitReveal")
        
        # Get latest round ID
        latest_round_id = ballot_contract.functions.lastRoundId().call()
        
        if latest_round_id == 0:
            return {
                "status": "success",
                "message": "No voting rounds found on blockchain",
                "synced_rounds": 0,
                "latest_round_id": 0
            }
        
        synced_rounds = 0
        
        # Sync data for each round
        for round_id in range(1, latest_round_id + 1):
            try:
                # Get round info from blockchain
                round_info = ballot_contract.functions.getRoundInfo(round_id).call()
                
                # Extract round data
                start_commit = round_info[0]
                end_commit = round_info[1]
                end_reveal = round_info[2]
                project_ids = round_info[4]
                total_participants = round_info[6]
                total_revealed = round_info[7]
                
                # Get voting results for each project
                for project_id in project_ids:
                    for_votes = ballot_contract.functions.forOf(round_id, project_id).call()
                    against_votes = ballot_contract.functions.againstOf(round_id, project_id).call()
                    
                    # Here you would update the database with blockchain data
                    # For now, just log the data
                    logger.info(f"Round {round_id}, Project {project_id.hex()[:8]}: For={for_votes}, Against={against_votes}")
                
                synced_rounds += 1
                
            except Exception as e:
                logger.warning(f"Failed to sync round {round_id}: {e}")
                continue
        
        logger.info(f"✅ Blockchain sync completed. Synced {synced_rounds} rounds.")
        
        return {
            "status": "success",
            "message": f"Successfully synced {synced_rounds} voting rounds with blockchain",
            "synced_rounds": synced_rounds,
            "latest_round_id": latest_round_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Blockchain sync failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Blockchain sync failed: {str(e)}"
        )

# Payouts endpoints
@router.get("/payouts", tags=["💳 Payouts"])
async def api_list_payouts(
    project_id: Optional[str] = Query(None, description="Filter by project"),
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get list of payouts."""
    return await list_payouts(project_id, limit, offset, db)

# User stats endpoints
@router.get("/me/stats", response_model=DonorStatsResponse, tags=["👤 User Stats"])
async def api_get_user_stats(
    user_address: str = Query(..., description="User wallet address"),
    db: AsyncSession = Depends(get_db)
) -> DonorStatsResponse:
    """Get comprehensive user statistics."""
    return await get_user_stats(user_address, db)

# Treasury endpoints
@router.get("/treasury/stats", response_model=TreasuryStatsResponse, tags=["🏦 Treasury"])
async def api_get_treasury_stats(
    db: AsyncSession = Depends(get_db)
) -> TreasuryStatsResponse:
    """Get overall treasury statistics."""
    return await get_treasury_stats(db)

@router.get("/treasury/transactions", tags=["🏦 Treasury"])
async def api_get_treasury_transactions(
    limit: int = Query(50, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get treasury transactions including donations, allocations, and payouts."""
    
    return await get_treasury_transactions(limit, offset, db)

# Privacy and anonymity endpoints
@router.get("/privacy/report", tags=["🔒 Privacy"])
async def get_privacy_report(
    data_type: str = Query(..., description="Type of data to analyze"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get privacy and k-anonymity report for a dataset."""
    
    if data_type == "donations":
        donations = await list_donations(donor_address=None, project_id=None, limit=50, offset=0, db=db)
        data = [{
            "amount": d.amount,
            "timestamp": d.timestamp
        } for d in donations]
    elif data_type == "allocations":
        allocations = await list_allocations(project_id=None, donor_address=None, allocation_type=None, limit=50, offset=0, db=db)
        data = [{
            "amount": a["amount"],
            "timestamp": a["timestamp"]
        } for a in allocations]
    else:
        raise HTTPException(status_code=400, detail="Invalid data type")
    
    return privacy_filter.get_anonymity_report(data)

# Export endpoints
@router.get("/export/donations", tags=["📊 Export"])
async def export_donations(
    format: str = Query("csv", description="Export format (csv, json)"),
    donor_address: Optional[str] = Query(None, description="Filter by donor address"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    limit: int = Query(settings.max_export_records, le=settings.max_export_records),
    db: AsyncSession = Depends(get_db)
):
    """Export donations data."""
    
    # Validate export request
    context = "personal" if donor_address else "public"
    validation = privacy_filter.validate_export_request(limit, context)
    
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    donations = await list_donations(donor_address, project_id, validation["max_allowed_records"], 0, db)
    
    if format.lower() == "csv":
        return _export_to_csv(
            data=[{
                "receipt_id": d.receipt_id,
                "donor_address": d.donor_address if donor_address else "***",
                "amount": d.amount,
                "timestamp": d.timestamp.isoformat(),
                "tx_hash": d.tx_hash
            } for d in donations],
            filename="donations.csv"
        )
    else:
        return JSONResponse(content={
            "donations": [d.model_dump() for d in donations],
            "export_info": {
                "total_records": len(donations),
                "export_time": datetime.utcnow().isoformat(),
                "privacy_level": f"{settings.k_anonymity_threshold}-anonymous" if not donor_address else "personal"
            }
        })

@router.get("/export/allocations", tags=["📊 Export"])
async def export_allocations(
    format: str = Query("csv", description="Export format (csv, json)"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    donor_address: Optional[str] = Query(None, description="Filter by donor"),
    limit: int = Query(settings.max_export_records, le=settings.max_export_records),
    db: AsyncSession = Depends(get_db)
):
    """Export allocations data."""
    
    context = "personal" if donor_address else "public"
    validation = privacy_filter.validate_export_request(limit, context)
    
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    allocations = await list_allocations(project_id, donor_address, None, validation["max_allowed_records"], 0, db)
    
    if format.lower() == "csv":
        return _export_to_csv(
            data=allocations,
            filename="allocations.csv"
        )
    else:
        return JSONResponse(content={
            "allocations": allocations,
            "export_info": {
                "total_records": len(allocations),
                "export_time": datetime.utcnow().isoformat(),
                "privacy_level": f"{settings.k_anonymity_threshold}-anonymous" if not donor_address else "personal"
            }
        })

@router.get("/export/voting-results", tags=["📊 Export"])
async def export_voting_results(
    format: str = Query("csv", description="Export format (csv, json)"),
    round_id: Optional[int] = Query(None, description="Filter by voting round"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    limit: int = Query(settings.max_export_records, le=settings.max_export_records),
    db: AsyncSession = Depends(get_db)
):
    """Export voting results data."""
    
    validation = privacy_filter.validate_export_request(limit, "public")
    
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    # Get voting results
    voting_results = await get_voting_summary(round_id, project_id, db)
    
    # Get detailed round information if round_id is specified
    round_details = None
    if round_id:
        try:
            round_details = await get_voting_round_details(round_id, db)
        except:
            pass
    
    # Prepare export data
    export_data = []
    for result in voting_results:
        export_data.append({
            "project_id": result.project_id,
            "for_weight": result.for_weight,
            "against_weight": result.against_weight,
            "abstained_count": result.abstained_count,
            "not_participating_count": result.not_participating_count,
            "turnout_percentage": result.turnout_percentage,
            "round_id": round_id or "latest",
            "total_votes": result.for_weight + result.against_weight + result.abstained_count + result.not_participating_count
        })
    
    if format.lower() == "csv":
        return _export_to_csv(
            data=export_data,
            filename=f"voting_results_round_{round_id or 'latest'}.csv"
        )
    else:
        return JSONResponse(content={
            "voting_results": export_data,
            "round_details": round_details,
            "export_info": {
                "total_records": len(export_data),
                "export_time": datetime.utcnow().isoformat(),
                "privacy_level": f"{settings.k_anonymity_threshold}-anonymous",
                "round_id": round_id or "latest"
            }
        })

@router.get("/admin/distribution/plan", tags=["⚙️ Admin"])
async def admin_distribution_plan(
    method: str = Query("sequential", description="sequential | proportional"),
    cap: str = Query("target", description="target | soft_cap"),
    budget: Optional[float] = Query(None, description="Override budget (ETH)"),
    db: AsyncSession = Depends(get_db)
):
    """Compute a distribution plan using current priorities and treasury balance."""
    # Allow only when round is finalized/ended
    current = await get_current_voting_round_info(db)
    if current and current.get("phase") not in ("finalized", "ended", "no_active_round"):
        raise HTTPException(status_code=400, detail="Distribution allowed only after finalization")
    if method not in ("sequential", "proportional"):
        raise HTTPException(status_code=400, detail="Invalid method")
    if cap not in ("target", "soft_cap"):
        raise HTTPException(status_code=400, detail="Invalid cap")
    try:
        plan = await compute_distribution_plan(method=method, cap=cap, budget=budget, db=db)
        return plan
    except Exception as e:
        logger.error(f"Failed to compute distribution plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute distribution plan")

@router.post("/admin/distribution/apply", tags=["⚙️ Admin"])
async def admin_distribution_apply(
    method: str = Query("sequential", description="sequential | proportional"),
    cap: str = Query("target", description="target | soft_cap"),
    budget: Optional[float] = Query(None, description="Override budget (ETH)"),
    db: AsyncSession = Depends(get_db)
):
    """Apply distribution plan (MVP: updates total_allocated and statuses)."""
    current = await get_current_voting_round_info(db)
    if current and current.get("phase") not in ("finalized", "ended", "no_active_round"):
        raise HTTPException(status_code=400, detail="Distribution allowed only after finalization")
    if method not in ("sequential", "proportional"):
        raise HTTPException(status_code=400, detail="Invalid method")
    if cap not in ("target", "soft_cap"):
        raise HTTPException(status_code=400, detail="Invalid cap")
    try:
        result = await apply_distribution(method=method, cap=cap, budget=budget, db=db)
        return result
    except Exception as e:
        logger.error(f"Failed to apply distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to apply distribution")

@router.post("/admin/voting/finalize-round", tags=["⚙️ Admin"])
async def admin_finalize_round(db: AsyncSession = Depends(get_db)):
    """Finalize latest non-finalized round."""
    try:
        return await finalize_latest_round(db)
    except Exception as e:
        logger.error(f"Failed to finalize round: {e}")
        raise HTTPException(status_code=500, detail="Failed to finalize round")

@router.get("/export/comprehensive-report", tags=["📊 Export"])
async def export_comprehensive_report(
    format: str = Query("json", description="Export format (json recommended for comprehensive data)"),
    include_personal_data: bool = Query(False, description="Include personal/sensitive data (requires admin access)"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """Export comprehensive system report including all data types."""
    
    # Validate comprehensive export request
    validation = privacy_filter.validate_export_request(settings.max_export_records, "admin" if include_personal_data else "public")
    
    if not validation["allowed"]:
        raise HTTPException(status_code=403, detail=validation["reason"])
    
    try:
        # Parse date filters
        date_from_dt = None
        date_to_dt = None
        
        if date_from:
            date_from_dt = datetime.strptime(date_from, "%Y-%m-%d")
        if date_to:
            date_to_dt = datetime.strptime(date_to, "%Y-%m-%d")
        
        # Gather all data types
        report_data = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "date_range": {
                    "from": date_from or "beginning",
                    "to": date_to or "now"
                },
                "privacy_level": f"{settings.k_anonymity_threshold}-anonymous" if not include_personal_data else "full",
                "includes_personal_data": include_personal_data
            }
        }
        
        # Get projects data
        projects = await list_projects(status=None, category=None, limit=1000, offset=0, db=db)
        report_data["projects"] = {
            "count": len(projects),
            "data": [p.model_dump() for p in projects] if include_personal_data else [{"id": p.id, "category": p.category, "target": p.target, "status": p.status} for p in projects]
        }
        
        # Get treasury stats
        treasury_stats = await get_treasury_stats(db)
        report_data["treasury"] = treasury_stats.model_dump()
        
        # Get voting summary
        voting_results = await get_voting_summary(round_id=None, project_id=None, db=db)
        report_data["voting"] = {
            "latest_results_count": len(voting_results),
            "data": [v.model_dump() for v in voting_results]
        }
        
        # Get donations (filtered by date if specified)
        donations = await list_donations(donor_address=None, project_id=None, limit=5000, offset=0, db=db)
        if date_from_dt or date_to_dt:
            filtered_donations = []
            for donation in donations:
                if date_from_dt and donation.timestamp < date_from_dt:
                    continue
                if date_to_dt and donation.timestamp > date_to_dt:
                    continue
                filtered_donations.append(donation)
            donations = filtered_donations
        
        report_data["donations"] = {
            "count": len(donations),
            "data": [d.model_dump() for d in donations] if include_personal_data else [{"amount": d.amount, "timestamp": d.timestamp.isoformat()} for d in donations]
        }
        
        # Get allocations
        allocations = await list_allocations(project_id=None, donor_address=None, allocation_type=None, limit=5000, offset=0, db=db)
        report_data["allocations"] = {
            "count": len(allocations),
            "data": allocations if include_personal_data else [{"project_id": a["project_id"], "amount": a["amount"]} for a in allocations]
        }
        
        if format.lower() == "csv":
            # For CSV, create a summary table
            summary_data = [
                {
                    "category": "Projects",
                    "total_count": report_data["projects"]["count"],
                    "value": sum(p.target for p in projects)
                },
                {
                    "category": "Donations", 
                    "total_count": report_data["donations"]["count"],
                    "value": treasury_stats.total_donations
                },
                {
                    "category": "Allocations",
                    "total_count": report_data["allocations"]["count"],
                    "value": treasury_stats.total_allocated
                }
            ]
            
            return _export_to_csv(
                data=summary_data,
                filename="comprehensive_report_summary.csv"
            )
        else:
            return JSONResponse(content=report_data)
            
    except Exception as e:
        logger.error(f"Failed to generate comprehensive report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate comprehensive report")

# Admin endpoints
@router.post("/admin/indexer/reindex", tags=["⚙️ Admin"])
async def reindex_blockchain(
    contract_name: Optional[str] = Query(None, description="Specific contract to reindex"),
    from_block: Optional[int] = Query(None, description="Starting block number")
):
    """Force reindex blockchain data."""
    try:
        await indexer.force_reindex(contract_name, from_block)
        return {"status": "success", "message": "Reindexing initiated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/indexer/status", tags=["⚙️ Admin"])
async def get_indexer_status():
    """Get blockchain indexer status."""
    return {
        "running": indexer.running,
        "contracts": list(indexer.contracts.keys()),
        "poll_interval": indexer.poll_interval
    }

@router.post("/admin/voting/start-round", tags=["⚙️ Admin"])
async def start_voting_round(
    request: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Start a new voting round with selected projects."""
    try:
        projects = request.get("projects", [])
        commit_duration = request.get("commit_duration_hours", 168)
        reveal_duration = request.get("reveal_duration_hours", 72)
        counting_method = request.get("counting_method", "borda")
        
        if not projects:
            raise HTTPException(status_code=400, detail="At least one project must be selected")
        
        # В MVP версии мы симулируем запуск раунда голосования
        # В полной версии здесь был бы вызов смарт-контракта
        
        # Генерируем новый ID раунда
        round_id = 4  # В реальной версии это было бы получено из блокчейна
        
        # Логируем действие
        logger.info(f"Starting voting round {round_id} with {len(projects)} projects")
        logger.info(f"Projects: {projects}")
        logger.info(f"Duration: {commit_duration}h commit, {reveal_duration}h reveal")
        logger.info(f"Method: {counting_method}")
        
        return {
            "status": "success",
            "message": "Voting round started successfully",
            "round_id": round_id,
            "projects": projects,
            "commit_duration_hours": commit_duration,
            "reveal_duration_hours": reveal_duration,
            "counting_method": counting_method,
            "start_time": datetime.utcnow().isoformat(),
            "phase": "commit"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting voting round: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start voting round: {str(e)}")

# Statistics and aggregates
@router.get("/stats/overview", tags=["📈 Statistics"])
async def get_overview_stats(db: AsyncSession = Depends(get_db)):
    """Get high-level overview statistics."""
    
    treasury_stats = await get_treasury_stats(db)
    projects = await list_projects(status=None, category=None, limit=1000, offset=0, db=db)
    
    # Calculate additional metrics with proper status mapping
    active_projects = [p for p in projects if str(p.status) in ["active", "funding_ready", "voting", "3", "4", "5"]]
    completed_projects = [p for p in projects if str(p.status) in ["paid", "6"]]
    pending_projects = [p for p in projects if str(p.status) in ["draft", "1", "2"]]
    
    # Calculate 7-day donations
    from datetime import datetime, timedelta
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    donations_7d_query = select(func.sum(Donation.amount)).where(Donation.timestamp >= seven_days_ago)
    donations_7d_result = db.execute(donations_7d_query)
    donations_7d = donations_7d_result.scalar() or 0
    
    return {
        "treasury": treasury_stats.model_dump(),
        "projects": {
            "total": len(projects),
            "active": len(active_projects),
            "completed": len(completed_projects),
            "pending": len(pending_projects),
            "success_rate": (len(completed_projects) / len(projects) * 100) if projects else 0
        },
        "donations_7d": float(donations_7d),
        "latest_update": datetime.utcnow().isoformat()
    }

@router.get("/reports/project-analytics", tags=["📉 Reports"])
async def get_project_analytics(
    category: Optional[str] = Query(None, description="Filter by category"),
    period_days: int = Query(30, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed project analytics and trends."""
    
    # Get projects with optional category filter
    projects = await list_projects(status=None, category=category, limit=1000, offset=0, db=db)
    
    # Calculate analytics
    analytics = {
        "period_days": period_days,
        "category": category or "all",
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_projects": len(projects),
            "total_target": sum(p.target for p in projects),
            "total_allocated": sum(p.total_allocated for p in projects),
            "total_paid_out": sum(p.total_paid_out for p in projects),
            "average_target": sum(p.target for p in projects) / len(projects) if projects else 0,
            "average_allocated": sum(p.total_allocated for p in projects) / len(projects) if projects else 0
        },
        "by_status": {},
        "by_category": {},
        "funding_progress": {
            "fully_funded": 0,
            "over_50_percent": 0,
            "under_50_percent": 0,
            "no_funding": 0
        }
    }
    
    # Analyze by status
    status_groups = {}
    for project in projects:
        status = project.status
        if status not in status_groups:
            status_groups[status] = {"count": 0, "total_target": 0, "total_allocated": 0}
        status_groups[status]["count"] += 1
        status_groups[status]["total_target"] += project.target
        status_groups[status]["total_allocated"] += project.total_allocated
    
    analytics["by_status"] = status_groups
    
    # Analyze by category (if not already filtered)
    if not category:
        category_groups = {}
        for project in projects:
            cat = project.category
            if cat not in category_groups:
                category_groups[cat] = {"count": 0, "total_target": 0, "total_allocated": 0}
            category_groups[cat]["count"] += 1
            category_groups[cat]["total_target"] += project.target
            category_groups[cat]["total_allocated"] += project.total_allocated
        
        analytics["by_category"] = category_groups
    
    # Analyze funding progress
    for project in projects:
        progress = (project.total_allocated / project.target) if project.target > 0 else 0
        if progress >= 1.0:
            analytics["funding_progress"]["fully_funded"] += 1
        elif progress >= 0.5:
            analytics["funding_progress"]["over_50_percent"] += 1
        elif progress > 0:
            analytics["funding_progress"]["under_50_percent"] += 1
        else:
            analytics["funding_progress"]["no_funding"] += 1
    
    return analytics

@router.get("/reports/voting-analytics", tags=["📉 Reports"])
async def get_voting_analytics(
    round_id: Optional[int] = Query(None, description="Specific round or latest"),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed voting analytics and participation metrics."""
    
    try:
        # Get voting round details
        round_details = await get_voting_round_details(round_id, db) if round_id else None
        
        # Get voting results
        voting_results = await get_voting_summary(round_id, None, db)
        
        analytics = {
            "round_id": round_id or "latest",
            "generated_at": datetime.utcnow().isoformat(),
            "round_details": round_details,
            "participation_metrics": {
                "total_projects_voted": len(voting_results),
                "total_for_votes": sum(r.for_weight for r in voting_results),
                "total_against_votes": sum(r.against_weight for r in voting_results),
                "total_abstentions": sum(r.abstained_count for r in voting_results),
                "total_non_participants": sum(r.not_participating_count for r in voting_results),
                "average_turnout": sum(r.turnout_percentage for r in voting_results) / len(voting_results) if voting_results else 0
            },
            "project_analysis": []
        }
        
        # Analyze each project's voting pattern
        for result in voting_results:
            total_votes = result.for_weight + result.against_weight + result.abstained_count + result.not_participating_count
            project_analysis = {
                "project_id": result.project_id,
                "total_eligible_voters": total_votes,
                "participation_rate": result.turnout_percentage,
                "support_ratio": (result.for_weight / (result.for_weight + result.against_weight)) * 100 if (result.for_weight + result.against_weight) > 0 else 0,
                "engagement_score": ((result.for_weight + result.against_weight) / total_votes) * 100 if total_votes > 0 else 0,
                "consensus_level": "high" if abs(result.for_weight - result.against_weight) / max(result.for_weight + result.against_weight, 1) > 0.6 else "low"
            }
            analytics["project_analysis"].append(project_analysis)
        
        return analytics
        
    except Exception as e:
        logger.error(f"Failed to generate voting analytics: {e}")
        # Return basic analytics if detailed analysis fails
        voting_results = await get_voting_summary(round_id, None, db)
        
        return {
            "round_id": round_id or "latest",
            "generated_at": datetime.utcnow().isoformat(),
            "basic_metrics": {
                "total_projects": len(voting_results),
                "total_for_votes": sum(r.for_weight for r in voting_results),
                "total_against_votes": sum(r.against_weight for r in voting_results)
            }
        }

@router.get("/reports/treasury-analytics", tags=["📉 Reports"])
async def get_treasury_analytics(
    period_days: int = Query(30, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed treasury analytics including flows and trends."""
    
    # Get basic treasury stats
    treasury_stats = await get_treasury_stats(db)
    
    # Get recent donations for trend analysis
    recent_donations = await list_donations(donor_address=None, project_id=None, limit=1000, offset=0, db=db)
    
    # Get allocations for flow analysis
    allocations = await list_allocations(project_id=None, donor_address=None, allocation_type=None, limit=1000, offset=0, db=db)
    
    analytics = {
        "period_days": period_days,
        "generated_at": datetime.utcnow().isoformat(),
        "treasury_overview": treasury_stats.model_dump(),
        "flow_analysis": {
            "total_inflow": treasury_stats.total_donations,
            "total_allocated": treasury_stats.total_allocated,
            "total_paid_out": treasury_stats.total_paid_out,
            "unallocated_balance": treasury_stats.total_donations - treasury_stats.total_allocated,
            "allocation_rate": (treasury_stats.total_allocated / treasury_stats.total_donations * 100) if treasury_stats.total_donations > 0 else 0,
            "payout_rate": (treasury_stats.total_paid_out / treasury_stats.total_allocated * 100) if treasury_stats.total_allocated > 0 else 0
        },
        "recent_activity": {
            "recent_donations_count": len(recent_donations),
            "recent_allocations_count": len(allocations),
            "average_donation_size": sum(d.amount for d in recent_donations) / len(recent_donations) if recent_donations else 0
        }
    }
    
    # Apply privacy filtering to the analytics
    if len(recent_donations) < settings.k_anonymity_threshold:
        analytics["recent_activity"]["note"] = f"Limited data shown for privacy (k={settings.k_anonymity_threshold})"
    
    return analytics

@router.get("/stats/categories", tags=["📈 Statistics"])
async def get_category_stats(db: AsyncSession = Depends(get_db)):
    """Get statistics by project category."""
    
    projects = await list_projects(status=None, category=None, limit=1000, offset=0, db=db)
    
    # Group by category
    categories = {}
    for project in projects:
        cat = project.category
        if cat not in categories:
            categories[cat] = {
                "total_projects": 0,
                "total_target": 0,
                "total_allocated": 0,
                "active_projects": 0
            }
        
        categories[cat]["total_projects"] += 1
        categories[cat]["total_target"] += project.target
        categories[cat]["total_allocated"] += project.total_allocated
        
        if project.status in ["active", "funding_ready", "voting"]:
            categories[cat]["active_projects"] += 1
    
    return privacy_filter.get_safe_aggregates(
        [{
            "category": cat,
            "amount": stats["total_allocated"]
        } for cat, stats in categories.items()],
        "category"
    )

# Helper function for CSV export
def _export_to_csv(data: List[Dict[str, Any]], filename: str) -> StreamingResponse:
    """Export data to CSV format."""
    
    output = io.StringIO()
    
    if not data:
        # Create empty CSV with basic headers for empty data
        if "voting_results" in filename:
            fieldnames = ["project_id", "for_weight", "against_weight", "abstained_count", 
                         "not_participating_count", "turnout_percentage", "round_id", "total_votes"]
        elif "donations" in filename:
            fieldnames = ["receipt_id", "donor_address", "amount", "timestamp", "tx_hash"]
        elif "allocations" in filename:
            fieldnames = ["project_id", "donor_address", "amount", "timestamp", "allocation_type"]
        else:
            fieldnames = ["message"]
            data = [{"message": "No data available"}]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        if data:  # Only write rows if there's actual data
            writer.writerows(data)
    else:
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# System Logs endpoints
@router.get("/admin/logs", tags=["🔧 Administration"])
async def api_get_system_logs(
    limit: int = Query(100, le=1000, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARNING, ERROR, DEBUG)"),
    module: Optional[str] = Query(None, description="Filter by module"),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get system logs with optional filtering."""
    from .api import get_system_logs
    return await get_system_logs(limit, offset, level, module, db)

@router.post("/admin/logs", tags=["🔧 Administration"])
async def api_create_system_log(
    level: str,
    message: str,
    module: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    user_address: Optional[str] = None,
    ip_address: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new system log entry."""
    from .api import create_system_log
    return await create_system_log(level, message, module, details, user_address, ip_address, db)

# System configuration endpoint
@router.get("/admin/system/config", tags=["⚙️ Admin"])
async def get_system_config():
    """Get system configuration including contract addresses."""
    try:
        from .web3_client import get_web3_client
        
        web3_client = get_web3_client()
        
        # Get contract addresses from web3 client
        contract_addresses = web3_client.contract_addresses
        
        # Map contract names to expected field names
        config = {
            "treasury_address": contract_addresses.get("Treasury"),
            "projects_address": contract_addresses.get("Projects"),
            "sbt_address": contract_addresses.get("GovernanceSBT"),
            "ballot_address": contract_addresses.get("BallotCommitReveal"),
            "multisig_address": contract_addresses.get("CommunityMultisig"),  # Now deployed
            "k_anonymity_threshold": 5,
            "max_export_records": 10000,
            "default_commit_duration": 168,
            "default_reveal_duration": 72,
            "enable_privacy_filters": True,
            "require_sbt_voting": True,
            "enable_auto_finalization": False
        }
        
        return config
        
    except Exception as e:
        logger.error(f"Failed to get system config: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get system configuration: {str(e)}"
        )

# Contract ABI endpoint
@router.get("/admin/contracts/abi/{contract_name}", tags=["⚙️ Admin"])
async def get_contract_abi(contract_name: str):
    """Get contract ABI by name."""
    try:
        from .web3_client import get_web3_client
        
        web3_client = get_web3_client()
        
        # Get ABI from web3 client
        if contract_name in web3_client.contract_abis:
            return {
                "contract_name": contract_name,
                "abi": web3_client.contract_abis[contract_name]
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"ABI for contract {contract_name} not found"
            )
        
    except Exception as e:
        logger.error(f"Failed to get contract ABI: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get contract ABI: {str(e)}"
        )
