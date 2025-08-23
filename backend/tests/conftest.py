"""
Test configuration and fixtures for FundChain backend tests
"""

import pytest
import os
import tempfile
from unittest.mock import Mock, patch

# Test configuration
@pytest.fixture(scope="session", autouse=True)
def configure_test_environment():
    """Configure test environment variables."""
    os.environ.update({
        "ENVIRONMENT": "testing",
        "DEBUG": "true",
        "DATABASE_URL": "sqlite:///./test.db",
        "K_ANONYMITY_THRESHOLD": "3",
        "MAX_EXPORT_RECORDS": "1000",
        "SECRET_KEY": "test-secret-key",
        "RPC_URL": "http://localhost:8545",
        "INDEXER_ENABLED": "false"  # Disable indexer for tests
    })


@pytest.fixture
def mock_web3():
    """Mock Web3 instance for blockchain tests."""
    with patch('app.indexer.Web3') as mock:
        mock_instance = Mock()
        mock_instance.eth.get_block.return_value = {"timestamp": 1640995200}
        mock_instance.eth.contract.return_value = Mock()
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def temp_database():
    """Create temporary database for isolated tests."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as temp_file:
        db_path = temp_file.name
    
    yield f"sqlite:///{db_path}"
    
    # Cleanup
    try:
        os.unlink(db_path)
    except:
        pass


@pytest.fixture
def mock_privacy_filter():
    """Mock privacy filter for testing without actual filtering."""
    with patch('app.api.privacy_filter') as mock:
        mock.filter_donations.return_value = []
        mock.filter_allocations.return_value = []
        mock.validate_export_request.return_value = {
            "allowed": True,
            "max_allowed_records": 1000,
            "reason": ""
        }
        mock.get_anonymity_report.return_value = {
            "k_threshold": 5,
            "status": "protected"
        }
        yield mock


# Test data factories
def create_test_project(project_id="test_project", **kwargs):
    """Factory for creating test projects."""
    defaults = {
        "name": "Test Project",
        "description": "Test Description",
        "target": 10.0,
        "soft_cap": 5.0,
        "hard_cap": 15.0,
        "category": "test",
        "status": "active",
        "priority": 1,
        "soft_cap_enabled": True,
        "total_allocated": 0.0,
        "total_paid_out": 0.0
    }
    defaults.update(kwargs)
    
    from app.models import Project
    return Project(id=project_id, **defaults)


def create_test_member(address="0x1234567890123456789012345678901234567890", **kwargs):
    """Factory for creating test members."""
    defaults = {
        "total_donated": 5.0,
        "weight": 5,
        "has_token": True
    }
    defaults.update(kwargs)
    
    from app.models import Member
    return Member(address=address, **defaults)


def create_test_donation(receipt_id="test_receipt", **kwargs):
    """Factory for creating test donations."""
    defaults = {
        "donor_address": "0x1234567890123456789012345678901234567890",
        "amount": 5.0,
        "tx_hash": "0xtest_hash",
        "block_number": 1000
    }
    defaults.update(kwargs)
    
    from app.models import Donation
    return Donation(receipt_id=receipt_id, **defaults)


# Test utilities
class TestUtils:
    """Utility functions for tests."""
    
    @staticmethod
    def assert_api_response(response, expected_status=200):
        """Assert API response has expected status and structure."""
        assert response.status_code == expected_status
        if expected_status == 200:
            assert response.headers.get("content-type", "").startswith("application/json")
    
    @staticmethod
    def assert_privacy_protected(data):
        """Assert that data is properly privacy protected."""
        # Check for k-anonymity compliance
        if isinstance(data, list) and len(data) > 0:
            # Should not have easily identifiable patterns
            assert len(data) >= 3  # Minimum k-anonymity
    
    @staticmethod
    def assert_export_format(response, format_type="csv"):
        """Assert export response has correct format."""
        if format_type == "csv":
            assert "text/csv" in response.headers.get("content-type", "")
        elif format_type == "json":
            assert "application/json" in response.headers.get("content-type", "")
            data = response.json()
            assert "export_info" in data


# Test markers
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.slow = pytest.mark.slow
pytest.mark.privacy = pytest.mark.privacy


# Custom assertions
def assert_valid_project_response(project_data):
    """Assert project response has all required fields."""
    required_fields = [
        "id", "name", "description", "target", "soft_cap", 
        "hard_cap", "status", "category", "total_allocated"
    ]
    for field in required_fields:
        assert field in project_data, f"Missing field: {field}"


def assert_valid_donation_response(donation_data):
    """Assert donation response has all required fields."""
    required_fields = [
        "receipt_id", "donor_address", "amount", "timestamp", "tx_hash"
    ]
    for field in required_fields:
        assert field in donation_data, f"Missing field: {field}"


def assert_valid_vote_response(vote_data):
    """Assert vote response has all required fields."""
    required_fields = [
        "project_id", "for_weight", "against_weight", 
        "abstained_count", "not_participating_count", "turnout_percentage"
    ]
    for field in required_fields:
        assert field in vote_data, f"Missing field: {field}"