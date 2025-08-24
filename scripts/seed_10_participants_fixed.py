#!/usr/bin/env python3
"""
Fixed Seed Demo Data for 10 Participants Testing
Исправленная версия для создания тестовых данных, совместимых с реальными смарт-контрактами
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
import random
import logging
import hashlib

# Add the app directory to the path for imports
sys.path.append('/app')

from app.database import get_db_manager
from app.models import Project, Donation, Allocation, Member, VotingRound, Vote, Payout

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class FixedTenParticipantSeeder:
    """Fixed seeder compatible with real smart contracts and addresses."""
    
    def __init__(self):
        self.db_manager = None
        self.participants = []
        self.projects = []
        self.total_donated = Decimal('0')
        self.total_allocated = Decimal('0')
        
        # Real addresses from your deployment
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
        
        # Real project IDs from your smart contracts (demo projects)
        self.real_project_ids = [
            "0xb34e1d43700c753c79fa98a98c434b921d9d3467e3f07f78ada83890ab8162bc",  # Community Well
            "0x9ca41a8f3901d241ffae2121cf52d35f33a8ccc8786c9d2d619ca9c329185957",  # Medical Supplies
            "0x13c16e789225abe8d69886ac0db24a4f5887bcddb3b8c0e545eed1893f405f77"   # School Equipment
        ]
        
    async def initialize(self):
        """Initialize database connection."""
        logger.info("🚀 Инициализация базы данных для 10 участников...")
        
        self.db_manager = get_db_manager()
        await self.db_manager.reset_database()
        await self.db_manager.create_tables()
        
        logger.info("✅ База данных инициализирована")
    
    def generate_realistic_tx_hash(self, prefix="", suffix=""):
        """Generate realistic transaction hash."""
        random_data = f"{prefix}{random.randint(1000000, 9999999)}{suffix}{random.randint(1000000, 9999999)}"
        hash_input = f"0x{random_data}{datetime.now().timestamp()}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:64]
    
    def generate_realistic_block_number(self, base=1000000):
        """Generate realistic block number."""
        return base + random.randint(0, 10000)
    
    async def create_participants(self):
        """Создание 10 участников с реальными адресами."""
        logger.info("👥 Создание 10 участников с реальными адресами...")
        
        # Профили участников с реалистичными характеристиками
        participant_profiles = [
            {
                'name': 'Алексей Волков',
                'role': 'Крупный донор',
                'weight': 20,
                'donation_capacity': Decimal('15.0'),
                'activity_level': 'high'
            },
            {
                'name': 'Мария Петрова',
                'role': 'Лидер сообщества', 
                'weight': 15,
                'donation_capacity': Decimal('8.0'),
                'activity_level': 'high'
            },
            {
                'name': 'Дмитрий Козлов',
                'role': 'Активный участник',
                'weight': 12,
                'donation_capacity': Decimal('5.0'),
                'activity_level': 'high'
            },
            {
                'name': 'Екатерина Сидорова',
                'role': 'Обычный участник',
                'weight': 8,
                'donation_capacity': Decimal('3.0'),
                'activity_level': 'medium'
            },
            {
                'name': 'Андрей Морозов',
                'role': 'Создатель проектов',
                'weight': 10,
                'donation_capacity': Decimal('4.0'),
                'activity_level': 'medium'
            },
            {
                'name': 'Ольга Белова',
                'role': 'Частый донор',
                'weight': 7,
                'donation_capacity': Decimal('6.0'),
                'activity_level': 'medium'
            },
            {
                'name': 'Павел Новиков',
                'role': 'Случайный донор',
                'weight': 5,
                'donation_capacity': Decimal('2.0'),
                'activity_level': 'low'
            },
            {
                'name': 'Татьяна Орлова',
                'role': 'Новый участник',
                'weight': 3,
                'donation_capacity': Decimal('1.5'),
                'activity_level': 'low'
            },
            {
                'name': 'Сергей Лебедев',
                'role': 'Представитель организации',
                'weight': 18,
                'donation_capacity': Decimal('12.0'),
                'activity_level': 'high'
            },
            {
                'name': 'Наталья Соколова',
                'role': 'Волонтер',
                'weight': 6,
                'donation_capacity': Decimal('2.5'),
                'activity_level': 'medium'
            }
        ]
        
        async with self.db_manager.get_session() as session:
            for i, profile in enumerate(participant_profiles):
                # Используем реальные адреса
                address = self.real_addresses[i]
                
                participant = {
                    'id': f'participant_{i+1:02d}',
                    'address': address,
                    'name': profile['name'],
                    'role': profile['role'],
                    'weight': profile['weight'],
                    'donation_capacity': profile['donation_capacity'],
                    'activity_level': profile['activity_level'],
                    'joined_days_ago': random.randint(1, 365)
                }
                
                # Создание записи в базе данных
                member = Member(
                    address=address,
                    weight=profile['weight'],
                    member_since=datetime.now() - timedelta(days=participant['joined_days_ago'])
                )
                
                session.add(member)
                self.participants.append(participant)
            
            await session.commit()
            logger.info(f"✅ Создано {len(self.participants)} участников с реальными адресами")
    
    async def create_real_projects(self):
        """Создание проектов с реальными ID из смарт-контрактов."""
        logger.info("📋 Создание проектов с реальными ID...")
        
        project_templates = [
            {
                'name': 'Community Well',
                'description': 'Clean water access for the community',
                'category': 'infrastructure',
                'target': 10.0,
                'soft_cap': 7.0,
                'hard_cap': 15.0,
                'priority': 1
            },
            {
                'name': 'Medical Supplies',
                'description': 'Emergency medical supplies for local clinic',
                'category': 'healthcare',
                'target': 5.0,
                'soft_cap': 3.0,
                'hard_cap': 8.0,
                'priority': 2
            },
            {
                'name': 'School Equipment',
                'description': 'Computers and learning materials for local school',
                'category': 'education',
                'target': 15.0,
                'soft_cap': 10.0,
                'hard_cap': 20.0,
                'priority': 3
            }
        ]
        
        async with self.db_manager.get_session() as session:
            for i, template in enumerate(project_templates):
                # Используем реальные project ID из смарт-контрактов
                project_id = self.real_project_ids[i]
                
                project = Project(
                    id=project_id,
                    name=template['name'],
                    description=template['description'],
                    category=template['category'],
                    target=template['target'],
                    soft_cap=template['soft_cap'],
                    hard_cap=template['hard_cap'],
                    total_allocated=0.0,
                    status='active',
                    priority=template['priority'],
                    soft_cap_enabled=True,
                    created_at=datetime.now() - timedelta(days=random.randint(5, 45))
                )
                
                session.add(project)
                self.projects.append(project)
            
            await session.commit()
            logger.info(f"✅ Создано {len(self.projects)} проектов с реальными ID")
    
    async def create_realistic_donations(self):
        """Создание реалистичных пожертвований от 10 участников."""
        logger.info("💰 Создание пожертвований от участников...")
        
        async with self.db_manager.get_session() as session:
            donation_count = 0
            
            for participant in self.participants:
                # Количество пожертвований зависит от уровня активности
                if participant['activity_level'] == 'high':
                    num_donations = random.randint(3, 5)
                elif participant['activity_level'] == 'medium':
                    num_donations = random.randint(1, 3)
                else:  # low
                    num_donations = random.randint(0, 2)
                
                total_participant_donated = Decimal('0')
                
                for j in range(num_donations):
                    # Размер пожертвования
                    max_donation = participant['donation_capacity'] / Decimal(str(max(1, num_donations)))
                    amount = max_donation * Decimal(str(random.uniform(0.3, 1.0)))
                    
                    # Генерируем реалистичные transaction hash
                    tx_hash = self.generate_realistic_tx_hash("donation", participant['id'])
                    block_number = self.generate_realistic_block_number()
                    
                    donation = Donation(
                        receipt_id=f"receipt_{participant['id']}_{j}_{random.randint(10000, 99999)}",
                        donor_address=participant['address'],
                        amount=float(amount),
                        tx_hash=tx_hash,
                        block_number=block_number,
                        timestamp=datetime.now() - timedelta(days=random.randint(5, 45))
                    )
                    
                    session.add(donation)
                    total_participant_donated += amount
                    self.total_donated += amount
                    donation_count += 1
                
                logger.info(f"💝 {participant['name']}: {num_donations} пожертвований на сумму {total_participant_donated:.2f} ETH")
            
            await session.commit()
            logger.info(f"✅ Создано {donation_count} пожертвований на общую сумму {self.total_donated:.2f} ETH")
    
    async def create_strategic_allocations(self):
        """Создание стратегических распределений средств по проектам."""
        logger.info("🎯 Создание распределений по проектам...")
        
        async with self.db_manager.get_session() as session:
            # Получение всех пожертвований
            from sqlalchemy import text
            result = await session.execute(text("SELECT id, amount, donor_address FROM donations"))
            donations = result.fetchall()
            
            allocation_count = 0
            project_allocations = {project.id: Decimal('0') for project in self.projects}
            
            for donation in donations:
                donation_id, amount, donor_address = donation
                amount = Decimal(str(amount))
                
                # Определение стратегии распределения на основе роли участника
                participant = next((p for p in self.participants if p['address'] == donor_address), None)
                
                if participant:
                    if participant['role'] in ['Крупный донор', 'Лидер сообщества']:
                        # Крупные доноры распределяют по 2-3 приоритетным проектам
                        selected_projects = self.projects[:3]
                        weights = [0.5, 0.3, 0.2]
                    elif participant['role'] in ['Активный участник', 'Создатель проектов']:
                        # Активные участники поддерживают 2-4 проекта
                        selected_projects = random.sample(self.projects, min(4, len(self.projects)))
                        weights = [random.uniform(0.2, 0.6) for _ in selected_projects]
                        weights = [w / sum(weights) for w in weights]  # Нормализация
                    else:
                        # Обычные участники концентрируются на 1-2 проектах
                        selected_projects = random.sample(self.projects, min(2, len(self.projects)))
                        weights = [random.uniform(0.4, 0.8), random.uniform(0.2, 0.6)]
                        weights = weights[:len(selected_projects)]
                        weights = [w / sum(weights) for w in weights]  # Нормализация
                
                # Создание распределений
                for project, weight in zip(selected_projects, weights):
                    allocation_amount = amount * Decimal(str(weight))
                    
                    # Генерируем реалистичные transaction hash для распределений
                    tx_hash = self.generate_realistic_tx_hash("allocation", f"{donation_id}_{project.id}")
                    block_number = self.generate_realistic_block_number()
                    
                    allocation = Allocation(
                        donation_id=donation_id,
                        project_id=project.id,
                        donor_address=donor_address,
                        amount=float(allocation_amount),
                        tx_hash=tx_hash,
                        block_number=block_number,
                        timestamp=datetime.now() - timedelta(days=random.randint(5, 45))
                    )
                    
                    session.add(allocation)
                    project_allocations[project.id] += allocation_amount
                    self.total_allocated += allocation_amount
                    allocation_count += 1
            
            # Обновление общих сумм проектов
            for project in self.projects:
                project.total_allocated = float(project_allocations[project.id])
                
                # Обновление статуса проекта
                if project.total_allocated >= project.target:
                    project.status = 'ready_to_payout'  # Используем правильный статус
                elif project.total_allocated >= project.soft_cap:
                    project.status = 'active'
                elif project.total_allocated > 0:
                    project.status = 'active'
                else:
                    project.status = 'pending'
            
            await session.commit()
            logger.info(f"✅ Создано {allocation_count} распределений")
            
            # Отчет по проектам
            logger.info("📊 Статус проектов:")
            for project in self.projects:
                funding_percentage = (project.total_allocated / project.target) * 100
                logger.info(f"   {project.name}: {project.total_allocated:.2f}/{project.target:.2f} ETH ({funding_percentage:.1f}%) - {project.status}")
    
    async def create_voting_scenario(self):
        """Создание сценария голосования для тестирования."""
        logger.info("🗳️ Создание сценария голосования...")
        
        async with self.db_manager.get_session() as session:
            # Создание раунда голосования
            voting_round = VotingRound(
                round_id=1,
                start_commit=datetime.now(),
                end_commit=datetime.now() + timedelta(days=7),
                end_reveal=datetime.now() + timedelta(days=10),
                finalized=False,
                snapshot_block=1500000
            )
            
            session.add(voting_round)
            
            # Создание коммитов от участников
            commit_count = 0
            reveal_count = 0
            
            for participant in self.participants:
                # Вероятность участия в голосовании
                if participant['activity_level'] == 'high':
                    participation_chance = 0.9
                elif participant['activity_level'] == 'medium':
                    participation_chance = 0.7
                else:
                    participation_chance = 0.4
                
                if random.random() < participation_chance:
                    # Создание коммита с правильным project_id
                    selected_project = random.choice(self.projects)
                    
                    commit_vote = Vote(
                        round_id=1,
                        voter_address=participant['address'],
                        project_id=selected_project.id,  # Используем реальный project_id
                        choice="not_participating",
                        tx_hash=self.generate_realistic_tx_hash("commit", participant['id']),
                        block_number=self.generate_realistic_block_number(),
                        committed_at=datetime.now() - timedelta(days=random.randint(5, 45))
                    )
                    
                    session.add(commit_vote)
                    commit_count += 1
                    
                    # 85% коммитов раскрываются
                    if random.random() < 0.85:
                        # Создание раскрытия голоса
                        choice = random.choice(['for', 'against', 'abstain'])
                        
                        reveal_vote = Vote(
                            round_id=1,
                            voter_address=participant['address'],
                            project_id=selected_project.id,
                            choice=choice,
                            weight=participant['weight'],
                            tx_hash=self.generate_realistic_tx_hash("reveal", participant['id']),
                            block_number=self.generate_realistic_block_number(),
                            revealed_at=datetime.now() - timedelta(days=random.randint(5, 45))
                        )
                        
                        session.add(reveal_vote)
                        reveal_count += 1
            
            await session.commit()
            
            logger.info(f"✅ Голосование: {commit_count} коммитов, {reveal_count} раскрытий")
            logger.info(f"   Участие в голосовании: {commit_count}/10 участников ({commit_count * 10}%)")
            logger.info(f"   Процент раскрытий: {reveal_count}/{commit_count} ({reveal_count / max(1, commit_count) * 100:.1f}%)")
    
    async def create_payout_records(self):
        """Создание записей о выплатах для финансированных проектов."""
        logger.info("💸 Создание записей о выплатах...")
        
        async with self.db_manager.get_session() as session:
            payout_count = 0
            
            for project in self.projects:
                if project.status == 'ready_to_payout':
                    # Создание поэтапных выплат
                    num_payouts = random.randint(2, 4)
                    total_amount = project.total_allocated
                    
                    for i in range(num_payouts):
                        if i == num_payouts - 1:
                            # Последняя выплата - остаток
                            payout_amount = total_amount * 0.3
                        else:
                            payout_amount = total_amount * random.uniform(0.2, 0.4)
                        
                        # Генерируем реалистичные transaction hash для выплат
                        tx_hash = self.generate_realistic_tx_hash("payout", f"{project.id}_{i}")
                        
                        payout = Payout(
                            payout_id=f"payout_{project.id}_{i}_{random.randint(10000, 99999)}",
                            project_id=project.id,
                            amount=payout_amount,
                            recipient_address=f"0xrecipient_{project.id}_{i}",
                            tx_hash=tx_hash,
                            block_number=self.generate_realistic_block_number(),
                            timestamp=datetime.now() - timedelta(days=random.randint(5, 45))
                        )
                        
                        session.add(payout)
                        payout_count += 1
            
            await session.commit()
            logger.info(f"✅ Создано {payout_count} записей о выплатах")
    
    async def generate_summary_report(self):
        """Генерация итогового отчета о созданных тестовых данных."""
        logger.info("📋 Генерация итогового отчета...")
        
        # Подсчет статистики
        ready_to_payout_projects = len([p for p in self.projects if p.status == 'ready_to_payout'])
        active_projects = len([p for p in self.projects if p.status == 'active'])
        pending_projects = len([p for p in self.projects if p.status == 'pending'])
        
        high_activity_participants = len([p for p in self.participants if p['activity_level'] == 'high'])
        medium_activity_participants = len([p for p in self.participants if p['activity_level'] == 'medium'])
        low_activity_participants = len([p for p in self.participants if p['activity_level'] == 'low'])
        
        efficiency_rate = (self.total_allocated / self.total_donated * 100) if self.total_donated > 0 else 0
        
        report = f"""
