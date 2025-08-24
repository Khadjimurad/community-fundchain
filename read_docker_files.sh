#!/bin/bash

# Скрипт для чтения файлов из Docker контейнеров FundChain
# Полезно для получения логов, конфигурации и других файлов

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Проверка Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker не запущен или нет прав"
    fi
    
    log "✅ Docker доступен"
}

# Список контейнеров
list_containers() {
    log "Доступные контейнеры:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
}

# Чтение файлов из backend контейнера
read_backend_files() {
    local container_name="community-fundchain-backend-1"
    
    if ! docker ps | grep -q "$container_name"; then
        warn "Контейнер $container_name не запущен"
        return
    fi
    
    log "Чтение файлов из backend контейнера..."
    
    # Создаем директорию для файлов
    mkdir -p docker_files/backend
    
    # Читаем основные файлы
    log "Копирование основных файлов..."
    
    # Конфигурация
    docker cp "$container_name:/app/config.py" "docker_files/backend/" 2>/dev/null || warn "Не удалось скопировать config.py"
    
    # База данных
    docker cp "$container_name:/app/fundchain.db" "docker_files/backend/" 2>/dev/null || warn "Не удалось скопировать fundchain.db"
    
    # Логи
    docker exec "$container_name" find /app -name "*.log" -type f 2>/dev/null | while read -r log_file; do
        if [ -n "$log_file" ]; then
            local filename=$(basename "$log_file")
            docker cp "$container_name:$log_file" "docker_files/backend/" 2>/dev/null || warn "Не удалось скопировать $filename"
        fi
    done
    
    # Переменные окружения
    docker exec "$container_name" env > "docker_files/backend/environment.txt" 2>/dev/null || warn "Не удалось получить переменные окружения"
    
    # Содержимое директории
    docker exec "$container_name" ls -la /app > "docker_files/backend/directory_contents.txt" 2>/dev/null || warn "Не удалось получить содержимое директории"
    
    log "✅ Файлы backend скопированы в docker_files/backend/"
}

# Чтение файлов из frontend контейнера
read_frontend_files() {
    local container_name="community-fundchain-frontend-1"
    
    if ! docker ps | grep -q "$container_name"; then
        warn "Контейнер $container_name не запущен"
        return
    fi
    
    log "Чтение файлов из frontend контейнера..."
    
    # Создаем директорию для файлов
    mkdir -p docker_files/frontend
    
    # Читаем основные файлы
    log "Копирование основных файлов..."
    
    # HTML файлы
    docker exec "$container_name" find /usr/share/nginx/html -name "*.html" -type f 2>/dev/null | while read -r html_file; do
        if [ -n "$html_file" ]; then
            local filename=$(basename "$html_file")
            docker cp "$container_name:$html_file" "docker_files/frontend/" 2>/dev/null || warn "Не удалось скопировать $filename"
        fi
    done
    
    # JavaScript файлы
    docker exec "$container_name" find /usr/share/nginx/html -name "*.js" -type f 2>/dev/null | while read -r js_file; do
        if [ -n "$js_file" ]; then
            local filename=$(basename "$js_file")
            docker cp "$container_name:$js_file" "docker_files/frontend/" 2>/dev/null || warn "Не удалось скопировать $filename"
        fi
    done
    
    # Конфигурация nginx
    docker cp "$container_name:/etc/nginx/nginx.conf" "docker_files/frontend/" 2>/dev/null || warn "Не удалось скопировать nginx.conf"
    
    # Содержимое директории
    docker exec "$container_name" ls -la /usr/share/nginx/html > "docker_files/frontend/directory_contents.txt" 2>/dev/null || warn "Не удалось получить содержимое директории"
    
    log "✅ Файлы frontend скопированы в docker_files/frontend/"
}

