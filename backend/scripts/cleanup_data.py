#!/usr/bin/env python3
"""
Скрипт очистки данных для FundChain
Очищает все тестовые данные перед запуском нового тестирования
"""

import asyncio
import os
import sys
import shutil
from datetime import datetime
import logging
from pathlib import Path

# Добавляем пути для импорта модулей приложения
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root / "backend"))

try:
    from backend.app.database import get_db_manager, DatabaseManager
    from backend.app.models import Base
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    print("Убедитесь, что вы запускаете скрипт из корневой директории проекта")
    sys.exit(1)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(project_root / 'logs' / 'cleanup.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)

class DataCleanup:
    """Класс для очистки данных приложения."""
    
    def __init__(self):
        self.project_root = project_root
        self.db_manager = None
        self.backup_dir = self.project_root / "backups"
        self.logs_dir = self.project_root / "logs"
        
        # Создаем директории если их нет
        self.backup_dir.mkdir(exist_ok=True)
        self.logs_dir.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Инициализация менеджера базы данных."""
        try:
            self.db_manager = get_db_manager()
            logger.info("Менеджер базы данных инициализирован")
        except Exception as e:
            logger.error(f"Ошибка инициализации базы данных: {e}")
            raise
    
    async def create_backup(self, backup_name: str = None):
        """Создает резервную копию базы данных перед очисткой."""
        if backup_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_before_cleanup_{timestamp}.db"
        
        backup_path = self.backup_dir / backup_name
        
        try:
            success = await self.db_manager.backup_database(str(backup_path))
            if success:
                logger.info(f"Резервная копия создана: {backup_path}")
                return str(backup_path)
            else:
                logger.warning("Не удалось создать резервную копию")
                return None
        except Exception as e:
            logger.error(f"Ошибка создания резервной копии: {e}")
            return None
    
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
            await self.db_manager.vacuum_database()
            logger.info("Оптимизация базы данных завершена")
            
            return True
            
        except Exception as e:
            logger.error(f"Ошибка очистки базы данных: {e}")
            return False
    
    def cleanup_log_files(self):
        """Очистка старых лог-файлов."""
        logger.info("Очистка старых лог-файлов...")
        
        try:
            log_files = list(self.logs_dir.glob("*.log"))
            cleaned_count = 0
            
            for log_file in log_files:
                if log_file.name != "cleanup.log":  # Оставляем текущий лог
                    try:
                        # Очищаем содержимое файла, но не удаляем его
                        with open(log_file, 'w') as f:
                            f.write("")
                        cleaned_count += 1
                        logger.info(f"Очищен лог-файл: {log_file.name}")
                    except Exception as e:
                        logger.warning(f"Не удалось очистить {log_file.name}: {e}")
            
            logger.info(f"Очищено {cleaned_count} лог-файлов")
            
        except Exception as e:
            logger.error(f"Ошибка очистки лог-файлов: {e}")
    
    def cleanup_temp_files(self):
        """Очистка временных файлов."""
        logger.info("Очистка временных файлов...")
        
        temp_patterns = [
            "*.tmp",
            "*.temp",
            "*~",
            "*.pyc",
            "__pycache__/*",
            ".pytest_cache/*"
        ]
        
        cleaned_count = 0
        
        for pattern in temp_patterns:
            try:
                temp_files = list(self.project_root.rglob(pattern))
                for temp_file in temp_files:
                    try:
                        if temp_file.is_file():
                            temp_file.unlink()
                            cleaned_count += 1
                        elif temp_file.is_dir():
                            shutil.rmtree(temp_file)
                            cleaned_count += 1
                    except Exception as e:
                        logger.warning(f"Не удалось удалить {temp_file}: {e}")
                        
            except Exception as e:
                logger.warning(f"Ошибка поиска файлов по паттерну {pattern}: {e}")
        
        if cleaned_count > 0:
            logger.info(f"Удалено {cleaned_count} временных файлов")
        else:
            logger.info("Временных файлов для удаления не найдено")
    
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
            
            # Очищаем файлы
            self.cleanup_log_files()
            self.cleanup_temp_files()
            
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
        description="Скрипт очистки данных FundChain",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:
  python cleanup_data.py                    # Полная очистка с резервной копией
  python cleanup_data.py --no-backup       # Полная очистка без резервной копии
  python cleanup_data.py --stats-only      # Только показать статистику
        """
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
    cleanup = DataCleanup()
    
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