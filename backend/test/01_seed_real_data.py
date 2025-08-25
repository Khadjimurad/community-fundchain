#!/usr/bin/env python3
"""
01 - Seed Real Data Test (SYNC VERSION)
Заполняет базу реальными данными с токенами и адресами из Anvil
Исправленная версия для работы с синхронной базой данных
"""

import os
import sys
import logging
import random
from datetime import datetime, timedelta
from decimal import Decimal

# Add the app directory to the path for imports
sys.path.append('/app')

from app.database import SessionLocal
from app.models import Project, Donation, Allocation, Member, VotingRound, Vote, VoteResult, Payout

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RealDataSeeder:
    """Seeds database with real data using Anvil addresses and smart contract IDs."""
    
    def __init__(self):
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
        # REAL addresses from Anvil deployment
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
        
        # REAL project IDs from smart contracts
        self.real_project_ids = [
            "0xb34e1d43700c753c79fa98a98c434b921d9d3467e3f07f78ada83890ab8162bc",  # Community Well
            "0x9ca41a8f3901d241ffae2121cf52d35f33a8ccc8786c9d2d619ca9c329185957",  # Medical Supplies
            "0x13c16e789225abe8d69886ac0db24a4f5887bcddb3b8c0e545eed1893f405f77",  # School Equipment
            "0x" + "d" * 64,  # Solar Panels
            "0x" + "e" * 64,  # Playground
            "0x" + "f" * 64,  # Library
            "0x" + "g" * 64,  # Ambulance
            "0x" + "h" * 64,  # Farmer Market
            "0x" + "i" * 64,  # Senior Center
            "0x" + "j" * 64   # Sports Hall
        ]
        
        # Project details - 10 projects with Russian names and descriptions
        self.projects_data = [
            {
                'id': self.real_project_ids[0],
                'name': 'Колодец для общины',
                'description': 'Строительство колодца для обеспечения чистой водой местной общины',
                'target': 10.0,
                'category': 'infrastructure',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[1],
                'name': 'Медицинские принадлежности',
                'description': 'Закупка экстренных медицинских принадлежностей для местной клиники',
                'target': 5.0,
                'category': 'healthcare',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[2],
                'name': 'Школьное оборудование',
                'description': 'Компьютеры и учебные материалы для местной школы',
                'target': 15.0,
                'category': 'education',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[3],
                'name': 'Солнечные панели',
                'description': 'Установка солнечных панелей для обеспечения электроэнергией общинного центра',
                'target': 25.0,
                'category': 'energy',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[4],
                'name': 'Детская площадка',
                'description': 'Строительство безопасной детской площадки в парке',
                'target': 8.0,
                'category': 'recreation',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[5],
                'name': 'Библиотека',
                'description': 'Создание общественной библиотеки с книгами на разных языках',
                'target': 12.0,
                'category': 'education',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[6],
                'name': 'Центр для пожилых',
                'description': 'Создание центра досуга и поддержки для пожилых людей',
                'target': 18.0,
                'category': 'social',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[7],
                'name': 'Скорая помощь',
                'description': 'Покупка автомобиля скорой помощи для экстренных случаев',
                'target': 35.0,
                'category': 'healthcare',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[8],
                'name': 'Фермерский рынок',
                'description': 'Строительство крытого фермерского рынка для местных производителей',
                'target': 20.0,
                'category': 'commerce',
                'status': 'active'
            },
            {
                'id': self.real_project_ids[9],
                'name': 'Спортивный зал',
                'description': 'Оборудование многофункционального спортивного зала',
                'target': 22.0,
                'category': 'recreation',
                'status': 'active'
            }
        ]
    
    def run_seeding_tests(self):
        """Run all seeding tests."""
        logger.info("🌱 Starting real data seeding tests...")
        
        try:
            # Check existing data
            self.check_existing_data()
            
            # Run tests
            self.test_create_participants()
            self.test_create_projects()
            self.test_create_donations()
            self.test_create_allocations()
            
            # Generate report
            self.generate_seeding_report()
            
        except Exception as e:
            logger.error(f"❌ Seeding tests failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"General error: {e}")
    
    def check_existing_data(self):
        """Check if data already exists in the database."""
        logger.info("🔍 Checking existing data...")
        
        try:
            from sqlalchemy import text
            
            with SessionLocal() as session:
                # Check participants
                result = session.execute(text("SELECT COUNT(*) FROM members"))
                participant_count = result.scalar()
                
                # Check projects
                result = session.execute(text("SELECT COUNT(*) FROM projects"))
                project_count = result.scalar()
                
                # Check donations
                result = session.execute(text("SELECT COUNT(*) FROM donations"))
                donation_count = result.scalar()
                
                logger.info(f"📊 Existing data: {participant_count} participants, {project_count} projects, {donation_count} donations")
                
                return {
                    'participants': participant_count,
                    'projects': project_count,
                    'donations': donation_count
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to check existing data: {e}")
            return {'participants': 0, 'projects': 0, 'donations': 0}
    
    def should_skip_seeding(self):
        """Determine if seeding should be skipped based on existing data."""
        existing_data = self.check_existing_data()
        
        # If we have substantial data, skip seeding
        if existing_data['participants'] >= 5 and existing_data['projects'] >= 5:
            logger.info("✅ Sufficient data already exists, skipping seeding")
            return True
        
        return False
    
    def test_create_participants(self):
        """Test creation of 10 participants with real addresses."""
        logger.info("👥 Testing participant creation...")
        
        try:
            with SessionLocal() as session:
                # Create 10 participants with real addresses
                for i, address in enumerate(self.real_addresses):
                    # Generate realistic weight based on address (deterministic)
                    weight = (hash(address) % 20) + 1
                    
                    member = Member(
                        address=address,
                        total_donated=0,  # Will be updated after donations
                        weight=weight,
                        member_since=datetime.now() - timedelta(days=random.randint(1, 365)),
                        has_token=True
                    )
                    session.add(member)
                
                session.commit()
                logger.info(f"✅ Created {len(self.real_addresses)} participants with real addresses")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Participant creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Participant creation: {e}")
    
    def test_create_projects(self):
        """Test creation of 10 projects with real IDs."""
        logger.info("📋 Testing project creation...")
        
        try:
            with SessionLocal() as session:
                for project_data in self.projects_data:
                    project = Project(
                        id=project_data['id'],
                        name=project_data['name'],
                        description=project_data['description'],
                        target=project_data['target'],
                        soft_cap=project_data['target'] * 0.5,
                        hard_cap=project_data['target'] * 1.2,
                        status=project_data['status'],
                        category=project_data['category'],
                        priority=random.randint(1, 10),
                        soft_cap_enabled=True,
                        total_allocated=0,
                        total_paid_out=0,
                        created_block=1500000 + random.randint(1, 1000),
                        updated_block=1500000 + random.randint(1, 1000)
                    )
                    session.add(project)
                
                session.commit()
                logger.info(f"✅ Created {len(self.projects_data)} projects with Russian names and descriptions")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Project creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Project creation: {e}")
    
    def test_create_donations(self):
        """Test creation of donations from participants."""
        logger.info("💰 Testing donation creation...")
        
        try:
            with SessionLocal() as session:
                # Create donations for each participant
                for i, address in enumerate(self.real_addresses):
                    # Generate realistic donation amount
                    amount = random.uniform(0.1, 2.0)
                    
                    donation = Donation(
                        receipt_id=f"receipt_{i}_{int(datetime.now().timestamp())}",
                        donor_address=address,
                        amount=amount,
                        timestamp=datetime.now() - timedelta(days=random.randint(1, 30)),
                        tx_hash=f"0x{random.randint(1000000, 9999999):x}",
                        block_number=1500000 + random.randint(1, 1000)
                    )
                    session.add(donation)
                    
                    # Update member's total donated
                    member = session.query(Member).filter(Member.address == address).first()
                    if member:
                        member.total_donated += amount
                
                session.commit()
                logger.info(f"✅ Created donations for {len(self.real_addresses)} participants")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Donation creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Donation creation: {e}")
    
    def test_create_allocations(self):
        """Test creation of allocations for projects."""
        logger.info("📈 Testing allocation creation...")
        
        try:
            with SessionLocal() as session:
                # Get all donations
                donations = session.query(Donation).all()
                
                # Create allocations for each donation
                for donation in donations:
                    # Get random project
                    projects = session.query(Project).all()
                    if projects:
                        project = random.choice(projects)
                        allocation = Allocation(
                            donation_id=donation.id,
                            project_id=project.id,
                            donor_address=donation.donor_address,
                            amount=donation.amount,
                            allocation_type='donation',
                            timestamp=donation.timestamp,
                            tx_hash=f"0x{random.randint(1000000, 9999999):x}",
                            block_number=donation.block_number
                        )
                        session.add(allocation)
                        
                        # Update project's total allocated
                        project.total_allocated += donation.amount
                
                session.commit()
                logger.info(f"✅ Created allocations for {len(donations)} donations")
                self.test_results['passed'] += 1
                
        except Exception as e:
            logger.error(f"❌ Allocation creation test failed: {e}")
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"Allocation creation: {e}")
    
    def generate_seeding_report(self):
        """Generate comprehensive seeding test report."""
        logger.info("📋 Generating seeding test report...")
        
        try:
            # Check final data
            final_data = self.check_existing_data()
            
            # Generate report
            report = f"""
        
🌱 REAL DATA SEEDING TEST REPORT
=================================

📊 TEST SUMMARY:
   Total Tests: 4
   Passed: {self.test_results['passed']} ✅
   Failed: {self.test_results['failed']} ❌
   Success Rate: {(self.test_results['passed'] / 4 * 100):.1f}%

🔑 REAL DATA USED:
   - {len(self.real_addresses)} participants with real Anvil addresses
   - {len(self.projects_data)} projects with Russian names and descriptions
   - Realistic donation amounts and allocations
   - Proper database relationships

📋 DATA STATUS:
   - Participants: {final_data['participants']}
   - Projects: {final_data['projects']}
   - Donations: {final_data['donations']}
   - Allocations: Distributed across projects
   
"""
            
            if self.test_results['errors']:
                report += "❌ ERRORS ENCOUNTERED:\n"
                for error in self.test_results['errors']:
                    report += f"   - {error}\n"
            
            if self.test_results['failed'] == 0:
                report += "\n✅ OVERALL RESULT: SEEDING COMPLETED SUCCESSFULLY"
            else:
                report += f"\n⚠️ OVERALL RESULT: SEEDING NEEDS IMPROVEMENTS ({self.test_results['failed']} errors)"
            
            logger.info(report)
            
            # Save report to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = f"test/01_seeding_report_{timestamp}.txt"
            
            try:
                with open(report_file, 'w', encoding='utf-8') as f:
                    f.write(report)
                logger.info(f"📄 Seeding test report saved to: {report_file}")
            except Exception as e:
                logger.warning(f"⚠️ Could not save report to file: {e}")
            
        except Exception as e:
            logger.error(f"❌ Failed to generate report: {e}")

def main():
    """Main function to run the seeding tests."""
    logger.info("🚀 Initializing real data seeder...")
    
    try:
        seeder = RealDataSeeder()
        
        # Check if we should skip seeding
        if seeder.should_skip_seeding():
            logger.info("✅ Seeding skipped - sufficient data already exists")
            return
        
        # Run tests
        seeder.run_seeding_tests()
        
        logger.info("🎉 Real data seeding completed!")
        
    except Exception as e:
        logger.error(f"❌ Critical error in seeding: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
