#!/bin/bash

# Универсальный скрипт развертывания FundChain
# Выполняет полную очистку, запуск контейнеров и деплой контрактов

set -e  # Остановка при ошибке

echo "🚀 FundChain - Полное развертывание системы"
echo "============================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция для показа справки
show_help() {
    cat << EOF
Универсальный скрипт развертывания FundChain

ИСПОЛЬЗОВАНИЕ:
    $0 [ОПЦИИ]

ОПЦИИ:
    -h, --help          Показать эту справку
    -f, --force         Принудительное выполнение без подтверждения
    --no-backup         Пропустить создание резервной копии
    --skip-cleanup      Пропустить очистку (если контейнеры уже запущены)

ПРИМЕРЫ:
    $0                  # Полное развертывание с подтверждением
    $0 --force          # Без подтверждения
    $0 --skip-cleanup   # Пропустить очистку

ОПИСАНИЕ:
    Этот скрипт выполняет полное развертывание системы FundChain:
    1. Очистка всех данных (опционально)
    2. Запуск Docker контейнеров
    3. Развертывание смарт-контрактов
    4. Настройка системы для тестирования

EOF
}

# Функция проверки директории проекта
check_project_root() {
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "Скрипт должен запускаться из корневой директории проекта"
        log_error "Текущая директория: $(pwd)"
        exit 1
    fi
    log_success "Проверка директории проекта: OK"
}

# Функция создания резервной копии
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_info "Создание резервной копии пропущено"
        return 0
    fi
    
    log_info "Создание резервной копии..."
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="backups/deploy_everything_${TIMESTAMP}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Копируем важные файлы
    if [[ -f "backend/fundchain.db" ]]; then
        cp "backend/fundchain.db" "$BACKUP_DIR/"
        log_success "База данных сохранена в $BACKUP_DIR/"
    fi
    
    if [[ -d "deployment_logs" ]]; then
        cp -r "deployment_logs" "$BACKUP_DIR/"
        log_success "Логи деплоя сохранены в $BACKUP_DIR/"
    fi
    
    if [[ -d "contracts/out" ]]; then
        cp -r "contracts/out" "$BACKUP_DIR/"
        log_success "Контракты сохранены в $BACKUP_DIR/"
    fi
    
    log_success "Резервная копия создана в $BACKUP_DIR/"
}

# Функция очистки системы
cleanup_system() {
    if [[ "$SKIP_CLEANUP" == "true" ]]; then
        log_info "Очистка пропущена"
        return 0
    fi
    
    log_info "Выполнение полной очистки системы..."
    
    # Останавливаем и удаляем контейнеры
    if docker ps --format "table {{.Names}}" | grep -q "community-fundchain"; then
        log_info "Остановка и удаление контейнеров FundChain..."
        docker-compose down
        log_success "Контейнеры FundChain остановлены и удалены"
    fi
    
    # Очищаем базу данных
    if [[ -f "backend/fundchain.db" ]]; then
        rm -f "backend/fundchain.db"
        log_success "База данных удалена"
    fi
    
    # Очищаем контракты и ABI файлы
    if [[ -d "contracts/out" ]]; then
        rm -rf "contracts/out"
        log_success "Папка contracts/out очищена"
    fi
    
    if [[ -d "contracts/cache" ]]; then
        rm -rf "contracts/cache"
        log_success "Кэш контрактов очищен"
    fi
    
    # Очищаем логи деплоя
    if [[ -d "deployment_logs" ]]; then
        rm -rf "deployment_logs"
        log_success "Логи деплоя очищены"
    fi
    
    # Очищаем тестовые данные
    if [[ -d "logs" ]]; then
        rm -rf "logs"
        mkdir -p "logs"
        log_success "Логи тестов очищены"
    fi
    
    # Очищаем backend данные
    if [[ -d "backend/__pycache__" ]]; then
        rm -rf "backend/__pycache__"
        log_success "Backend кэш очищен"
    fi
    
    log_success "Очистка системы завершена"
}

# Функция запуска контейнеров
start_containers() {
    log_info "Запуск Docker контейнеров..."
    
    docker-compose up -d
    
    # Ждем запуска контейнеров
    log_info "Ожидание запуска контейнеров..."
    sleep 10
    
    # Проверяем статус
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
        log_success "Контейнеры запущены успешно"
    else
        log_error "Ошибка запуска контейнеров"
        exit 1
    fi
}

# Функция проверки зависимостей
check_dependencies() {
    log_info "Проверка зависимостей..."
    
    if ! command -v forge &> /dev/null; then
        log_error "Foundry не установлен. Установите: curl -L https://foundry.paradigm.xyz | bash"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен"
        exit 1
    fi
    
    log_success "Все зависимости установлены"
}

