#!/bin/bash

# Скрипт для запуска исправленного seeder'а с тестовыми данными
# Запускает seeder в backend контейнере для создания совместимых данных

set -e

echo "🚀 Запуск исправленного seeder'а для создания тестовых данных..."

# Проверяем, что backend контейнер запущен
if ! docker ps | grep -q "community-fundchain-backend"; then
    echo "❌ Backend контейнер не запущен. Запустите docker-compose up -d backend"
    exit 1
fi

# Проверяем, что файл seeder'а существует
if [ ! -f "scripts/seed_10_participants_fixed.py" ]; then
    echo "❌ Файл seed_10_participants_fixed.py не найден"
    exit 1
fi

echo "📋 Копируем исправленный seeder в backend контейнер..."

# Копируем исправленный seeder в backend контейнер
docker cp scripts/seed_10_participants_fixed.py community-fundchain-backend-1:/app/seed_10_participants_fixed.py

echo "🔧 Запускаем seeder в backend контейнере..."

# Запускаем seeder в backend контейнере
docker exec -it community-fundchain-backend-1 python /app/seed_10_participants_fixed.py

echo "✅ Seeder завершен!"
echo ""
echo "📊 Теперь у вас есть:"
echo "   - 10 участников с реальными адресами"
echo "   - 3 проекта с реальными ID из смарт-контрактов"
echo "   - Реалистичные пожертвования и распределения"
echo "   - Данные для полного цикла тестирования"
echo ""
echo "🌐 Откройте http://localhost:3000 для тестирования!"
