#!/usr/bin/env python3
"""
Скрипт очистки данных для FundChain (Docker версия)
Упрощенная версия для работы внутри Docker контейнера
"""

import asyncio
import os
import sys
from datetime import datetime
import logging
from pathlib import Path

# Добавляем путь к модулям приложения (для работы в Docker)
sys.path.insert(0, '/app')

try:
    from app.database import get_db_manager, DatabaseManager
    from app.models import Base
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    sys.exit(1)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleDataCleanup:
    """Упрощенный класс для очистки данных в Docker контейнере."""
    
    def __init__(self):
        self.db_manager = None
    
    async def initialize(self):
        """Инициализация менеджера базы данных."""
        try:
            self.db_manager = get_db_manager()
            logger.info("Менеджер базы данных инициализирован")
        except Exception as e:
            logger.error(f"Ошибка инициализации базы данных: {e}")
            raise
    
    async def get_current_data_stats(self):
        """Получает статистику текущих данных в базе."""
        try:
            counts = await self.db_manager.get_table_counts()
            logger.info("Текущая статистика базы данных:")
            total_records = 0
            for table, count in counts.items():
                if count > 0:
                    logger.info(f"  {table}: {count} записей")
                    total_records += count
                elif count == 0:
                    logger.info(f"  {table}: пустая")
            
            logger.info(f"Всего записей: {total_records}")
            return counts, total_records
        except Exception as e:
            logger.error(f"Ошибка получения статистики: {e}")
            return {}, 0
    
    async def reset_database(self):
        """Полная очистка базы данных."""
        logger.info("Начинаем полную очистку базы данных...")
        
        try:
            # Проверяем соединение с базой данных
            connection_ok = await self.db_manager.check_connection()
            if not connection_ok:
                logger.error("Нет соединения с базой данных")
                return False
            
            # Сбрасываем базу данных
            await self.db_manager.reset_database()
            logger.info("База данных полностью очищена и пересоздана")
            
            # Оптимизируем базу данных
            try:
                await self.db_manager.vacuum_database()
                logger.info("Оптимизация базы данных завершена")
            except Exception as e:
                logger.warning(f"Не удалось оптимизировать базу данных: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"Ошибка очистки базы данных: {e}")
            return False
    
    async def create_backup(self):
        """Создает резервную копию базы данных."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_before_cleanup_{timestamp}.db"
        backup_path = f"/app/backups/{backup_name}"
        
        try:
            # Создаем директорию backups если её нет
            os.makedirs("/app/backups", exist_ok=True)
            
            success = await self.db_manager.backup_database(backup_path)
            if success:
                logger.info(f"Резервная копия создана: {backup_path}")
                return backup_path
            else:
                logger.warning("Не удалось создать резервную копию")
                return None
        except Exception as e:
            logger.error(f"Ошибка создания резервной копии: {e}")
            return None
    
    async def verify_cleanup(self):
        """Проверка результатов очистки."""
        logger.info("Проверка результатов очистки...")
        
        try:
            counts, total_records = await self.get_current_data_stats()
            
            if total_records == 0:
                logger.info("✅ База данных полностью очищена")
                return True
            else:
                logger.warning(f"⚠️ В базе данных остались записи: {total_records}")
                return False
                
        except Exception as e:
            logger.error(f"Ошибка проверки очистки: {e}")
            return False
    
    async def full_cleanup(self, create_backup_flag: bool = True):
        """Выполняет полную очистку всех данных."""
        logger.info("="*60)
        logger.info("НАЧИНАЕМ ПОЛНУЮ ОЧИСТКУ ДАННЫХ")
        logger.info("="*60)
        
        start_time = datetime.now()
        
        try:
            # Получаем статистику до очистки
            logger.info("Статистика ДО очистки:")
            counts_before, total_before = await self.get_current_data_stats()
            
            # Создаем резервную копию если запрошено
            if create_backup_flag and total_before > 0:
                await self.create_backup()
            
            # Очищаем базу данных
            db_success = await self.reset_database()
            
            # Проверяем результат
            cleanup_success = await self.verify_cleanup()
            
            # Финальная статистика
            end_time = datetime.now()
            duration = end_time - start_time
            
            logger.info("="*60)
            logger.info("РЕЗУЛЬТАТЫ ОЧИСТКИ:")
            logger.info(f"Время выполнения: {duration}")
            logger.info(f"База данных: {'✅ Очищена' if db_success else '❌ Ошибка'}")
            logger.info(f"Проверка: {'✅ Успешно' if cleanup_success else '❌ Остались данные'}")
            logger.info("="*60)
            
            return db_success and cleanup_success
            
        except Exception as e:
            logger.error(f"Критическая ошибка при очистке: {e}")
            return False

async def main():
    """Главная функция скрипта."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Скрипт очистки данных FundChain (Docker версия)"
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Не создавать резервную копию перед очисткой'
    )
    
    parser.add_argument(
        '--stats-only',
        action='store_true',
        help='Только показать статистику данных без очистки'
    )
    
    args = parser.parse_args()
    
    # Создаем экземпляр очистки данных
    cleanup = SimpleDataCleanup()
    
    try:
        await cleanup.initialize()
        
        if args.stats_only:
            # Только статистика
            await cleanup.get_current_data_stats()
        else:
            # Полная очистка
            create_backup = not args.no_backup
            success = await cleanup.full_cleanup(create_backup_flag=create_backup)
            
            if success:
                print("\n✅ Очистка данных завершена успешно!")
                print("Теперь можно запускать тестирование.")
            else:
                print("\n❌ Очистка данных завершилась с ошибками!")
                print("Проверьте логи для получения подробной информации.")
                sys.exit(1)
                
    except KeyboardInterrupt:
        logger.info("Очистка прервана пользователем")
        print("\n⚠️ Очистка прервана пользователем")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        print(f"\n❌ Критическая ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())