# Функция проверки подключения к Anvil
check_anvil_connection() {
    log_info "Проверка подключения к Anvil..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:8545 > /dev/null 2>&1; then
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Не удалось подключиться к Anvil после $max_attempts попыток"
            exit 1
        fi
        
        log_info "Попытка $attempt/$max_attempts: Anvil еще не готов, ждем 2 секунды..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    local block_number=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    log_success "Подключен к Anvil (Блок: $block_number)"
}

# Функция развертывания контрактов
deploy_contracts() {
    log_info "Развертывание смарт-контрактов..."
    
    # Создаем директорию для артефактов деплоя
    log_info "Подготовка директорий для деплоя..."
    mkdir -p "deployments/31337"
    
    cd contracts
    
    # Компилируем контракты
    log_info "Компиляция контрактов..."
    forge build
    
    # Получаем приватный ключ первого аккаунта Anvil
    log_info "Получение приватного ключа для деплоя..."
    local private_key="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    
    # Разворачиваем контракты с установкой переменной окружения
    log_info "Развертывание контрактов..."
    PRIVATE_KEY="$private_key" forge script script/Deploy.s.sol --broadcast --rpc-url http://127.0.0.1:8545
    
    cd ..
    
    # Копируем ABI файлы в backend контейнер для тестирования
    log_info "Копирование ABI файлов в backend контейнер..."
    if docker ps | grep -q "community-fundchain-backend-1"; then
        docker cp contracts/out community-fundchain-backend-1:/app/
        log_success "ABI файлы скопированы в backend контейнер"
    else
        log_warning "Backend контейнер не запущен, ABI файлы не скопированы"
    fi
    
    # Копируем файл деплоя для автоматической загрузки адресов
    log_info "Копирование файла деплоя в backend контейнер..."
    if docker ps | grep -q "community-fundchain-backend-1"; then
        mkdir -p "contracts/broadcast/Deploy.s.sol/31337"
        docker cp contracts/broadcast/Deploy.s.sol/31337/run-latest.json community-fundchain-backend-1:/app/contracts/broadcast/Deploy.s.sol/31337/
        log_success "Файл деплоя скопирован в backend контейнер"
    else
        log_warning "Backend контейнер не запущен, файл деплоя не скопирован"
    fi
    
    log_success "Контракты развернуты успешно"
}

# Функция показа результатов
show_results() {
    echo ""
    echo -e "${GREEN}🎉 Развертывание завершено успешно!${NC}"
    echo ""
    echo -e "${BLUE}Что было выполнено:${NC}"
    echo "  ✅ Система очищена"
    echo "  ✅ Docker контейнеры запущены"
    echo "  ✅ Смарт-контракты развернуты"
    echo "  ✅ Система готова к тестированию"
    echo ""
    echo -e "${BLUE}Следующие шаги:${NC}"
    echo "  1. Запустите тесты: ./test/run_full_test_cycle.sh"
    echo "  2. Или отдельные тесты:"
    echo "     - python3 test/00_fund_accounts.py"
    echo "     - python3 test/01_seed_real_data.py"
    echo ""
    echo -e "${BLUE}Полезные команды:${NC}"
    echo "  - Просмотр логов: docker-compose logs -f"
    echo "  - Остановка: docker-compose down"
    echo "  - Перезапуск: docker-compose restart"
}

# Основная функция
main() {
    # Парсинг аргументов командной строки
    SKIP_BACKUP="false"
    SKIP_CLEANUP="false"
    FORCE="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            --no-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            --skip-cleanup)
                SKIP_CLEANUP="true"
                shift
                ;;
            *)
                log_error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Проверка директории проекта
    check_project_root
    
    # Проверка зависимостей
    check_dependencies
    
    # Показ предупреждения и запрос подтверждения
    if [[ "$FORCE" != "true" ]]; then
        echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Этот скрипт выполнит полное развертывание системы!${NC}"
        echo ""
        echo "Будет выполнено:"
        if [[ "$SKIP_CLEANUP" != "true" ]]; then
            echo "  - Полная очистка всех данных"
        fi
        echo "  - Запуск Docker контейнеров"
        echo "  - Развертывание смарт-контрактов"
        echo "  - Настройка системы"
        echo ""
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Развертывание отменено"
            exit 0
        fi
    fi
    
    # Выполнение этапов
    create_backup
    cleanup_system
    start_containers
    check_anvil_connection
    deploy_contracts
    
    # Показ результатов
    show_results
}

# Запуск основной функции
main "$@"
