#!/bin/bash

# Script to run the 10-participant test with finalization inside the Docker container
echo "🚀 Запуск тестового сценария с 10 участниками (включая финализацию голосования)..."

# Check if Docker containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Docker containers are not running. Starting them..."
    docker-compose up -d
    # Wait for services to start
    sleep 10
fi

# Run the test inside the backend container
echo "🧪 Выполнение теста внутри Docker-контейнера..."
docker-compose exec -T backend python3 /app/scripts/test_10_participants.py

# Check the test status
if [ $? -ne 0 ]; then
    echo "❌ Тест завершился с ошибкой"
    exit 1
fi

echo "✅ Тест успешно завершен"
echo "🔍 Проверка результатов в веб-интерфейсе..."
echo "📊 Откройте http://localhost:3000 для просмотра результатов"

# Optional: can add a curl check to verify results are available
echo "💻 Выполняем проверку API для подтверждения результатов голосования..."
curl -s http://localhost:8000/api/v1/votes/priority/summary | grep -q "project_id" && \
    echo "✅ Результаты голосования успешно созданы и доступны через API" || \
    echo "❌ Результаты голосования не найдены через API"

echo "📋 Тестирование завершено"