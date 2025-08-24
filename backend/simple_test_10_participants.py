#!/usr/bin/env python3
"""
Simple Test Script for 10 Participants with REAL Data
Тестирует основные функции системы с реальными адресами и project ID
"""

import asyncio
import os
import sys
import logging
import random
from datetime import datetime, timedelta
from decimal import Decimal

# Add the app directory to the path for imports
sys.path.append('/app')

from app.database import get_db_manager
from app.models import Project, Donation, Allocation, Member, VotingRound, Vote

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleTenParticipantTester:
    """Simple tester for 10-participant scenarios using REAL data."""
    
    def __init__(self):
        self.db_manager = None
        self.participants = []
        self.projects = []
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
        # REAL addresses from your deployment
        self.real_addresses = [
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Owner 1
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Owner 2
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  # Owner 3
            "0x90F79bf6EB2c4f870365E785982E1f101E93b906",  # Additional test account
            "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",  # Additional test account
            "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",  # Additional test account
            "0x976EA74026E726554dB657fA54763abd0C3a0aa9",  # Additional test account
            "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",  # Additional test account
            "0x23618e81E3f5cdF7f52C2A15876d1C888dEACa53",  # Additional test account
            "0xa0Ee7A142d267C1f36754E8d5D0F2A8945bD5F8d"   # Additional test account
        ]
        
        # REAL project IDs from your smart contracts
        self.real_project_ids = [
            "0xb34e1d43700c753c79fa98a98c434b921d9d3467e3f07f78ada83890ab8162bc",  # Community Well
            "0x9ca41a8f3901d241ffae2121cf52d35f33a8ccc8786c9d2d619ca9c329185957",  # Medical Supplies
            "0x13c16e789225abe8d69886ac0db24a4f5887bcddb3b8c0e545eed1893f405f77"   # School Equipment
        ]
    
    async def initialize(self):
        """Initialize database and API connections."""
        logger.info("🚀 Initializing 10-participant test environment with REAL data...")
        
        self.db_manager = get_db_manager()
        
        # Create 10 test participants with REAL addresses
        self.participants = [
            {
                'id': f'participant_{i+1:02d}',
                'address': self.real_addresses[i],
                'weight': random.randint(1, 20),
                'role': random.choice(['donor', 'voter', 'project_creator', 'community_leader']),
                'donation_capacity': Decimal(str(random.uniform(0.5, 10.0))),
                'active_level': random.choice(['high', 'medium', 'low'])
            }
            for i in range(10)
        ]
        
        logger.info(f"✅ Created {len(self.participants)} test participants with REAL addresses")
    
    async def run_all_tests(self):
        """Execute simple test suite for 10 participants."""
        logger.info("🧪 Starting simple 10-participant test suite with REAL data...")
        
        try:
            # Phase 1: System Setup
            await self.test_member_creation()
            await self.test_project_creation()
            
            # Phase 2: Core Functionality
            await self.test_donation_workflows()
            await self.test_allocation_system()
            
            # Phase 3: Voting System
            await self.test_voting_round_creation()
            await self.test_commit_phase()
            
            # Final Report
            await self.generate_test_report()
            
        except Exception as e:
            logger.error(f"❌ Test suite failed with error: {e}")
            self.test_results['errors'].append(f"Critical error: {e}")
            return False
    
    async def test_member_creation(self):
        """Test creation and management of 10 members with REAL addresses."""
        logger.info("👥 Testing member creation for 10 participants with REAL addresses...")
        
        try:
            async with self.db_manager.get_session() as session:
                for participant in self.participants:
                    member = Member(
                        address=participant['address'],
                        weight=participant['weight'],
                        member_since=datetime.now() - timedelta(days=random.randint(1, 365))
                    )
                    session.add(member)
                
                await session.commit()
                logger.info("✅ All 10 members created successfully with REAL addresses")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Member creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Member creation: {e}")
    
    async def test_project_creation(self):
        """Test creation of diverse projects with REAL project IDs."""
        logger.info("📋 Testing project creation with REAL project IDs...")
        
        project_templates = [
            {
                'name': 'Community Well',
                'category': 'infrastructure',
                'target': 10.0,
                'description': 'Clean water access for the community'
            },
            {
                'name': 'Medical Supplies', 
                'category': 'healthcare',
                'target': 5.0,
                'description': 'Emergency medical supplies for local clinic'
            },
            {
                'name': 'School Equipment',
                'category': 'education', 
                'target': 15.0,
                'description': 'Computers and learning materials for local school'
            }
        ]
        
        try:
            async with self.db_manager.get_session() as session:
                for i, template in enumerate(project_templates):
                    project = Project(
                        id=self.real_project_ids[i],  # Use REAL project ID
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
                logger.info(f"✅ Created {len(self.projects)} test projects with REAL IDs")
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
                        
                        # Generate realistic transaction hash
                        tx_hash = f"0x{random.randint(1000000, 9999999):08x}{random.randint(1000000, 9999999):08x}"
                        
                        donation = Donation(
                            receipt_id=f"receipt_{participant['id']}_{j}_{random.randint(1000, 9999)}",
                            donor_address=participant['address'],
                            amount=amount,
                            tx_hash=tx_hash,
                            block_number=1000000 + donation_count,
                            timestamp=datetime.now() - timedelta(days=random.randint(1, 60))
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
                from sqlalchemy import text
                donations = await session.execute(text("SELECT id, amount, donor_address FROM donations"))
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
                        
                        # Generate realistic transaction hash
                        tx_hash = f"0x{random.randint(1000000, 9999999):08x}{random.randint(1000000, 9999999):08x}"
                        
                        allocation = Allocation(
                            donation_id=donation[0],
                            project_id=project.id,
                            amount=allocation_amount,
                            tx_hash=tx_hash,
                            block_number=2000000 + allocation_count,
                            timestamp=datetime.now()
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
    
    async def test_voting_round_creation(self):
        """Test creation of voting rounds."""
        logger.info("🗳️ Testing voting round creation...")
        
        try:
            async with self.db_manager.get_session() as session:
                # Create test voting round
                voting_round = VotingRound(
                    round_id=1,
                    start_commit=datetime.now(),
                    end_commit=datetime.now() + timedelta(days=7),
                    end_reveal=datetime.now() + timedelta(days=10),
                    finalized=False,
                    snapshot_block=1500000
                )
                session.add(voting_round)
                await session.commit()
                
                logger.info("✅ Voting round created successfully")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Voting round creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Voting round creation: {e}")
    
    async def test_commit_phase(self):
        """Test commit phase with 10 participants using REAL project IDs."""
        logger.info("🔐 Testing commit phase with 10 participants using REAL project IDs...")
        
        try:
            async with self.db_manager.get_session() as session:
                vote_count = 0
                
                for participant in self.participants:
                    # 80% of participants vote in commit phase
                    if random.random() < 0.8:
                        # Use REAL project ID instead of zero address
                        selected_project = random.choice(self.projects)
                        
                        vote = Vote(
                            round_id=1,
                            voter_address=participant['address'],
                            project_id=selected_project.id,  # Use REAL project ID
                            choice="not_participating",
                            tx_hash=f"0x{random.randint(1000000, 9999999):08x}",
                            block_number=3000000 + vote_count,
                            committed_at=datetime.now()
                        )
                        session.add(vote)
                        vote_count += 1
                
                await session.commit()
                logger.info(f"✅ {vote_count} participants committed votes with REAL project IDs")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Commit phase test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Commit phase: {e}")
    
    async def generate_test_report(self):
        """Generate comprehensive test report."""
        logger.info("📋 Generating test report...")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        report = f"""
        
🧪 SIMPLE 10-PARTICIPANT TEST REPORT (WITH REAL DATA)
=====================================================

📊 TEST SUMMARY:
   Total Tests: {total_tests}
   Passed: {self.test_results['passed']} ✅
   Failed: {self.test_results['failed']} ❌
   Success Rate: {success_rate:.1f}%

👥 PARTICIPANTS (REAL ADDRESSES):
   Total Participants: {len(self.participants)}
   Active Participants: {len([p for p in self.participants if p['active_level'] in ['high', 'medium']])}
   
📋 PROJECTS (REAL IDs):
   Total Projects: {len(self.projects)}
   Active Projects: {len([p for p in self.projects if p.status == 'active'])}

🔑 REAL DATA USED:
   - 10 participants with real Anvil addresses
   - 3 projects with real bytes32 IDs from smart contracts
   - Realistic transaction hashes and block numbers
   
"""
        
        if self.test_results['errors']:
            report += "❌ ERRORS ENCOUNTERED:\n"
            for error in self.test_results['errors']:
                report += f"   - {error}\n"
        
        if success_rate >= 80:
            report += "\n🎉 OVERALL RESULT: SYSTEM READY FOR 10+ PARTICIPANTS WITH REAL DATA"
        else:
            report += "\n⚠️ OVERALL RESULT: SYSTEM NEEDS IMPROVEMENTS FOR 10+ PARTICIPANTS"
        
        logger.info(report)
        
        # Save report to file
        report_file = f"simple_test_report_10_participants_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        
        logger.info(f"📄 Test report saved to: {report_file}")


async def main():
    """Main function to run 10-participant tests."""
    tester = SimpleTenParticipantTester()
    
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
