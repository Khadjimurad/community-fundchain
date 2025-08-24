#!/usr/bin/env python3
"""
Seed Real Data for FundChain Testing
Создает тестовые данные для системы FundChain
"""

import asyncio
import logging
import random
import sys
import os
from datetime import datetime, timedelta

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import StaticPool

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FundChainDataSeeder:
    """Seeds FundChain with real test data."""
    
    def __init__(self):
        self.db_url = "sqlite:///fundchain.db"
        self.engine = None
        self.SessionLocal = None
        
    def initialize_database(self):
        """Initialize database connection."""
        try:
            # Create engine with check_same_thread=False for SQLite
            self.engine = create_engine(
                self.db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool
            )
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            
            logger.info("✅ Database connection initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {e}")
            raise
    
    def create_tables(self):
        """Create necessary tables if they don't exist."""
        try:
            with self.engine.connect() as conn:
                # Create members table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS members (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        address TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        email TEXT,
                        phone TEXT,
                        role TEXT DEFAULT 'member',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                
                # Create projects table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        category TEXT DEFAULT 'General',
                        target_amount REAL NOT NULL,
                        current_amount REAL DEFAULT 0,
                        status TEXT DEFAULT 'active',
                        creator_address TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                
                # Create donations table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS donations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        donor_address TEXT NOT NULL,
                        project_id TEXT NOT NULL,
                        amount REAL NOT NULL,
                        transaction_hash TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        FOREIGN KEY (donor_address) REFERENCES members (address)
                    )
                """))
                
                # Create voting_rounds table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS voting_rounds (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        round_id INTEGER UNIQUE NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        start_date TIMESTAMP NOT NULL,
                        end_date TIMESTAMP NOT NULL,
                        status TEXT DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                
                # Create votes table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS votes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        round_id INTEGER NOT NULL,
                        voter_address TEXT NOT NULL,
                        project_id TEXT NOT NULL,
                        vote_choice TEXT NOT NULL,
                        weight REAL DEFAULT 1.0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (round_id) REFERENCES voting_rounds (round_id),
                        FOREIGN KEY (voter_address) REFERENCES members (address),
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                """))
                
                conn.commit()
                logger.info("✅ Database tables created/verified")
                
        except Exception as e:
            logger.error(f"❌ Failed to create tables: {e}")
            raise
    
    def seed_members(self):
        """Seed database with 10 test members."""
        try:
            # Anvil test accounts with their private keys
            test_accounts = [
                {
                    "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                    "name": "Owner Account",
                    "email": "owner@fundchain.test",
                    "role": "owner"
                },
                {
                    "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                    "name": "Alice Johnson",
                    "email": "alice@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                    "name": "Bob Smith",
                    "email": "bob@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                    "name": "Carol Davis",
                    "email": "carol@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
                    "name": "David Wilson",
                    "email": "david@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
                    "name": "Eva Brown",
                    "email": "eva@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
                    "name": "Frank Miller",
                    "email": "frank@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
                    "name": "Grace Lee",
                    "email": "grace@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x10ECd8B004F1834802058e431F3498606746EfcF",
                    "name": "Henry Taylor",
                    "email": "henry@fundchain.test",
                    "role": "member"
                },
                {
                    "address": "0x05Ac88aB43F4daCBa3D47BF7d9821AE4037Ab7a1",
                    "name": "Ivy Chen",
                    "email": "ivy@fundchain.test",
                    "role": "member"
                }
            ]
            
            with self.SessionLocal() as session:
                for account in test_accounts:
                    try:
                        # Check if member already exists
                        existing = session.execute(
                            text("SELECT id FROM members WHERE address = :address"),
                            {"address": account["address"]}
                        ).fetchone()
                        
                        if not existing:
                            session.execute(
                                text("""
                                    INSERT INTO members (address, name, email, role)
                                    VALUES (:address, :name, :email, :role)
                                """),
                                account
                            )
                            logger.info(f"✅ Created member: {account['name']} ({account['address'][:8]}...)")
                        else:
                            logger.info(f"ℹ️ Member already exists: {account['name']}")
                            
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to create member {account['name']}: {e}")
                        continue
                
                session.commit()
                logger.info(f"✅ Successfully seeded {len(test_accounts)} members")
                
        except Exception as e:
            logger.error(f"❌ Failed to seed members: {e}")
            raise
    
    def seed_projects(self):
        """Seed database with 10 test projects."""
        try:
            # Russian project descriptions
            projects = [
                {
                    "name": "Школьное оборудование",
                    "description": "Закупка современного оборудования для компьютерного класса средней школы №15. Включает 25 компьютеров, интерактивную доску, проектор и программное обеспечение для обучения программированию.",
                    "category": "Образование",
                    "target_amount": 1500000.0,
                    "creator_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                },
                {
                    "name": "Медицинский центр",
                    "description": "Строительство амбулаторного медицинского центра в микрорайоне 'Зеленый'. Центр будет включать кабинеты терапевта, педиатра, стоматолога и процедурный кабинет.",
                    "category": "Здравоохранение",
                    "target_amount": 5000000.0,
                    "creator_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
                },
                {
                    "name": "Парк отдыха",
                    "description": "Благоустройство городского парка 'Молодежный'. Установка детских площадок, спортивных тренажеров, скамеек и освещения. Озеленение территории и создание зон для отдыха.",
                    "category": "Инфраструктура",
                    "target_amount": 3000000.0,
                    "creator_address": "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
                },
                {
                    "name": "Библиотека будущего",
                    "description": "Модернизация центральной городской библиотеки. Создание цифрового архива, зоны для коворкинга, компьютерного зала и детского читального зала с интерактивными элементами.",
                    "category": "Культура",
                    "target_amount": 2500000.0,
                    "creator_address": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
                },
                {
                    "name": "Спортивный комплекс",
                    "description": "Строительство многофункционального спортивного комплекса с бассейном, тренажерным залом, залом для единоборств и футбольным полем с искусственным покрытием.",
                    "category": "Спорт",
                    "target_amount": 8000000.0,
                    "creator_address": "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"
                },
                {
                    "name": "Экологическая инициатива",
                    "description": "Программа по раздельному сбору мусора и установка контейнеров для переработки во всех районах города. Обучение населения экологическим практикам.",
                    "category": "Экология",
                    "target_amount": 1200000.0,
                    "creator_address": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"
                },
                {
                    "name": "Центр поддержки предпринимателей",
                    "description": "Создание центра для поддержки малого и среднего бизнеса. Включает консультационные услуги, обучающие программы, коворкинг и доступ к финансовым инструментам.",
                    "category": "Бизнес",
                    "target_amount": 4000000.0,
                    "creator_address": "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
                },
                {
                    "name": "Технологический хаб",
                    "description": "Создание инновационного центра для стартапов и технологических компаний. Предоставление офисных помещений, лабораторий и доступа к высокоскоростному интернету.",
                    "category": "Технологии",
                    "target_amount": 6000000.0,
                    "creator_address": "0x10ECd8B004F1834802058e431F3498606746EfcF"
                },
                {
                    "name": "Центр социальной помощи",
                    "description": "Открытие центра для оказания помощи пожилым людям, инвалидам и малоимущим семьям. Включает столовую, медицинский кабинет и социальные услуги.",
                    "category": "Социальная помощь",
                    "target_amount": 3500000.0,
                    "creator_address": "0x05Ac88aB43F4daCBa3D47BF7d9821AE4037Ab7a1"
                },
                {
                    "name": "Туристический маршрут",
                    "description": "Разработка и обустройство туристического маршрута по историческим местам города. Создание информационных стендов, указателей и зон отдыха для туристов.",
                    "category": "Туризм",
                    "target_amount": 1800000.0,
                    "creator_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
                }
            ]
            
            with self.SessionLocal() as session:
                for i, project in enumerate(projects):
                    try:
                        # Generate unique project ID
                        project_id = f"project_{i+1:03d}_{datetime.now().strftime('%Y%m%d')}"
                        
                        # Check if project already exists
                        existing = session.execute(
                            text("SELECT id FROM projects WHERE project_id = :project_id"),
                            {"project_id": project_id}
                        ).fetchone()
                        
                        if not existing:
                            session.execute(
                                text("""
                                    INSERT INTO projects (project_id, name, description, category, target_amount, creator_address)
                                    VALUES (:project_id, :name, :description, :category, :target_amount, :creator_address)
                                """),
                                {
                                    "project_id": project_id,
                                    "name": project["name"],
                                    "description": project["description"],
                                    "category": project["category"],
                                    "target_amount": project["target_amount"],
                                    "creator_address": project["creator_address"]
                                }
                            )
                            logger.info(f"✅ Created project: {project['name']} (ID: {project_id})")
                        else:
                            logger.info(f"ℹ️ Project already exists: {project['name']}")
                            
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to create project {project['name']}: {e}")
                        continue
                
                session.commit()
                logger.info(f"✅ Successfully seeded {len(projects)} projects")
                
        except Exception as e:
            logger.error(f"❌ Failed to seed projects: {e}")
            raise
    
    def seed_donations(self):
        """Seed database with sample donations."""
        try:
            with self.SessionLocal() as session:
                # Get all projects and members
                projects = session.execute(text("SELECT project_id, target_amount FROM projects")).fetchall()
                members = session.execute(text("SELECT address FROM members WHERE role = 'member'")).fetchall()
                
                if not projects or not members:
                    logger.warning("⚠️ No projects or members found for seeding donations")
                    return
                
                donation_count = 0
                for project in projects:
                    # Create 2-4 donations per project
                    num_donations = random.randint(2, 4)
                    for _ in range(num_donations):
                        try:
                            donor = random.choice(members)[0]
                            # Random donation amount between 10% and 30% of target
                            amount = random.uniform(0.1, 0.3) * project[1]
                            
                            # Check if donation already exists
                            existing = session.execute(
                                text("SELECT id FROM donations WHERE donor_address = :donor AND project_id = :project"),
                                {"donor": donor, "project": project[0]}
                            ).fetchone()
                            
                            if not existing:
                                session.execute(
                                    text("""
                                        INSERT INTO donations (donor_address, project_id, amount, transaction_hash)
                                        VALUES (:donor, :project, :amount, :hash)
                                    """),
                                    {
                                        "donor": donor,
                                        "project": project[0],
                                        "amount": round(amount, 2),
                                        "hash": f"0x{random.randint(1000000000000000000000000000000000000000000000000000000000000000, 9999999999999999999999999999999999999999999999999999999999999999):064x}"
                                    }
                                )
                                donation_count += 1
                                
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to create donation: {e}")
                            continue
                
                session.commit()
                logger.info(f"✅ Successfully seeded {donation_count} donations")
                
        except Exception as e:
            logger.error(f"❌ Failed to seed donations: {e}")
            raise
    
    def run_seeding(self):
        """Run the complete seeding process."""
        try:
            logger.info("🚀 Starting FundChain data seeding...")
            
            # Initialize database
            self.initialize_database()
            
            # Create tables
            self.create_tables()
            
            # Seed data
            self.seed_members()
            self.seed_projects()
            self.seed_donations()
            
            logger.info("🎉 Data seeding completed successfully!")
            
            # Show summary
            self.show_summary()
            
        except Exception as e:
            logger.error(f"❌ Data seeding failed: {e}")
            raise
    
    def show_summary(self):
        """Show summary of seeded data."""
        try:
            with self.SessionLocal() as session:
                # Count members
                member_count = session.execute(text("SELECT COUNT(*) FROM members")).fetchone()[0]
                
                # Count projects
                project_count = session.execute(text("SELECT COUNT(*) FROM projects")).fetchone()[0]
                
                # Count donations
                donation_count = session.execute(text("SELECT COUNT(*) FROM donations")).fetchone()[0]
                
                # Total donations amount
                total_amount = session.execute(text("SELECT SUM(amount) FROM donations")).fetchone()[0] or 0
                
                logger.info("📊 Seeding Summary:")
                logger.info(f"   👥 Members: {member_count}")
                logger.info(f"   📋 Projects: {project_count}")
                logger.info(f"   💰 Donations: {donation_count}")
                logger.info(f"   💵 Total Amount: {total_amount:,.2f}")
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to show summary: {e}")

def main():
    """Main function."""
    try:
        seeder = FundChainDataSeeder()
        seeder.run_seeding()
        
    except Exception as e:
        logger.error(f"❌ Main execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