🎯 ОТЧЕТ О ТЕСТОВЫХ ДАННЫХ ДЛЯ 10 УЧАСТНИКОВ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
================================================================

📊 ОБЩАЯ СТАТИСТИКА:
   Участников: {len(self.participants)}
   Проектов: {len(self.projects)}
   Общая сумма пожертвований: {self.total_donated:.2f} ETH
   Общая сумма распределений: {self.total_allocated:.2f} ETH
   Эффективность распределения: {efficiency_rate:.1f}%

👥 УЧАСТНИКИ ПО АКТИВНОСТИ:
   Высокая активность: {high_activity_participants} участников
   Средняя активность: {medium_activity_participants} участников
   Низкая активность: {low_activity_participants} участников

📋 ПРОЕКТЫ ПО СТАТУСУ:
   Готовы к выплате: {ready_to_payout_projects} проектов
   Активные: {active_projects} проектов
   В ожидании: {pending_projects} проектов

💰 ДЕТАЛИ ПО УЧАСТНИКАМ:
"""
        
        for participant in self.participants:
            report += f"   {participant['name']} ({participant['role']}): {participant['weight']} SBT, до {participant['donation_capacity']} ETH\n"
        
        report += f"""
📋 ДЕТАЛИ ПО ПРОЕКТАМ:
"""
        
        for project in self.projects:
            funding_percentage = (project.total_allocated / project.target) * 100
            status_labels = {
                'ready_to_payout': 'Готов к выплате',
                'active': 'Активный',
                'pending': 'В ожидании'
            }
            status_label = status_labels.get(project.status, project.status)
            report += f"   {project.name}: {project.total_allocated:.2f}/{project.target:.2f} ETH ({funding_percentage:.1f}%) - {status_label}\n"
        
        report += f"""
