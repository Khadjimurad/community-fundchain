"""
Comprehensive test suite for FundChain backend API
Tests all endpoints, privacy features, and business logic
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db, Base
from app.models import Project, Member, Donation, Allocation, VotingRound, Vote, VoteResult
from app.config import get_settings


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def client():
    """Create test client with test database."""
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a test database session."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def sample_projects(db_session):
    """Create sample projects for testing."""
    projects = [
        Project(
            id="project1",
            name="Community Well",
            description="Clean water access",
            target=10.0,
            soft_cap=6.0,
            hard_cap=15.0,
            category="infrastructure",
            status="active",
            priority=1,
            soft_cap_enabled=True,
            total_allocated=3.5,
            total_paid_out=0.0
        ),
        Project(
            id="project2",
            name="Medical Supplies",
            description="Emergency medical equipment",
            target=5.0,
            soft_cap=3.0,
            hard_cap=8.0,
            category="healthcare",
            status="funding_ready",
            priority=2,
            soft_cap_enabled=True,
            total_allocated=3.2,
            total_paid_out=0.0
        ),
        Project(
            id="project3",
            name="School Equipment",
            description="Computers for education",
            target=15.0,
            soft_cap=10.0,
            hard_cap=20.0,
            category="education",
            status="voting",
            priority=3,
            soft_cap_enabled=False,
            total_allocated=8.5,
            total_paid_out=0.0
        )
    ]
    
    for project in projects:
        db_session.add(project)
    db_session.commit()
    
    return projects


@pytest.fixture
def sample_members(db_session):
    """Create sample members for testing."""
    members = [
        Member(
            address="0x1234567890123456789012345678901234567890",
            total_donated=5.0,
            weight=5,
            has_token=True
        ),
        Member(
            address="0x2345678901234567890123456789012345678901",
            total_donated=3.0,
            weight=3,
            has_token=True
        ),
        Member(
            address="0x3456789012345678901234567890123456789012",
            total_donated=2.0,
            weight=2,
            has_token=True
        )
    ]
    
    for member in members:
        db_session.add(member)
    db_session.commit()
    
    return members


@pytest.fixture
def sample_donations(db_session, sample_members):
    """Create sample donations for testing."""
    donations = [
        Donation(
            receipt_id="receipt1",
            donor_address=sample_members[0].address,
            amount=5.0,
            tx_hash="0xhash1",
            block_number=1000
        ),
        Donation(
            receipt_id="receipt2",
            donor_address=sample_members[1].address,
            amount=3.0,
            tx_hash="0xhash2",
            block_number=1001
        ),
        Donation(
            receipt_id="receipt3",
            donor_address=sample_members[2].address,
            amount=2.0,
            tx_hash="0xhash3",
            block_number=1002
        )
    ]
    
    for donation in donations:
        db_session.add(donation)
    db_session.commit()
    
    return donations


class TestHealthEndpoints:
    """Test health and basic endpoints."""
    
    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
    
    def test_health_check(self, client):
        response = client.get("/api/v1/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


class TestProjectsAPI:
    """Test projects endpoints."""
    
    def test_list_projects(self, client, sample_projects):
        response = client.get("/api/v1/projects")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert data[0]["name"] == "Community Well"
    
    def test_list_projects_with_filters(self, client, sample_projects):
        # Filter by status
        response = client.get("/api/v1/projects?status=active")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "active"
        
        # Filter by category
        response = client.get("/api/v1/projects?category=healthcare")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["category"] == "healthcare"
    
    def test_get_project_by_id(self, client, sample_projects):
        response = client.get("/api/v1/projects/project1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "project1"
        assert data["name"] == "Community Well"
    
    def test_get_nonexistent_project(self, client):
        response = client.get("/api/v1/projects/nonexistent")
        assert response.status_code == 404
    
    def test_get_project_progress(self, client, sample_projects):
        response = client.get("/api/v1/projects/project1/progress")
        assert response.status_code == 200
        data = response.json()
        assert "progress_to_target_percent" in data
        assert "progress_to_soft_cap_percent" in data
        assert "funding_status" in data
    
    def test_projects_pagination(self, client, sample_projects):
        response = client.get("/api/v1/projects?limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        response = client.get("/api/v1/projects?limit=2&offset=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1


class TestDonationsAPI:
    """Test donations endpoints."""
    
    def test_list_donations(self, client, sample_donations):
        response = client.get("/api/v1/donations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3
    
    def test_list_donations_by_donor(self, client, sample_donations, sample_members):
        donor_address = sample_members[0].address
        response = client.get(f"/api/v1/donations?donor_address={donor_address}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["donor_address"] == donor_address
    
    def test_get_donation_by_receipt(self, client, sample_donations):
        response = client.get("/api/v1/donations/receipt1")
        assert response.status_code == 200
        data = response.json()
        assert data["receipt_id"] == "receipt1"


class TestVotingAPI:
    """Test voting endpoints."""
    
    def test_voting_summary(self, client):
        response = client.get("/api/v1/votes/priority/summary")
        assert response.status_code == 200
        # Should return empty list if no voting data
        data = response.json()
        assert isinstance(data, list)
    
    def test_current_voting_round(self, client):
        response = client.get("/api/v1/votes/current-round")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_voting_round_status(self, client):
        response = client.get("/api/v1/votes/1/status")
        assert response.status_code == 200
        data = response.json()
        assert "error" in data or "round_id" in data


class TestUserStatsAPI:
    """Test user statistics endpoints."""
    
    def test_user_stats(self, client, sample_members, sample_donations):
        user_address = sample_members[0].address
        response = client.get(f"/api/v1/me/stats?user_address={user_address}")
        assert response.status_code == 200
        data = response.json()
        assert data["total_donated"] == 5.0
    
    def test_user_stats_nonexistent(self, client):
        response = client.get("/api/v1/me/stats?user_address=0xinvalid")
        assert response.status_code == 404


class TestTreasuryAPI:
    """Test treasury endpoints."""
    
    def test_treasury_stats(self, client, sample_donations):
        response = client.get("/api/v1/treasury/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_balance" in data
        assert "total_donations" in data
        assert "total_allocated" in data


class TestExportAPI:
    """Test export functionality."""
    
    def test_export_donations_csv(self, client, sample_donations):
        response = client.get("/api/v1/export/donations?format=csv")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
    
    def test_export_donations_json(self, client, sample_donations):
        response = client.get("/api/v1/export/donations?format=json")
        assert response.status_code == 200
        data = response.json()
        assert "donations" in data
        assert "export_info" in data
    
    def test_export_voting_results(self, client):
        response = client.get("/api/v1/export/voting-results?format=csv")
        assert response.status_code == 200
    
    def test_comprehensive_report(self, client, sample_projects, sample_donations):
        response = client.get("/api/v1/export/comprehensive-report?format=json")
        assert response.status_code == 200
        data = response.json()
        assert "metadata" in data
        assert "projects" in data
        assert "treasury" in data


class TestReportsAPI:
    """Test analytics and reporting endpoints."""
    
    def test_overview_stats(self, client, sample_projects):
        response = client.get("/api/v1/stats/overview")
        assert response.status_code == 200
        data = response.json()
        assert "treasury" in data
        assert "projects" in data
    
    def test_project_analytics(self, client, sample_projects):
        response = client.get("/api/v1/reports/project-analytics")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "by_status" in data
        assert "funding_progress" in data
    
    def test_project_analytics_with_category(self, client, sample_projects):
        response = client.get("/api/v1/reports/project-analytics?category=healthcare")
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "healthcare"
    
    def test_voting_analytics(self, client):
        response = client.get("/api/v1/reports/voting-analytics")
        assert response.status_code == 200
        data = response.json()
        assert "participation_metrics" in data
    
    def test_treasury_analytics(self, client, sample_donations):
        response = client.get("/api/v1/reports/treasury-analytics")
        assert response.status_code == 200
        data = response.json()
        assert "treasury_overview" in data
        assert "flow_analysis" in data


class TestPrivacyAPI:
    """Test privacy and k-anonymity features."""
    
    def test_privacy_report(self, client, sample_donations):
        response = client.get("/api/v1/privacy/report?data_type=donations")
        assert response.status_code == 200
        data = response.json()
        # Should have some privacy protection data
        assert isinstance(data, dict)
    
    def test_privacy_report_invalid_type(self, client):
        response = client.get("/api/v1/privacy/report?data_type=invalid")
        assert response.status_code == 400


class TestAdminAPI:
    """Test admin endpoints."""
    
    def test_indexer_status(self, client):
        response = client.get("/api/v1/admin/indexer/status")
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "contracts" in data
    
    @patch('app.routes.indexer.force_reindex')
    def test_reindex_blockchain(self, mock_reindex, client):
        mock_reindex.return_value = AsyncMock()
        response = client.post("/api/v1/admin/indexer/reindex")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"


class TestValidation:
    """Test input validation and error handling."""
    
    def test_invalid_project_id(self, client):
        response = client.get("/api/v1/projects/")
        assert response.status_code in [404, 422]
    
    def test_invalid_pagination_params(self, client):
        response = client.get("/api/v1/projects?limit=-1")
        assert response.status_code == 422
        
        response = client.get("/api/v1/projects?offset=-1")
        assert response.status_code == 422
    
    def test_invalid_export_format(self, client):
        response = client.get("/api/v1/export/donations?format=invalid")
        # Should default to CSV or return error
        assert response.status_code in [200, 400]


class TestCommitRevealVoting:
    """Test commit-reveal voting functionality."""
    
    def test_commit_vote_endpoint(self, client):
        commit_data = {
            "hash": "0x1234567890abcdef",
            "projects": ["project1", "project2"],
            "choices": [3, 2]  # For, Against
        }
        response = client.post("/api/v1/votes/1/commit", json=commit_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["phase"] == "commit"
    
    def test_reveal_vote_endpoint(self, client):
        reveal_data = {
            "projects": ["project1", "project2"],
            "choices": [3, 2],  # For, Against
            "salt": "mysecretSalt123"
        }
        response = client.post("/api/v1/votes/1/reveal", json=reveal_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["phase"] == "reveal"


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_nonexistent_endpoints(self, client):
        response = client.get("/api/v1/nonexistent")
        assert response.status_code == 404
    
    def test_method_not_allowed(self, client):
        response = client.post("/api/v1/projects")
        assert response.status_code == 405
    
    def test_invalid_json(self, client):
        response = client.post(
            "/api/v1/votes/1/commit",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


class TestPerformance:
    """Test performance and limits."""
    
    def test_large_pagination_limit(self, client, sample_projects):
        response = client.get("/api/v1/projects?limit=1000")
        assert response.status_code == 200
        # Should respect maximum limit
        data = response.json()
        assert len(data) <= 1000
    
    def test_export_limit_enforcement(self, client, sample_donations):
        response = client.get("/api/v1/export/donations?limit=50000")
        # Should either respect max limit or return error
        assert response.status_code in [200, 403]


@pytest.mark.asyncio
class TestAsyncFunctionality:
    """Test async functionality and database operations."""
    
    async def test_async_database_operations(self, db_session):
        # Test that async operations work correctly
        project = Project(
            id="async_test_project",
            name="Async Test",
            description="Testing async operations",
            target=10.0,
            soft_cap=5.0,
            hard_cap=15.0,
            category="test",
            status="active",
            priority=1,
            soft_cap_enabled=True
        )
        
        db_session.add(project)
        db_session.commit()
        
        # Verify the project was created
        retrieved = db_session.query(Project).filter(Project.id == "async_test_project").first()
        assert retrieved is not None
        assert retrieved.name == "Async Test"


class TestIntegration:
    """Integration tests for complete workflows."""
    
    def test_donation_to_export_workflow(self, client, sample_projects, sample_members):
        """Test complete workflow from project creation to export."""
        # 1. Verify projects exist
        response = client.get("/api/v1/projects")
        assert response.status_code == 200
        projects = response.json()
        assert len(projects) >= 1
        
        # 2. Get user stats
        user_address = sample_members[0].address
        response = client.get(f"/api/v1/me/stats?user_address={user_address}")
        assert response.status_code == 200
        
        # 3. Export donations
        response = client.get("/api/v1/export/donations?format=json")
        assert response.status_code == 200
        export_data = response.json()
        assert "donations" in export_data
        
        # 4. Generate comprehensive report
        response = client.get("/api/v1/export/comprehensive-report")
        assert response.status_code == 200
    
    def test_voting_workflow(self, client):
        """Test complete voting workflow."""
        # 1. Get current round
        response = client.get("/api/v1/votes/current-round")
        assert response.status_code == 200
        
        # 2. Commit vote (simulated)
        commit_data = {"hash": "0xtest", "projects": ["project1"], "choices": [3]}
        response = client.post("/api/v1/votes/1/commit", json=commit_data)
        assert response.status_code == 200
        
        # 3. Reveal vote (simulated)
        reveal_data = {"projects": ["project1"], "choices": [3], "salt": "test"}
        response = client.post("/api/v1/votes/1/reveal", json=reveal_data)
        assert response.status_code == 200
        
        # 4. Get voting results
        response = client.get("/api/v1/votes/priority/summary")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])