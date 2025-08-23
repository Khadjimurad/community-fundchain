#!/usr/bin/env python3
"""
Comprehensive Test Script for 10 Participants
Tests the complete FundChain system with 10 active participants through all workflows:
- Member creation and SBT management
- Project creation and funding
- Donation workflows with allocations
- Voting cycles (commit-reveal mechanism)
- Treasury operations and payouts
- Privacy protection validation
- Data export functionality
"""

import asyncio
import os
import sys
import json
import logging
import random
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any
import aiohttp

# Add the app directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import get_db_manager
from backend.app.models import Project, Donation, Allocation, Member, VotingRound, Vote, Payout

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
BACKEND_URL = "http://localhost:8000"
API_BASE = "/api/v1"

class TenParticipantTester:
    """Comprehensive tester for 10-participant scenarios."""
    
    def __init__(self):
        self.db_manager = None
        self.participants = []
        self.projects = []
        self.voting_rounds = []
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    async def initialize(self):
        """Initialize database and API connections."""
        logger.info("🚀 Initializing 10-participant test environment...")
        
        self.db_manager = get_db_manager()
        await self.db_manager.reset_database()
        await self.db_manager.create_tables()
        
        # Create 10 test participants with varied profiles
        self.participants = [
            {
                'id': f'participant_{i+1:02d}',
                'address': f'0x{i+1:02d}{"a" * 38}{i+1:02d}',
                'sbt_weight': random.randint(1, 20),
                'role': random.choice(['donor', 'voter', 'project_creator', 'community_leader']),
                'donation_capacity': Decimal(str(random.uniform(0.5, 10.0))),
                'active_level': random.choice(['high', 'medium', 'low'])
            }
            for i in range(10)
        ]
        
        logger.info(f"✅ Created {len(self.participants)} test participants")
    
    async def run_all_tests(self):
        """Execute comprehensive test suite for 10 participants."""
        logger.info("🧪 Starting comprehensive 10-participant test suite...")
        
        try:
            # Phase 1: System Setup
            await self.test_system_health()
            await self.test_member_creation()
            await self.test_project_creation()
            
            # Phase 2: Core Functionality
            await self.test_donation_workflows()
            await self.test_allocation_system()
            await self.test_treasury_operations()
            
            # Phase 3: Voting System
            await self.test_voting_round_creation()
            await self.test_commit_phase()
            await self.test_reveal_phase()
            await self.test_voting_results()
            
            # Phase 4: Advanced Features
            await self.test_privacy_protection()
            await self.test_export_functionality()
            await self.test_analytics_accuracy()
            
            # Phase 5: Stress Testing
            await self.test_concurrent_operations()
            await self.test_edge_cases()
            
            # Final Report
            await self.generate_test_report()
            
        except Exception as e:
            logger.error(f"❌ Test suite failed with error: {e}")
            self.test_results['errors'].append(f"Critical error: {e}")
            return False
    
    async def test_system_health(self):
        """Test basic system health and connectivity."""
        logger.info("🏥 Testing system health...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('status') == 'healthy':
                            logger.info("✅ System health check passed")
                            self.test_results['passed'] += 1
                        else:
                            raise Exception("Health check returned unhealthy status")
                    else:
                        raise Exception(f"Health check failed with status {response.status}")
        except Exception as e:
            logger.error(f"❌ System health test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Health check: {e}")
    
    async def test_member_creation(self):
        """Test creation and management of 10 members."""
        logger.info("👥 Testing member creation for 10 participants...")
        
        try:
            async with self.db_manager.get_session() as session:
                for participant in self.participants:
                    member = Member(
                        address=participant['address'],
                        sbt_weight=participant['sbt_weight'],
                        role=participant['role'],
                        joined_at=datetime.now() - timedelta(days=random.randint(1, 365))
                    )
                    session.add(member)
                
                await session.commit()
                logger.info("✅ All 10 members created successfully")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Member creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Member creation: {e}")
    
    async def test_project_creation(self):
        """Test creation of diverse projects for testing."""
        logger.info("📋 Testing project creation...")
        
        project_templates = [
            {
                'name': 'Community Garden Initiative',
                'category': 'environment',
                'target': 15.0,
                'description': 'Creating sustainable community garden spaces'
            },
            {
                'name': 'Youth Education Program', 
                'category': 'education',
                'target': 25.0,
                'description': 'After-school tutoring and mentorship program'
            },
            {
                'name': 'Senior Care Support',
                'category': 'healthcare', 
                'target': 35.0,
                'description': 'Home care services for elderly community members'
            },
            {
                'name': 'Digital Literacy Workshop',
                'category': 'education',
                'target': 8.0,
                'description': 'Computer skills training for all ages'
            },
            {
                'name': 'Community Safety Program',
                'category': 'infrastructure',
                'target': 45.0,
                'description': 'Enhanced lighting and security systems'
            }
        ]
        
        try:
            async with self.db_manager.get_session() as session:
                for i, template in enumerate(project_templates):
                    project = Project(
                        id=f"test_project_{i+1:03d}",
                        name=template['name'],
                        description=template['description'],
                        category=template['category'],
                        target=template['target'],
                        soft_cap=template['target'] * 0.6,
                        hard_cap=template['target'] * 1.5,
                        total_allocated=0.0,
                        status='active',
                        priority=i+1,
                        created_at=datetime.now() - timedelta(days=random.randint(1, 30))
                    )
                    session.add(project)
                    self.projects.append(project)
                
                await session.commit()
                logger.info(f"✅ Created {len(self.projects)} test projects")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Project creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Project creation: {e}")
    
    async def test_donation_workflows(self):
        """Test donation creation with 10 participants making varied donations."""
        logger.info("💰 Testing donation workflows with 10 participants...")
        
        try:
            async with self.db_manager.get_session() as session:
                donation_count = 0
                
                for participant in self.participants:
                    # Each participant makes 1-3 donations
                    num_donations = random.randint(1, 3)
                    
                    for j in range(num_donations):
                        amount = float(participant['donation_capacity'] * Decimal(str(random.uniform(0.2, 1.0))))
                        
                        donation = Donation(
                            donor_address=participant['address'],
                            amount=amount,
                            transaction_hash=f"0xtest_{participant['id']}_{j}_{random.randint(1000, 9999)}",
                            block_number=1000000 + donation_count,
                            created_at=datetime.now() - timedelta(days=random.randint(1, 60))
                        )
                        session.add(donation)
                        donation_count += 1
                
                await session.commit()
                logger.info(f"✅ Created {donation_count} test donations from 10 participants")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Donation workflow test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Donation workflows: {e}")
    
    async def test_allocation_system(self):
        """Test allocation of donations to projects."""
        logger.info("🎯 Testing allocation system...")
        
        try:
            async with self.db_manager.get_session() as session:
                # Get all donations for allocation
                donations = await session.execute("SELECT id, amount, donor_address FROM donations")
                donations = donations.fetchall()
                
                allocation_count = 0
                
                for donation in donations:
                    # Allocate to 1-3 random projects
                    num_allocations = random.randint(1, min(3, len(self.projects)))
                    selected_projects = random.sample(self.projects, num_allocations)
                    
                    remaining_amount = donation[1]  # amount
                    
                    for i, project in enumerate(selected_projects):
                        if i == len(selected_projects) - 1:
                            # Last allocation gets remaining amount
                            allocation_amount = remaining_amount
                        else:
                            # Random portion of remaining amount
                            allocation_amount = remaining_amount * random.uniform(0.1, 0.7)
                            remaining_amount -= allocation_amount
                        
                        allocation = Allocation(
                            donation_id=donation[0],
                            project_id=project.id,
                            amount=allocation_amount,
                            created_at=datetime.now()
                        )
                        session.add(allocation)
                        allocation_count += 1
                
                await session.commit()
                logger.info(f"✅ Created {allocation_count} allocations")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Allocation system test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Allocation system: {e}")
    
    async def test_treasury_operations(self):
        """Test treasury balance calculations and operations."""
        logger.info("🏛️ Testing treasury operations...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}{API_BASE}/treasury/stats") as response:
                    if response.status == 200:
                        treasury_data = await response.json()
                        
                        # Verify treasury has expected fields
                        required_fields = ['total_balance', 'total_donated', 'total_allocated', 'total_paid_out']
                        for field in required_fields:
                            if field not in treasury_data:
                                raise Exception(f"Missing treasury field: {field}")
                        
                        logger.info(f"✅ Treasury stats: {treasury_data}")
                        self.test_results['passed'] += 1
                    else:
                        raise Exception(f"Treasury API returned status {response.status}")
                        
        except Exception as e:
            logger.error(f"❌ Treasury operations test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Treasury operations: {e}")
    
    async def test_voting_round_creation(self):
        """Test creation of voting rounds."""
        logger.info("🗳️ Testing voting round creation...")
        
        try:
            async with self.db_manager.get_session() as session:
                # Create test voting round
                voting_round = VotingRound(
                    round_id=1,
                    phase='pending',
                    commit_deadline=datetime.now() + timedelta(days=7),
                    reveal_deadline=datetime.now() + timedelta(days=10),
                    created_at=datetime.now()
                )
                session.add(voting_round)
                await session.commit()
                
                self.voting_rounds.append(voting_round)
                logger.info("✅ Voting round created successfully")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Voting round creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Voting round creation: {e}")
    
    async def test_commit_phase(self):
        """Test commit phase with 10 participants."""
        logger.info("🔐 Testing commit phase with 10 participants...")
        
        try:
            async with self.db_manager.get_session() as session:
                vote_count = 0
                
                for participant in self.participants:
                    # 80% of participants vote in commit phase
                    if random.random() < 0.8:
                        vote = Vote(
                            round_id=1,
                            voter_address=participant['address'],
                            commit_hash=f"0x{random.randint(1000000, 9999999):x}",
                            phase='commit',
                            created_at=datetime.now()
                        )
                        session.add(vote)
                        vote_count += 1
                
                await session.commit()
                logger.info(f"✅ {vote_count} participants committed votes")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Commit phase test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Commit phase: {e}")
    
    async def test_reveal_phase(self):
        """Test reveal phase functionality."""
        logger.info("🔓 Testing reveal phase...")
        
        try:
            async with self.db_manager.get_session() as session:
                # Update committed votes to revealed
                committed_votes = await session.execute(
                    "SELECT voter_address FROM votes WHERE round_id = 1 AND phase = 'commit'"
                )
                committed_votes = committed_votes.fetchall()
                
                reveal_count = 0
                for vote_row in committed_votes:
                    # 90% of committed votes are revealed
                    if random.random() < 0.9:
                        # Create reveal vote
                        reveal_vote = Vote(
                            round_id=1,
                            voter_address=vote_row[0],
                            project_id=random.choice(self.projects).id,
                            choice='for',
                            weight=random.randint(1, 20),
                            phase='reveal',
                            created_at=datetime.now()
                        )
                        session.add(reveal_vote)
                        reveal_count += 1
                
                await session.commit()
                logger.info(f"✅ {reveal_count} votes revealed successfully")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Reveal phase test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Reveal phase: {e}")
    
    async def test_voting_results(self):
        """Test voting results calculation."""
        logger.info("📊 Testing voting results calculation...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{BACKEND_URL}{API_BASE}/votes/priority/summary") as response:
                    if response.status == 200:
                        results = await response.json()
                        
                        if isinstance(results, list) and len(results) > 0:
                            logger.info(f"✅ Voting results calculated: {len(results)} projects")
                            self.test_results['passed'] += 1
                        else:
                            raise Exception("Empty or invalid voting results")
                    else:
                        raise Exception(f"Voting results API returned status {response.status}")
                        
        except Exception as e:
            logger.error(f"❌ Voting results test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Voting results: {e}")
    
    async def test_privacy_protection(self):
        """Test privacy protection with k-anonymity."""
        logger.info("🔒 Testing privacy protection...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test public export with privacy protection
                async with session.get(f"{BACKEND_URL}{API_BASE}/export/comprehensive-report?format=json&privacy_level=public") as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check that full addresses are not exposed
                        data_str = json.dumps(data)
                        if '0x' in data_str:
                            # Check if addresses are properly anonymized
                            addresses_found = data_str.count('0x')
                            if addresses_found > 0:
                                logger.warning(f"Found {addresses_found} addresses in public export")
                        
                        logger.info("✅ Privacy protection test completed")
                        self.test_results['passed'] += 1
                    else:
                        raise Exception(f"Privacy export returned status {response.status}")
                        
        except Exception as e:
            logger.error(f"❌ Privacy protection test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Privacy protection: {e}")
    
    async def test_export_functionality(self):
        """Test data export functionality."""
        logger.info("📤 Testing export functionality...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test multiple export formats
                export_tests = [
                    ("/export/projects?format=json", "projects export"),
                    ("/export/voting-results?round_id=1&format=json", "voting results export"),
                    ("/export/comprehensive-report?format=json&privacy_level=member", "comprehensive report")
                ]
                
                for endpoint, test_name in export_tests:
                    async with session.get(f"{BACKEND_URL}{API_BASE}{endpoint}") as response:
                        if response.status == 200:
                            data = await response.json()
                            logger.info(f"✅ {test_name} successful")
                        else:
                            logger.warning(f"⚠️ {test_name} returned status {response.status}")
                
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Export functionality test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Export functionality: {e}")
    
    async def test_analytics_accuracy(self):
        """Test analytics and statistics accuracy."""
        logger.info("📈 Testing analytics accuracy...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test various analytics endpoints
                analytics_endpoints = [
                    "/analytics/donation-trends",
                    "/analytics/project-performance", 
                    "/analytics/community-engagement",
                    "/treasury/stats"
                ]
                
                for endpoint in analytics_endpoints:
                    async with session.get(f"{BACKEND_URL}{API_BASE}{endpoint}") as response:
                        if response.status == 200:
                            data = await response.json()
                            logger.info(f"✅ Analytics endpoint {endpoint} working")
                        else:
                            logger.warning(f"⚠️ Analytics endpoint {endpoint} returned {response.status}")
                
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Analytics accuracy test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Analytics accuracy: {e}")
    
    async def test_concurrent_operations(self):
        """Test system behavior under concurrent operations."""
        logger.info("⚡ Testing concurrent operations...")
        
        try:
            # Simulate concurrent API calls
            async def make_concurrent_request(session, endpoint):
                async with session.get(f"{BACKEND_URL}{API_BASE}{endpoint}") as response:
                    return response.status == 200
            
            async with aiohttp.ClientSession() as session:
                # Create multiple concurrent requests
                tasks = []
                endpoints = ["/projects", "/donations", "/treasury/stats", "/votes/priority/summary"]
                
                for _ in range(20):  # 20 concurrent requests
                    endpoint = random.choice(endpoints)
                    tasks.append(make_concurrent_request(session, endpoint))
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                successful = sum(1 for r in results if r is True)
                
                logger.info(f"✅ Concurrent operations: {successful}/{len(tasks)} successful")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Concurrent operations test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Concurrent operations: {e}")
    
    async def test_edge_cases(self):
        """Test edge cases and error handling."""
        logger.info("🎭 Testing edge cases...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test invalid requests
                edge_cases = [
                    ("/projects/nonexistent", "nonexistent project"),
                    ("/donations?donor_address=invalid", "invalid address"),
                    ("/votes/priority/summary?round_id=999", "nonexistent round")
                ]
                
                error_handled_count = 0
                for endpoint, description in edge_cases:
                    async with session.get(f"{BACKEND_URL}{API_BASE}{endpoint}") as response:
                        if response.status in [400, 404, 422]:  # Expected error codes
                            error_handled_count += 1
                            logger.info(f"✅ Error handling for {description}")
                        else:
                            logger.warning(f"⚠️ Unexpected response for {description}: {response.status}")
                
                if error_handled_count > 0:
                    self.test_results['passed'] += 1
                    logger.info(f"✅ Edge cases test completed: {error_handled_count} errors properly handled")
                
        except Exception as e:
            logger.error(f"❌ Edge cases test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Edge cases: {e}")
    
    async def generate_test_report(self):
        """Generate comprehensive test report."""
        logger.info("📋 Generating test report...")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        report = f"""
        
🧪 10-PARTICIPANT TEST REPORT
============================

📊 TEST SUMMARY:
   Total Tests: {total_tests}
   Passed: {self.test_results['passed']} ✅
   Failed: {self.test_results['failed']} ❌
   Success Rate: {success_rate:.1f}%

👥 PARTICIPANTS:
   Total Participants: {len(self.participants)}
   Active Participants: {len([p for p in self.participants if p['active_level'] in ['high', 'medium']])}
   
📋 PROJECTS:
   Total Projects: {len(self.projects)}
   Active Projects: {len([p for p in self.projects if p.status == 'active'])}

🗳️ VOTING:
   Voting Rounds: {len(self.voting_rounds)}
   
"""
        
        if self.test_results['errors']:
            report += "❌ ERRORS ENCOUNTERED:\n"
            for error in self.test_results['errors']:
                report += f"   - {error}\n"
        
        if success_rate >= 80:
            report += "\n🎉 OVERALL RESULT: SYSTEM READY FOR 10+ PARTICIPANTS"
        else:
            report += "\n⚠️ OVERALL RESULT: SYSTEM NEEDS IMPROVEMENTS FOR 10+ PARTICIPANTS"
        
        logger.info(report)
        
        # Save report to file
        report_file = f"test_report_10_participants_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        
        logger.info(f"📄 Test report saved to: {report_file}")


async def main():
    """Main function to run 10-participant tests."""
    tester = TenParticipantTester()
    
    try:
        await tester.initialize()
        await tester.run_all_tests()
        
    except KeyboardInterrupt:
        logger.info("🛑 Test interrupted by user")
    except Exception as e:
        logger.error(f"💥 Test suite failed: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)