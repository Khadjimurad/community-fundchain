#!/usr/bin/env python3
"""
Demo Data Seeding Script for FundChain
Creates realistic sample data for development and testing purposes
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
import random
import logging

# Add the app directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_manager, DatabaseManager
from app.models import Project, Donation, Allocation, Member, VotingRound, Vote, Payout

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DemoDataSeeder:
    """Comprehensive demo data seeder for FundChain development environment."""
    
    def __init__(self):
        self.db_manager = None
        self.projects = []
        self.members = []
        self.donations = []
        self.allocations = []
        self.voting_rounds = []
        self.votes = []
        self.payouts = []
    
    async def initialize(self):
        """Initialize database connection and create tables."""
        self.db_manager = get_db_manager()
        # Reset database first to ensure clean state
        await self.db_manager.reset_database()
        await self.db_manager.create_tables()
        logger.info("Database tables created successfully")
    
    async def seed_all_data(self):
        """Seed all demo data in the correct order."""
        logger.info("Starting demo data seeding process...")
        
        await self.create_sample_projects()
        await self.create_sample_members()
        await self.create_sample_donations()
        await self.create_sample_allocations()
        await self.create_sample_voting_rounds()
        await self.create_sample_votes()
        await self.create_sample_payouts()
        
        logger.info("Demo data seeding completed successfully!")
    
    async def create_sample_projects(self):
        """Create diverse sample projects across different categories."""
        logger.info("Creating sample projects...")
        
        project_templates = [
            {
                "name": "Community Health Clinic",
                "description": "Modern healthcare facility to serve the local community with state-of-the-art equipment and experienced medical staff. The clinic will provide primary care, preventive services, and emergency care.",
                "category": "healthcare",
                "target": Decimal("50.0"),
                "soft_cap": Decimal("30.0"),
                "hard_cap": Decimal("75.0"),
                "priority": 1
            },
            {
                "name": "Digital Learning Center",
                "description": "A comprehensive educational facility equipped with modern computers, high-speed internet, and digital learning platforms to bridge the digital divide in education.",
                "category": "education",
                "target": Decimal("35.0"),
                "soft_cap": Decimal("20.0"),
                "hard_cap": Decimal("50.0"),
                "priority": 2
            },
            {
                "name": "Renewable Energy Grid",
                "description": "Solar panel installation and battery storage system to provide clean, sustainable energy to the community while reducing carbon footprint and energy costs.",
                "category": "infrastructure",
                "target": Decimal("80.0"),
                "soft_cap": Decimal("50.0"),
                "hard_cap": Decimal("120.0"),
                "priority": 3
            },
            {
                "name": "Homeless Shelter & Support Services",
                "description": "Comprehensive shelter facility with social services, job training, mental health support, and rehabilitation programs to help individuals transition to permanent housing.",
                "category": "social",
                "target": Decimal("45.0"),
                "soft_cap": Decimal("25.0"),
                "hard_cap": Decimal("65.0"),
                "priority": 4
            },
            {
                "name": "Urban Farming Initiative",
                "description": "Vertical farming facility using hydroponic systems to provide fresh, locally-grown produce year-round while creating educational opportunities and jobs.",
                "category": "environment",
                "target": Decimal("25.0"),
                "soft_cap": Decimal("15.0"),
                "hard_cap": Decimal("35.0"),
                "priority": 5
            },
            {
                "name": "Emergency Response System",
                "description": "Advanced emergency communication and response network including alert systems, emergency equipment, and training programs for community safety.",
                "category": "infrastructure",
                "target": Decimal("60.0"),
                "soft_cap": Decimal("40.0"),
                "hard_cap": Decimal("85.0"),
                "priority": 6
            },
            {
                "name": "Youth Arts & Culture Center",
                "description": "Creative space for young people to explore arts, music, theater, and cultural activities with professional instruction and performance opportunities.",
                "category": "culture",
                "target": Decimal("30.0"),
                "soft_cap": Decimal("18.0"),
                "hard_cap": Decimal("45.0"),
                "priority": 7
            },
            {
                "name": "Senior Care Facility Renovation",
                "description": "Complete renovation of existing senior care facility to meet modern accessibility standards and provide enhanced comfort and care for elderly residents.",
                "category": "healthcare",
                "target": Decimal("55.0"),
                "soft_cap": Decimal("35.0"),
                "hard_cap": Decimal("75.0"),
                "priority": 8
            }
        ]
        
        base_time = datetime.now()
        
        for i, template in enumerate(project_templates):
            # Generate unique project ID
            project_id = f"demo_project_{i+1:03d}_{template['name'].lower().replace(' ', '_')}"
            
            # Randomize some funding amounts within realistic ranges
            funding_multiplier = random.uniform(0.1, 0.8)
            total_allocated = template["target"] * Decimal(str(funding_multiplier))
            
            # Set status based on funding progress
            if total_allocated >= template["target"]:
                status = "funded"
            elif total_allocated >= template["soft_cap"]:
                status = "active"
            elif total_allocated > 0:
                status = "active"
            else:
                status = "pending"
            
            # Set deadline (some projects have deadlines, others don't)
            deadline = None
            if random.choice([True, False]):
                deadline = base_time + timedelta(days=random.randint(30, 180))
            
            project = Project(
                id=project_id,
                name=template["name"],
                description=template["description"],
                target=float(template["target"]),
                soft_cap=float(template["soft_cap"]),
                hard_cap=float(template["hard_cap"]),
                total_allocated=float(total_allocated),
                category=template["category"],
                status=status,
                priority=template["priority"],
                deadline=deadline,
                soft_cap_enabled=True,  # Enable soft cap functionality
                created_at=base_time - timedelta(days=random.randint(1, 60))
            )
            
            self.projects.append(project)
            async with self.db_manager.get_session() as session:
                session.add(project)
                await session.commit()
        
        logger.info(f"Created {len(self.projects)} sample projects")
    
    async def create_sample_members(self):
        """Create diverse community members with different SBT weights."""
        logger.info("Creating sample community members...")
        
        member_templates = [
            {"address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b", "weight": 15, "role": "major_donor"},
            {"address": "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c", "weight": 8, "role": "active_member"},
            {"address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d", "weight": 12, "role": "community_leader"},
            {"address": "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e", "weight": 5, "role": "regular_member"},
            {"address": "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f", "weight": 20, "role": "institutional_donor"},
            {"address": "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a", "weight": 3, "role": "new_member"},
            {"address": "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b", "weight": 9, "role": "volunteer"},
            {"address": "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c", "weight": 14, "role": "board_member"},
            {"address": "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d", "weight": 6, "role": "supporter"},
            {"address": "0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9", "weight": 11, "role": "advocate"}
        ]
        
        base_time = datetime.now()
        
        for i, template in enumerate(member_templates):
            # Calculate total donations based on weight
            total_donated = template["weight"] * random.uniform(1.5, 3.0)
            
            member = Member(
                address=template["address"],
                weight=template["weight"],
                total_donated=total_donated,
                has_token=True  # Assume all demo members have tokens
            )
            
            self.members.append(member)
            async with self.db_manager.get_session() as session:
                session.add(member)
                await session.commit()
        
        logger.info(f"Created {len(self.members)} sample community members")
    
    async def create_sample_donations(self):
        """Create realistic donation history."""
        logger.info("Creating sample donations...")
        
        base_time = datetime.now()
        donation_count = 0
        
        for member in self.members:
            # Each member makes 2-8 donations
            num_donations = random.randint(2, 8)
            
            for i in range(num_donations):
                # Generate realistic donation amounts
                if member.weight > 15:
                    amount = random.uniform(2.0, 8.0)
                elif member.weight > 10:
                    amount = random.uniform(1.0, 5.0)
                else:
                    amount = random.uniform(0.1, 2.0)
                
                # Generate transaction hash
                tx_hash = f"0x{''.join(random.choices('0123456789abcdef', k=64))}"
                
                donation = Donation(
                    donor_address=member.address,
                    amount=amount,
                    tx_hash=tx_hash,
                    block_number=random.randint(18000000, 19000000),
                    timestamp=base_time - timedelta(days=random.randint(1, 300)),
                    receipt_id=f"receipt_{donation_count+1:06d}"
                )
                
                self.donations.append(donation)
                donation_count += 1
                
                async with self.db_manager.get_session() as session:
                    session.add(donation)
                    await session.commit()
        
        logger.info(f"Created {donation_count} sample donations")
    
    async def create_sample_allocations(self):
        """Create allocation history linking donations to projects."""
        logger.info("Creating sample allocations...")
        
        allocation_count = 0
        
        for donation in self.donations:
            # 80% of donations are allocated, some immediately, some later
            if random.random() < 0.8:
                # Select 1-3 projects to allocate to
                num_allocations = random.randint(1, min(3, len(self.projects)))
                selected_projects = random.sample(self.projects, num_allocations)
                
                remaining_amount = donation.amount
                
                for i, project in enumerate(selected_projects):
                    if i == len(selected_projects) - 1:
                        # Last allocation gets remaining amount
                        allocation_amount = remaining_amount
                    else:
                        # Split randomly
                        max_amount = remaining_amount * 0.8
                        allocation_amount = random.uniform(0.1, max_amount)
                        remaining_amount -= allocation_amount
                    
                    allocation = Allocation(
                        donor_address=donation.donor_address,
                        project_id=project.id,
                        donation_id=donation.id,
                        amount=allocation_amount,
                        allocation_type="direct",
                        timestamp=donation.timestamp + timedelta(minutes=random.randint(1, 1440)),
                        tx_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                        block_number=donation.block_number + random.randint(1, 10)
                    )
                    
                    self.allocations.append(allocation)
                    allocation_count += 1
                    
                    async with self.db_manager.get_session() as session:
                        session.add(allocation)
                        await session.commit()
        
        logger.info(f"Created {allocation_count} sample allocations")
    
    async def create_sample_voting_rounds(self):
        """Create voting rounds with realistic timing."""
        logger.info("Creating sample voting rounds...")
        
        base_time = datetime.now()
        
        # Create 3 voting rounds: one completed, one in progress, one upcoming
        voting_rounds_data = [
            {
                "round_id": 1,
                "status": "finalized",
                "start_time": base_time - timedelta(days=45),
                "end_commit": base_time - timedelta(days=38),
                "end_reveal": base_time - timedelta(days=35),
                "counting_method": "weighted",
                "projects": self.projects[:4]
            },
            {
                "round_id": 2,
                "status": "reveal",
                "start_time": base_time - timedelta(days=7),
                "end_commit": base_time - timedelta(days=3),
                "end_reveal": base_time + timedelta(days=2),
                "counting_method": "weighted",
                "projects": self.projects[2:6]
            },
            {
                "round_id": 3,
                "status": "pending",
                "start_time": base_time + timedelta(days=7),
                "end_commit": base_time + timedelta(days=14),
                "end_reveal": base_time + timedelta(days=17),
                "counting_method": "borda",
                "projects": self.projects[4:8]
            }
        ]
        
        for round_data in voting_rounds_data:
            # Determine if finalized based on status
            is_finalized = round_data["status"] == "finalized"
            
            voting_round = VotingRound(
                round_id=round_data["round_id"],
                start_commit=round_data["start_time"],
                end_commit=round_data["end_commit"],
                end_reveal=round_data["end_reveal"],
                finalized=is_finalized,
                counting_method=round_data["counting_method"],
                total_participants=len(self.members),
                total_revealed=random.randint(5, len(self.members)) if round_data["status"] in ["reveal", "finalized"] else 0,
                total_active_members=len(self.members),
                auto_cancellation_enabled=True,
                cancellation_threshold=51,
                snapshot_block=random.randint(18500000, 19000000)
            )
            
            self.voting_rounds.append(voting_round)
            async with self.db_manager.get_session() as session:
                session.add(voting_round)
                await session.commit()
        
        logger.info(f"Created {len(self.voting_rounds)} sample voting rounds")
    
    async def create_sample_votes(self):
        """Create realistic voting history."""
        logger.info("Creating sample votes...")
        
        vote_count = 0
        
        for voting_round in self.voting_rounds:
            # Check if this round should have votes (finalized or past end_reveal)
            current_time = datetime.now()
            should_have_votes = voting_round.finalized or voting_round.end_reveal < current_time
            
            if should_have_votes:
                # Create votes for revealed rounds
                participating_members = random.sample(self.members, voting_round.total_revealed)
                
                for member in participating_members:
                    # Vote on the first few projects for simplicity
                    projects_to_vote_on = self.projects[:4]  # Vote on first 4 projects
                    
                    for project in projects_to_vote_on:
                        # Generate realistic vote choices
                        choices = ["for", "against", "abstain", "not_participating"]
                        weights = [0.4, 0.2, 0.3, 0.1]  # More likely to vote "for"
                        choice = random.choices(choices, weights=weights)[0]
                        
                        vote = Vote(
                            round_id=voting_round.round_id,
                            voter_address=member.address,
                            project_id=project.id,
                            choice=choice,
                            weight=member.weight,
                            committed_at=voting_round.start_commit + timedelta(hours=random.randint(1, 168)),
                            revealed_at=voting_round.end_commit + timedelta(hours=random.randint(1, 72)),
                            tx_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                            block_number=random.randint(18500000, 19000000)
                        )
                        
                        self.votes.append(vote)
                        vote_count += 1
                        
                        async with self.db_manager.get_session() as session:
                            session.add(vote)
                            await session.commit()
        
        logger.info(f"Created {vote_count} sample votes")
    
    async def create_sample_payouts(self):
        """Create payout history for funded projects."""
        logger.info("Creating sample payouts...")
        
        base_time = datetime.now()
        payout_count = 0
        
        funded_projects = [p for p in self.projects if p.status == "funded"]
        
        for project in funded_projects:
            # Each funded project has 1-3 payouts
            num_payouts = random.randint(1, 3)
            remaining_amount = project.total_allocated
            
            for i in range(num_payouts):
                if i == num_payouts - 1:
                    # Last payout gets remaining amount
                    payout_amount = remaining_amount
                else:
                    # Split the amount
                    payout_amount = remaining_amount * Decimal(str(random.uniform(0.3, 0.6)))
                    remaining_amount -= payout_amount
                
                payout = Payout(
                    project_id=project.id,
                    amount=payout_amount,
                    recipient_address=f"0x{''.join(random.choices('0123456789abcdef', k=40))}",
                    transaction_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                    block_number=random.randint(18500000, 19000000),
                    timestamp=base_time - timedelta(days=random.randint(1, 30)),
                    purpose=f"Funding disbursement #{i+1} for {project.name}",
                    milestone=f"Milestone {i+1}",
                    approved_by="multisig_wallet"
                )
                
                self.payouts.append(payout)
                payout_count += 1
                
                async with self.db_manager.get_session() as session:
                    session.add(payout)
                    await session.commit()
        
        logger.info(f"Created {payout_count} sample payouts")
    
    async def print_summary(self):
        """Print a summary of created demo data."""
        logger.info("\n" + "="*50)
        logger.info("DEMO DATA SUMMARY")
        logger.info("="*50)
        logger.info(f"Projects: {len(self.projects)}")
        logger.info(f"Members: {len(self.members)}")
        logger.info(f"Donations: {len(self.donations)}")
        logger.info(f"Allocations: {len(self.allocations)}")
        logger.info(f"Voting Rounds: {len(self.voting_rounds)}")
        logger.info(f"Votes: {len(self.votes)}")
        logger.info(f"Payouts: {len(self.payouts)}")
        
        total_donated = sum(d.amount for d in self.donations)
        total_allocated = sum(a.amount for a in self.allocations)
        total_paid_out = sum(p.amount for p in self.payouts)
        
        logger.info(f"\nFinancial Summary:")
        logger.info(f"Total Donated: {total_donated:.4f} ETH")
        logger.info(f"Total Allocated: {total_allocated:.4f} ETH")
        logger.info(f"Total Paid Out: {total_paid_out:.4f} ETH")
        logger.info(f"Allocation Rate: {(total_allocated/total_donated*100):.1f}%")
        
        logger.info(f"\nProject Status Breakdown:")
        status_counts = {}
        for project in self.projects:
            status_counts[project.status] = status_counts.get(project.status, 0) + 1
        
        for status, count in status_counts.items():
            logger.info(f"  {status}: {count} projects")
        
        logger.info("="*50)


async def main():
    """Main function to run the demo data seeding."""
    seeder = DemoDataSeeder()
    
    try:
        await seeder.initialize()
        await seeder.seed_all_data()
        await seeder.print_summary()
        
        logger.info("Demo data seeding completed successfully!")
        logger.info("You can now start the backend server and explore the data.")
        
    except Exception as e:
        logger.error(f"Error during demo data seeding: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())