# Чтение файлов из anvil контейнера
read_anvil_files() {
    local container_name="community-fundchain-anvil-1"
    
    if ! docker ps | grep -q "$container_name"; then
        warn "Контейнер $container_name не запущен"
        return
    fi
    
    log "Чтение файлов из anvil контейнера..."
    
    # Создаем директорию для файлов
    mkdir -p docker_files/anvil
    
    # Получаем информацию о блокчейне
    log "Получение информации о блокчейне..."
    
    # Номер последнего блока
    local block_number=$(docker exec "$container_name" cast block-number --rpc-url http://localhost:8545 2>/dev/null || echo "N/A")
    echo "Последний блок: $block_number" > "docker_files/anvil/blockchain_info.txt"
    
    # Балансы аккаунтов
    echo "Балансы аккаунтов:" >> "docker_files/anvil/blockchain_info.txt"
    docker exec "$container_name" cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545 2>/dev/null | echo "Owner 1: $(cat)" >> "docker_files/anvil/blockchain_info.txt" || echo "Owner 1: N/A" >> "docker_files/anvil/blockchain_info.txt"
    docker exec "$container_name" cast balance 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --rpc-url http://localhost:8545 2>/dev/null | echo "Owner 2: $(cat)" >> "docker_files/anvil/blockchain_info.txt" || echo "Owner 2: N/A" >> "docker_files/anvil/blockchain_info.txt"
    docker exec "$container_name" cast balance 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC --rpc-url http://localhost:8545 2>/dev/null | echo "Owner 3: $(cat)" >> "docker_files/anvil/blockchain_info.txt" || echo "Owner 3: N/A" >> "docker_files/anvil/blockchain_info.txt"
    
    # Переменные окружения
    docker exec "$container_name" env > "docker_files/anvil/environment.txt" 2>/dev/null || warn "Не удалось получить переменные окружения"
    
    log "✅ Файлы anvil скопированы в docker_files/anvil/"
}

# Чтение логов контейнеров
read_container_logs() {
    log "Чтение логов контейнеров..."
    
    mkdir -p docker_files/logs
    
    # Логи backend
    if docker ps | grep -q "community-fundchain-backend-1"; then
        log "Копирование логов backend..."
        docker logs community-fundchain-backend-1 > "docker_files/logs/backend.log" 2>&1 || warn "Не удалось получить логи backend"
    fi
    
    # Логи frontend
    if docker ps | grep -q "community-fundchain-frontend-1"; then
        log "Копирование логов frontend..."
        docker logs community-fundchain-frontend-1 > "docker_files/logs/frontend.log" 2>&1 || warn "Не удалось получить логи frontend"
    fi
    
    # Логи anvil
    if docker ps | grep -q "community-fundchain-anvil-1"; then
        log "Копирование логов anvil..."
        docker logs community-fundchain-anvil-1 > "docker_files/logs/anvil.log" 2>&1 || warn "Не удалось получить логи anvil"
    fi
    
    log "✅ Логи скопированы в docker_files/logs/"
}

# Создание сводного отчета
create_summary() {
    log "Создание сводного отчета..."
    
    cat > "docker_files/README.md" << EOF
# Файлы из Docker контейнеров FundChain

## 📅 Дата создания
$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')

## 📁 Структура файлов

### Backend (/docker_files/backend/)
- \`config.py\` - Конфигурация приложения
- \`fundchain.db\` - База данных SQLite
- \`environment.txt\` - Переменные окружения
- \`directory_contents.txt\` - Содержимое директории /app
- \`*.log\` - Логи приложения (если есть)

### Frontend (/docker_files/frontend/)
- \`*.html\` - HTML файлы
- \`*.js\` - JavaScript файлы
- \`nginx.conf\` - Конфигурация nginx
- \`directory_contents.txt\` - Содержимое директории /usr/share/nginx/html

### Anvil (/docker_files/anvil/)
- \`blockchain_info.txt\` - Информация о блокчейне
- \`environment.txt\` - Переменные окружения

### Логи (/docker_files/logs/)
- \`backend.log\` - Логи backend контейнера
- \`frontend.log\` - Логи frontend контейнера
- \`anvil.log\` - Логи anvil контейнера

## 🔧 Как использовать

### Просмотр логов
\`\`\`bash
# Логи backend
tail -f docker_files/logs/backend.log

# Логи frontend
tail -f docker_files/logs/frontend.log

# Логи anvil
tail -f docker_files/logs/anvil.log
\`\`\`

### Анализ конфигурации
\`\`\`bash
# Конфигурация backend
cat docker_files/backend/config.py

# Переменные окружения
cat docker_files/backend/environment.txt

# Конфигурация nginx
cat docker_files/frontend/nginx.conf
\`\`\`

### Проверка базы данных
\`\`\`bash
# SQLite база данных
sqlite3 docker_files/backend/fundchain.db ".tables"
sqlite3 docker_files/backend/fundchain.db "SELECT * FROM projects LIMIT 5;"
\`\`\`

## 🚨 Важно
- Файлы скопированы из запущенных контейнеров
- База данных может быть заблокирована, если контейнер запущен
- Логи могут быть большими, используйте \`tail\` для просмотра
- Некоторые файлы могут отсутствовать, если контейнеры не запущены

## 📊 Статистика
- Backend файлов: $(find docker_files/backend -type f 2>/dev/null | wc -l)
- Frontend файлов: $(find docker_files/frontend -type f 2>/dev/null | wc -l)
- Anvil файлов: $(find docker_files/anvil -type f 2>/dev/null | wc -l)
- Логов: $(find docker_files/logs -type f 2>/dev/null | wc -l)
EOF

    log "✅ Сводный отчет создан в docker_files/README.md"
}

# Основная функция
main() {
    log "Начало чтения файлов из Docker контейнеров..."
    
    check_docker
    list_containers
    
    # Читаем файлы из всех контейнеров
    read_backend_files
    read_frontend_files
    read_anvil_files
    read_container_logs
    
    # Создаем сводный отчет
    create_summary
    
    log "✅ Все файлы прочитаны и сохранены в папку docker_files/"
    echo ""
    echo "📁 Файлы сохранены в: docker_files/"
    echo "📖 Сводный отчет: docker_files/README.md"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "   1. Просмотрите README.md для понимания структуры"
    echo "   2. Изучите логи для диагностики проблем"
    echo "   3. Проверьте конфигурацию в config.py"
    echo "   4. Анализируйте базу данных fundchain.db"
    echo ""
}

# Запуск основной функции
main "$@"
