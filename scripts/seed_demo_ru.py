#!/usr/bin/env python3
"""
Скрипт загрузки демонстрационных данных на русском языке для FundChain
Создание реалистичных примеров данных для разработки и тестирования
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
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from backend.app.database import get_db_manager, DatabaseManager
from backend.app.models import Project, Donation, Allocation, Member, VotingRound, Vote, Payout

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RussianDemoDataSeeder:
    """Загрузчик демонстрационных данных на русском языке для FundChain."""
    
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
        """Инициализация подключения к базе данных и создание таблиц."""
        self.db_manager = get_db_manager()
        # Reset database first to ensure clean state
        await self.db_manager.reset_database()
        await self.db_manager.create_tables()
        logger.info("Таблицы базы данных созданы успешно")
    
    async def seed_all_data(self):
        """Загрузка всех демонстрационных данных в правильном порядке."""
        logger.info("Начало процесса загрузки демонстрационных данных на русском языке...")
        
        await self.create_sample_projects()
        await self.create_sample_members()
        await self.create_sample_donations()
        await self.create_sample_allocations()
        await self.create_sample_voting_rounds()
        await self.create_sample_votes()
        await self.create_sample_payouts()
        
        logger.info("Загрузка демонстрационных данных на русском языке завершена успешно!")
    
    async def create_sample_projects(self):
        """Создание разнообразных примеров проектов по различным категориям."""
        logger.info("Создание примеров проектов...")
        
        russian_project_templates = [
            {
                "name": "Общественная поликлиника",
                "description": "Современное медицинское учреждение для обслуживания местного сообщества с современным оборудованием и опытным медицинским персоналом. Поликлиника будет предоставлять первичную медицинскую помощь, профилактические услуги и неотложную помощь.",
                "category": "healthcare",
                "target": Decimal("50.0"),
                "soft_cap": Decimal("30.0"),
                "hard_cap": Decimal("75.0"),
                "priority": 1
            },
            {
                "name": "Центр цифрового обучения",
                "description": "Комплексное образовательное учреждение, оснащенное современными компьютерами, высокоскоростным интернетом и цифровыми обучающими платформами для преодоления цифрового неравенства в образовании.",
                "category": "education",
                "target": Decimal("35.0"),
                "soft_cap": Decimal("20.0"),
                "hard_cap": Decimal("50.0"),
                "priority": 2
            },
            {
                "name": "Сеть возобновляемой энергии",
                "description": "Установка солнечных панелей и системы накопления энергии для обеспечения чистой, устойчивой энергии для сообщества, снижая углеродный след и затраты на энергию.",
                "category": "infrastructure",
                "target": Decimal("80.0"),
                "soft_cap": Decimal("50.0"),
                "hard_cap": Decimal("120.0"),
                "priority": 3
            },
            {
                "name": "Приют для бездомных и служба поддержки",
                "description": "Комплексное приютское учреждение с социальными услугами, профессиональным обучением, поддержкой психического здоровья и программами реабилитации для помощи людям в переходе к постоянному жилью.",
                "category": "social",
                "target": Decimal("45.0"),
                "soft_cap": Decimal("25.0"),
                "hard_cap": Decimal("65.0"),
                "priority": 4
            },
            {
                "name": "Инициатива городского фермерства",
                "description": "Вертикальная ферма с использованием гидропонных систем для обеспечения свежих, выращенных местно продуктов круглый год, создавая образовательные возможности и рабочие места.",
                "category": "environment",
                "target": Decimal("25.0"),
                "soft_cap": Decimal("15.0"),
                "hard_cap": Decimal("35.0"),
                "priority": 5
            },
            {
                "name": "Система экстренного реагирования",
                "description": "Современная сеть экстренной связи и реагирования, включая системы оповещения, аварийное оборудование и программы обучения для обеспечения безопасности сообщества.",
                "category": "emergency_aid",
                "target": Decimal("60.0"),
                "soft_cap": Decimal("40.0"),
                "hard_cap": Decimal("85.0"),
                "priority": 6
            },
            {
                "name": "Молодежный центр искусств и культуры",
                "description": "Творческое пространство для молодых людей для изучения искусства, музыки, театра и культурных мероприятий с профессиональным обучением и возможностями для выступлений.",
                "category": "culture",
                "target": Decimal("30.0"),
                "soft_cap": Decimal("18.0"),
                "hard_cap": Decimal("45.0"),
                "priority": 7
            },
            {
                "name": "Реновация учреждения для пожилых",
                "description": "Полная реновация существующего учреждения по уходу за пожилыми людьми для соответствия современным стандартам доступности и обеспечения повышенного комфорта и ухода для пожилых жителей.",
                "category": "healthcare",
                "target": Decimal("55.0"),
                "soft_cap": Decimal("35.0"),
                "hard_cap": Decimal("75.0"),
                "priority": 8
            },
            {
                "name": "Библиотека и центр обучения",
                "description": "Модернизация общественной библиотеки с созданием современных учебных пространств, доступом к цифровым ресурсам и программами повышения грамотности для всех возрастов.",
                "category": "education",
                "target": Decimal("40.0"),
                "soft_cap": Decimal("25.0"),
                "hard_cap": Decimal("60.0"),
                "priority": 9
            },
            {
                "name": "Парк и зона отдыха",
                "description": "Создание зеленого общественного пространства с игровыми площадками, дорожками для прогулок, спортивными сооружениями и зонами для пикников для укрепления здоровья сообщества.",
                "category": "environment",
                "target": Decimal("35.0"),
                "soft_cap": Decimal("20.0"),
                "hard_cap": Decimal("50.0"),
                "priority": 10
            }
        ]
        
        base_time = datetime.now()
        
        for i, template in enumerate(russian_project_templates):
            # Generate unique project ID
            project_id = f"ru_project_{i+1:03d}_{template['name'].lower().replace(' ', '_').replace(',', '')}"
            
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
        
        logger.info(f"Создано {len(self.projects)} примеров проектов")
    
    async def create_sample_members(self):
        """Создание разнообразных участников сообщества с различными весами SBT."""
        logger.info("Создание примеров участников сообщества...")
        
        member_templates = [
            {"address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b", "weight": 15, "role": "крупный_донор"},
            {"address": "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c", "weight": 8, "role": "активный_участник"},
            {"address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d", "weight": 12, "role": "лидер_сообщества"},
            {"address": "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e", "weight": 5, "role": "обычный_участник"},
            {"address": "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f", "weight": 20, "role": "институциональный_донор"},
            {"address": "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a", "weight": 3, "role": "новый_участник"},
            {"address": "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b", "weight": 9, "role": "волонтер"},
            {"address": "0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c", "weight": 14, "role": "член_совета"},
            {"address": "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d", "weight": 6, "role": "местный_бизнес"},
            {"address": "0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9", "weight": 11, "role": "эксперт"}
        ]
        
        for template in member_templates:
            member = Member(
                address=template["address"],
                sbt_weight=template["weight"],
                role=template["role"],
                joined_at=datetime.now() - timedelta(days=random.randint(30, 365))
            )
            
            self.members.append(member)
            async with self.db_manager.get_session() as session:
                session.add(member)
                await session.commit()
        
        logger.info(f"Создано {len(self.members)} участников сообщества")
    
    async def create_sample_donations(self):
        """Создание разнообразных пожертвований с реалистичными распределениями."""
        logger.info("Создание примеров пожертвований...")
        
        donation_count = 0
        base_time = datetime.now()
        
        # Create donations for each member
        for member in self.members:
            num_donations = random.randint(1, 4)  # Each member makes 1-4 donations
            
            for _ in range(num_donations):
                # Select random project
                project = random.choice(self.projects)
                
                # Generate donation amount based on member weight
                base_amount = Decimal(str(random.uniform(0.1, 2.0)))
                weight_multiplier = Decimal(str(member.sbt_weight / 10.0))
                amount = base_amount * weight_multiplier
                
                donation = Donation(
                    donor_address=member.address,
                    project_id=project.id,
                    amount=float(amount),
                    transaction_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                    block_number=random.randint(1000000, 2000000),
                    timestamp=base_time - timedelta(days=random.randint(1, 90))
                )
                
                self.donations.append(donation)
                async with self.db_manager.get_session() as session:
                    session.add(donation)
                    await session.commit()
                
                donation_count += 1
        
        logger.info(f"Создано {donation_count} пожертвований")
    
    async def create_sample_allocations(self):
        """Создание распределений средств по проектам."""
        logger.info("Создание примеров распределений...")
        
        allocation_count = 0
        
        for project in self.projects:
            if project.total_allocated > 0:
                # Create allocations based on project funding
                num_allocations = random.randint(1, 3)
                allocated_so_far = 0
                
                for i in range(num_allocations):
                    if i == num_allocations - 1:
                        # Last allocation gets the remainder
                        amount = project.total_allocated - allocated_so_far
                    else:
                        # Allocate a portion
                        remaining = project.total_allocated - allocated_so_far
                        amount = random.uniform(0.2, 0.6) * remaining
                    
                    allocation = Allocation(
                        project_id=project.id,
                        amount=amount,
                        allocated_at=datetime.now() - timedelta(days=random.randint(1, 60)),
                        purpose=f"Распределение средств для проекта {project.name}"
                    )
                    
                    self.allocations.append(allocation)
                    async with self.db_manager.get_session() as session:
                        session.add(allocation)
                        await session.commit()
                    
                    allocated_so_far += amount
                    allocation_count += 1
        
        logger.info(f"Создано {allocation_count} распределений")
    
    async def create_sample_voting_rounds(self):
        """Создание примеров раундов голосования."""
        logger.info("Создание примеров раундов голосования...")
        
        # Create 2-3 voting rounds
        for round_num in range(1, 4):
            voting_round = VotingRound(
                round_number=round_num,
                start_time=datetime.now() - timedelta(days=random.randint(30, 90)),
                commit_phase_end=datetime.now() - timedelta(days=random.randint(20, 80)),
                reveal_phase_end=datetime.now() - timedelta(days=random.randint(10, 70)),
                is_active=round_num == 3,  # Make the latest round active
                projects_in_round=random.sample([p.id for p in self.projects], k=min(5, len(self.projects)))
            )
            
            self.voting_rounds.append(voting_round)
            async with self.db_manager.get_session() as session:
                session.add(voting_round)
                await session.commit()
        
        logger.info(f"Создано {len(self.voting_rounds)} раундов голосования")
    
    async def create_sample_votes(self):
        """Создание примеров голосов."""
        logger.info("Создание примеров голосов...")
        
        vote_count = 0
        
        for voting_round in self.voting_rounds:
            if voting_round.projects_in_round:
                # Each member votes on each project in the round
                for member in self.members[:8]:  # Limit to first 8 members for demo
                    for project_id in voting_round.projects_in_round:
                        vote_value = random.choice([1, 0, -1])  # For, Abstain, Against
                        
                        vote = Vote(
                            voting_round_id=voting_round.round_number,
                            voter_address=member.address,
                            project_id=project_id,
                            vote_value=vote_value,
                            weight=member.sbt_weight,
                            commit_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                            is_revealed=not voting_round.is_active,  # Revealed if round is complete
                            submitted_at=voting_round.start_time + timedelta(hours=random.randint(1, 24))
                        )
                        
                        self.votes.append(vote)
                        async with self.db_manager.get_session() as session:
                            session.add(vote)
                            await session.commit()
                        
                        vote_count += 1
        
        logger.info(f"Создано {vote_count} голосов")
    
    async def create_sample_payouts(self):
        """Создание примеров выплат."""
        logger.info("Создание примеров выплат...")
        
        payout_count = 0
        
        # Create payouts for funded projects
        for project in self.projects:
            if project.status == "funded":
                num_payouts = random.randint(1, 2)
                paid_so_far = 0
                
                for i in range(num_payouts):
                    if i == num_payouts - 1:
                        # Final payout
                        amount = project.total_allocated - paid_so_far
                    else:
                        # Partial payout
                        amount = project.total_allocated * random.uniform(0.3, 0.7)
                    
                    payout = Payout(
                        project_id=project.id,
                        amount=amount,
                        recipient_address=f"0x{''.join(random.choices('0123456789abcdef', k=40))}",
                        transaction_hash=f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                        paid_at=datetime.now() - timedelta(days=random.randint(1, 30)),
                        purpose=f"Выплата для проекта {project.name}"
                    )
                    
                    self.payouts.append(payout)
                    async with self.db_manager.get_session() as session:
                        session.add(payout)
                        await session.commit()
                    
                    paid_so_far += amount
                    payout_count += 1
        
        logger.info(f"Создано {payout_count} выплат")


async def main():
    """Основная функция для запуска загрузки демонстрационных данных на русском языке."""
    seeder = RussianDemoDataSeeder()
    
    try:
        await seeder.initialize()
        await seeder.seed_all_data()
        logger.info("✅ Демонстрационные данные на русском языке загружены успешно!")
        
    except Exception as e:
        logger.error(f"❌ Ошибка при загрузке демонстрационных данных: {e}")
        raise
    
    finally:
        if seeder.db_manager:
            await seeder.db_manager.close()


if __name__ == "__main__":
    asyncio.run(main())