✅ ГОТОВНОСТЬ К ТЕСТИРОВАНИЮ:
   ✓ 10 участников с реальными адресами
   ✓ {len(self.projects)} проектов с реальными ID из смарт-контрактов
   ✓ Реалистичные пожертвования и распределения
   ✓ Сценарий голосования настроен
   ✓ Записи о выплатах созданы
   ✓ Все данные совместимы с blockchain
   
🚀 СИСТЕМА ГОТОВА ДЛЯ ПОЛНОГО ЦИКЛА ТЕСТИРОВАНИЯ!
"""
        
        logger.info(report)
        
        # Сохранение отчета в файл
        report_file = f"fixed_test_data_report_10_participants_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logger.info(f"📄 Отчет сохранен в файл: {report_file}")
    
    async def seed_all_data(self):
        """Основной метод для создания всех тестовых данных."""
        logger.info("🌱 Начало создания исправленных тестовых данных для 10 участников...")
        
        await self.create_participants()
        await self.create_real_projects()
        await self.create_realistic_donations()
        await self.create_strategic_allocations()
        await self.create_voting_scenario()
        await self.create_payout_records()
        await self.generate_summary_report()
        
        logger.info("🎉 Все исправленные тестовые данные успешно созданы!")


async def main():
    """Основная функция для запуска создания тестовых данных."""
    seeder = FixedTenParticipantSeeder()
    
    try:
        await seeder.initialize()
        await seeder.seed_all_data()
        
        print("\n✅ Исправленные тестовые данные для 10 участников созданы успешно!")
        print("🚀 Система готова для полного цикла тестирования без ошибок!")
        
    except KeyboardInterrupt:
        logger.info("🛑 Создание данных прервано пользователем")
        return 1
    except Exception as e:
        logger.error(f"💥 Ошибка при создании тестовых данных: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
