from typing import List, Dict, Any, Optional, Set
from collections import defaultdict, Counter
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

from .models import Donation, Allocation, Member, Project

logger = logging.getLogger(__name__)

@dataclass
class AnonymityMetrics:
    """Metrics for anonymity assessment."""
    unique_count: int
    group_size: int
    k_anonymity_level: int
    is_safe: bool

class PrivacyFilter:
    """
    Privacy protection and k-anonymity filtering for API responses.
    
    Implements k-anonymity protection where k is the minimum group size
    required before data can be made public.
    """
    
    def __init__(self, k_threshold: int = 5):
        self.k_threshold = k_threshold
        self.anonymity_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
    def filter_donations(self, donations: List[Donation]) -> List[Donation]:
        """Filter donations list to maintain k-anonymity."""
        if len(donations) < self.k_threshold:
            logger.warning(f"Donation list too small for k-anonymity: {len(donations)} < {self.k_threshold}")
            return []
        
        # Group by amount ranges to ensure k-anonymity
        amount_groups = self._group_by_amount_ranges([d.amount for d in donations])
        safe_donations = []
        
        for donation in donations:
            amount_range = self._get_amount_range(donation.amount)
            if amount_groups[amount_range] >= self.k_threshold:
                # Create anonymized copy
                safe_donation = self._anonymize_donation(donation)
                safe_donations.append(safe_donation)
        
        return safe_donations
    
    def filter_allocations(self, allocations: List[Allocation]) -> List[Allocation]:
        """Filter allocations list to maintain k-anonymity."""
        if len(allocations) < self.k_threshold:
            return []
        
        # Group by project and amount to ensure k-anonymity
        project_groups = defaultdict(list)
        for allocation in allocations:
            project_groups[allocation.project_id].append(allocation)
        
        safe_allocations = []
        for project_id, project_allocations in project_groups.items():
            if len(project_allocations) >= self.k_threshold:
                # Further filter by amount ranges within project
                amount_groups = self._group_by_amount_ranges([a.amount for a in project_allocations])
                
                for allocation in project_allocations:
                    amount_range = self._get_amount_range(allocation.amount)
                    if amount_groups[amount_range] >= self.k_threshold:
                        safe_allocation = self._anonymize_allocation(allocation)
                        safe_allocations.append(safe_allocation)
        
        return safe_allocations
    
    def check_query_safety(self, query_params: Dict[str, Any]) -> bool:
        """Check if a query is safe from privacy perspective."""
        
        # Queries that specify exact donor addresses are not safe for public
        if query_params.get('donor_address'):
            return False
        
        # Queries that are too specific might compromise privacy
        specificity_score = 0
        if query_params.get('project_id'):
            specificity_score += 1
        if query_params.get('amount_min') and query_params.get('amount_max'):
            range_size = query_params['amount_max'] - query_params['amount_min']
            if range_size < 1.0:  # Very narrow amount range
                specificity_score += 2
        if query_params.get('time_range') and query_params['time_range'] < 24:  # Less than 24 hours
            specificity_score += 1
        
        # If query is too specific, it might not be safe
        return specificity_score < 3
    
    def get_safe_aggregates(self, data: List[Dict[str, Any]], group_by: str) -> Dict[str, Any]:
        """Get aggregated statistics that maintain privacy."""
        
        groups = defaultdict(list)
        for item in data:
            key = item.get(group_by, 'unknown')
            groups[key].append(item)
        
        safe_aggregates = {}
        for key, items in groups.items():
            if len(items) >= self.k_threshold:
                safe_aggregates[key] = {
                    'count': len(items),
                    'total_amount': sum(item.get('amount', 0) for item in items),
                    'avg_amount': sum(item.get('amount', 0) for item in items) / len(items),
                    'min_amount': min(item.get('amount', 0) for item in items),
                    'max_amount': max(item.get('amount', 0) for item in items)
                }
            else:
                # Suppress groups that are too small
                logger.debug(f"Suppressing group {key} with {len(items)} items")
        
        return safe_aggregates
    
    def apply_differential_privacy_noise(self, value: float, sensitivity: float = 1.0, epsilon: float = 1.0) -> float:
        """Apply differential privacy noise to a numeric value."""
        import random
        import math
        
        # Laplace mechanism for differential privacy
        scale = sensitivity / epsilon
        noise = random.laplace(0, scale)
        
        return max(0, value + noise)  # Ensure non-negative
    
    def get_anonymity_report(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate anonymity assessment report for a dataset."""
        
        if not data:
            return {
                'status': 'no_data',
                'k_anonymity_level': 0,
                'is_safe': False,
                'total_records': 0
            }
        
        # Analyze different grouping strategies
        groupings = {
            'amount_range': self._analyze_amount_grouping([item.get('amount', 0) for item in data]),
            'time_period': self._analyze_temporal_grouping([item.get('timestamp') for item in data if item.get('timestamp')]),
            'overall': len(data)
        }
        
        min_group_size = min([g['min_group_size'] for g in groupings.values() if isinstance(g, dict)])
        k_anonymity_level = min_group_size if min_group_size != float('inf') else len(data)
        
        return {
            'status': 'analyzed',
            'k_anonymity_level': k_anonymity_level,
            'is_safe': k_anonymity_level >= self.k_threshold,
            'total_records': len(data),
            'groupings': groupings,
            'privacy_risk': 'low' if k_anonymity_level >= self.k_threshold else 'high',
            'recommended_suppression': max(0, self.k_threshold - k_anonymity_level)
        }
    
    def filter_member_list(self, members: List[Member], include_weights: bool = False) -> List[Dict[str, Any]]:
        """Filter member list for public display."""
        
        if len(members) < self.k_threshold:
            return []
        
        # Group members by weight ranges
        if include_weights:
            weight_groups = self._group_by_weight_ranges([m.weight for m in members])
            
            safe_members = []
            for member in members:
                weight_range = self._get_weight_range(member.weight)
                if weight_groups[weight_range] >= self.k_threshold:
                    safe_members.append({
                        'weight_range': weight_range,
                        'member_since': member.member_since,
                        'has_token': member.has_token
                    })
            
            return safe_members
        else:
            # Just return count and basic stats
            return [{
                'total_members': len(members),
                'avg_weight': sum(m.weight for m in members) / len(members),
                'members_with_tokens': sum(1 for m in members if m.has_token)
            }]
    
    def _anonymize_donation(self, donation: Donation) -> Donation:
        """Create anonymized copy of donation."""
        # Create a copy without sensitive information
        anonymized = Donation(
            id=0,  # Remove ID
            receipt_id="***",  # Mask receipt ID
            donor_address="***",  # Mask donor address
            amount=self._round_to_range(donation.amount),  # Round amount to range
            timestamp=self._round_timestamp(donation.timestamp),  # Round timestamp
            tx_hash="***",  # Mask transaction hash
            block_number=0  # Remove block number
        )
        return anonymized
    
    def _anonymize_allocation(self, allocation: Allocation) -> Allocation:
        """Create anonymized copy of allocation."""
        anonymized = Allocation(
            id=0,
            project_id=allocation.project_id,  # Keep project ID
            donor_address="***",  # Mask donor address
            amount=self._round_to_range(allocation.amount),
            timestamp=self._round_timestamp(allocation.timestamp),
            allocation_type=allocation.allocation_type,  # Keep type
            tx_hash="***",
            block_number=0
        )
        return anonymized
    
    def _group_by_amount_ranges(self, amounts: List[float]) -> Dict[str, int]:
        """Group amounts into ranges and count group sizes."""
        groups = defaultdict(int)
        for amount in amounts:
            range_key = self._get_amount_range(amount)
            groups[range_key] += 1
        return dict(groups)
    
    def _group_by_weight_ranges(self, weights: List[int]) -> Dict[str, int]:
        """Group weights into ranges and count group sizes."""
        groups = defaultdict(int)
        for weight in weights:
            range_key = self._get_weight_range(weight)
            groups[range_key] += 1
        return dict(groups)
    
    def _get_amount_range(self, amount: float) -> str:
        """Get amount range bucket for a given amount."""
        if amount < 0.1:
            return "0.0-0.1"
        elif amount < 0.5:
            return "0.1-0.5"
        elif amount < 1.0:
            return "0.5-1.0"
        elif amount < 5.0:
            return "1.0-5.0"
        elif amount < 10.0:
            return "5.0-10.0"
        elif amount < 50.0:
            return "10.0-50.0"
        else:
            return "50.0+"
    
    def _get_weight_range(self, weight: int) -> str:
        """Get weight range bucket for a given weight."""
        if weight == 1:
            return "1"
        elif weight <= 5:
            return "2-5"
        elif weight <= 10:
            return "6-10"
        elif weight <= 25:
            return "11-25"
        elif weight <= 50:
            return "26-50"
        else:
            return "51+"
    
    def _round_to_range(self, amount: float) -> float:
        """Round amount to range midpoint."""
        range_key = self._get_amount_range(amount)
        
        range_midpoints = {
            "0.0-0.1": 0.05,
            "0.1-0.5": 0.3,
            "0.5-1.0": 0.75,
            "1.0-5.0": 3.0,
            "5.0-10.0": 7.5,
            "10.0-50.0": 30.0,
            "50.0+": 75.0
        }
        
        return range_midpoints.get(range_key, amount)
    
    def _round_timestamp(self, timestamp: datetime, hours: int = 1) -> datetime:
        """Round timestamp to nearest hour/day."""
        if hours >= 24:
            # Round to day
            return timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            # Round to hour
            return timestamp.replace(minute=0, second=0, microsecond=0)
    
    def _analyze_amount_grouping(self, amounts: List[float]) -> Dict[str, Any]:
        """Analyze k-anonymity for amount-based grouping."""
        if not amounts:
            return {'min_group_size': 0, 'status': 'no_data'}
        
        groups = self._group_by_amount_ranges(amounts)
        min_group_size = min(groups.values()) if groups else 0
        
        return {
            'min_group_size': min_group_size,
            'max_group_size': max(groups.values()) if groups else 0,
            'group_count': len(groups),
            'groups': groups
        }
    
    def _analyze_temporal_grouping(self, timestamps: List[datetime]) -> Dict[str, Any]:
        """Analyze k-anonymity for time-based grouping."""
        if not timestamps:
            return {'min_group_size': 0, 'status': 'no_data'}
        
        # Group by day
        day_groups = defaultdict(int)
        for ts in timestamps:
            if ts:
                day_key = ts.strftime('%Y-%m-%d')
                day_groups[day_key] += 1
        
        min_group_size = min(day_groups.values()) if day_groups else 0
        
        return {
            'min_group_size': min_group_size,
            'max_group_size': max(day_groups.values()) if day_groups else 0,
            'group_count': len(day_groups),
            'groups': dict(day_groups)
        }
    
    def validate_export_request(self, record_count: int, user_context: Optional[str] = None) -> Dict[str, Any]:
        """Validate export request for privacy compliance."""
        
        validation_result = {
            'allowed': False,
            'reason': '',
            'max_allowed_records': 0,
            'recommendations': []
        }
        
        # Check if request is for personal data (allowed)
        if user_context == 'personal':
            validation_result['allowed'] = True
            validation_result['max_allowed_records'] = record_count
            return validation_result
        
        # For public/aggregate data, apply k-anonymity rules
        if record_count < self.k_threshold:
            validation_result['reason'] = f'Record count {record_count} below k-anonymity threshold {self.k_threshold}'
            validation_result['recommendations'].append('Request more general/aggregated data')
            return validation_result
        
        # Check maximum export limits
        max_export = 10000  # Could be configurable
        if record_count > max_export:
            validation_result['reason'] = f'Record count {record_count} exceeds maximum export limit {max_export}'
            validation_result['max_allowed_records'] = max_export
            validation_result['recommendations'].append('Use pagination or filters to reduce dataset size')
            return validation_result
        
        validation_result['allowed'] = True
        validation_result['max_allowed_records'] = record_count
        return validation_result
    
    def get_privacy_safe_summary(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate privacy-safe summary statistics."""
        
        if len(data) < self.k_threshold:
            return {
                'status': 'insufficient_data',
                'message': f'Insufficient data for privacy-safe aggregation (minimum {self.k_threshold} records required)',
                'available_records': len(data)
            }
        
        # Calculate safe aggregates
        amounts = [item.get('amount', 0) for item in data if 'amount' in item]
        
        summary = {
            'status': 'success',
            'total_records': len(data),
            'amount_statistics': {
                'count': len(amounts),
                'total': sum(amounts),
                'average': sum(amounts) / len(amounts) if amounts else 0,
                'median': sorted(amounts)[len(amounts)//2] if amounts else 0
            } if amounts else None,
            'privacy_level': f'{self.k_threshold}-anonymous',
            'data_ranges': self._get_safe_ranges(amounts) if amounts else None
        }
        
        return summary
    
    def _get_safe_ranges(self, amounts: List[float]) -> Dict[str, Any]:
        """Get safe data ranges without revealing exact values."""
        if not amounts:
            return {}
        
        sorted_amounts = sorted(amounts)
        
        return {
            'min_range': self._get_amount_range(sorted_amounts[0]),
            'max_range': self._get_amount_range(sorted_amounts[-1]),
            'quartiles': {
                'q1_range': self._get_amount_range(sorted_amounts[len(sorted_amounts)//4]),
                'q3_range': self._get_amount_range(sorted_amounts[3*len(sorted_amounts)//4])
            }
        }

# Global privacy filter instance
privacy_filter = PrivacyFilter()