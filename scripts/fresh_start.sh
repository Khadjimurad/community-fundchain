#!/bin/bash
# Fresh Start Script for FundChain
# Полная очистка системы для чистого тестирования (БЕЗ перезапуска контейнеров)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 FundChain Fresh Start Script (Cleanup Only)${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

# Function to show help
show_help() {
    cat << EOF
Fresh Start Script for FundChain (Cleanup Only)

ИСПОЛЬЗОВАНИЕ:
    $0 [ОПЦИИ]

ОПЦИИ:
    -h, --help          Показать эту справку
    -f, --force         Принудительное выполнение без подтверждения
    --no-backup         Пропустить создание резервной копии

ПРИМЕРЫ:
    $0                  # Полная очистка с подтверждением
    $0 --force          # Без подтверждения
    $0 --no-backup      # Без резервной копии

ОПИСАНИЕ:
    Этот скрипт выполняет полную очистку системы FundChain
    для подготовки к чистому тестированию.
    
    Включает:
    - Создание резервной копии (опционально)
    - Очистку всех тестовых данных
    - Очистку контрактов и ABI файлов
    - Очистку баз данных
    - Очистку Anvil блокчейна
    
    НЕ включает:
    - Перезапуск Docker контейнеров
    - Перезапуск сервисов

EOF
}

# Function to log messages
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

# Function to check if running in project root
check_project_root() {
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "Скрипт должен запускаться из корневой директории проекта"
        log_error "Текущая директория: $(pwd)"
        exit 1
    fi
    log_success "Проверка директории проекта: OK"
}

# Function to check Docker containers
check_docker_containers() {
    log_info "Проверка Docker контейнеров..."
    
    if ! docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "community-fundchain"; then
        log_warning "Контейнеры FundChain не запущены. Запустите их вручную:"
        log_warning "docker-compose up -d"
        exit 1
    fi
    
    log_success "Контейнеры FundChain запущены"
}

# Function to create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "Создание резервной копии пропущено"
        return
    fi
    
    log_info "Создание резервной копии..."
    
    BACKUP_DIR="backups/fresh_start_${TIMESTAMP}"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if [[ -f "backend/fundchain.db" ]]; then
        cp "backend/fundchain.db" "$BACKUP_DIR/"
        log_success "База данных сохранена в $BACKUP_DIR/"
    fi
    
    # Backup deployment info
    if [[ -f "deployment_logs/deployment_info.json" ]]; then
        cp "deployment_logs/deployment_info.json" "$BACKUP_DIR/"
        log_success "Информация о деплое сохранена в $BACKUP_DIR/"
    fi
    
    # Backup contract config
    if [[ -f "web/contract-config.js" ]]; then
        cp "web/contract-config.js" "$BACKUP_DIR/"
        log_success "Конфигурация контрактов сохранена в $BACKUP_DIR/"
    fi
    
    log_success "Резервная копия создана в $BACKUP_DIR/"
}

# Function to cleanup database
cleanup_database() {
    log_info "Очистка базы данных..."
    
    if [[ -f "backend/fundchain.db" ]]; then
        rm -f "backend/fundchain.db"
        log_success "База данных удалена"
    else
        log_warning "База данных не найдена"
    fi
}

# Function to cleanup contracts and ABI files
cleanup_contracts() {
    log_info "Очистка контрактов и ABI файлов..."
    
    # Clean contracts output
    if [[ -d "contracts/out" ]]; then
        rm -rf "contracts/out"
        log_success "Папка contracts/out очищена"
    fi
    
    # Clean contracts cache
    if [[ -d "contracts/cache" ]]; then
        rm -rf "contracts/cache"
        log_success "Кэш контрактов очищен"
    fi
    
    # Clean deployment logs
    if [[ -d "deployment_logs" ]]; then
        rm -rf "deployment_logs"
        mkdir -p "deployment_logs"
        log_success "Логи деплоя очищены"
    fi
    
    # Clean contract config
    if [[ -f "web/contract-config.js" ]]; then
        rm -f "web/contract-config.js"
        log_success "Конфигурация контрактов удалена"
    fi
}

# Function to cleanup Anvil blockchain
cleanup_anvil() {
    log_info "Очистка Anvil блокчейна..."
    
    # Check if Anvil container is running
    if docker ps --format "{{.Names}}" | grep -q "community-fundchain-anvil-1"; then
        log_info "Сброс Anvil блокчейна..."
        
        # Reset Anvil to genesis
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"anvil_reset","params":[],"id":1}' \
            http://localhost:8545 > /dev/null 2>&1; then
            log_success "Anvil блокчейн сброшен"
        else
            log_warning "Не удалось сбросить Anvil блокчейн"
        fi
    else
        log_warning "Anvil контейнер не запущен"
    fi
}

# Function to cleanup test data
cleanup_test_data() {
    log_info "Очистка тестовых данных..."
    
    # Clean test logs
    if [[ -d "logs" ]]; then
        rm -rf "logs"
        mkdir -p "logs"
        log_success "Логи тестов очищены"
    fi
    
    # Clean test outputs
    find . -name "*.log" -type f -delete 2>/dev/null || true
    find . -name "test_*.pyc" -type f -delete 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    
    log_success "Тестовые данные очищены"
}

# Function to cleanup backend data
cleanup_backend() {
    log_info "Очистка данных backend..."
    
    # Clean backend database
    if [[ -f "backend/fundchain.db" ]]; then
        rm -f "backend/fundchain.db"
        log_success "Backend база данных удалена"
    fi
    
    # Clean backend cache
    if [[ -d "backend/__pycache__" ]]; then
        rm -rf "backend/__pycache__"
        log_success "Backend кэш очищен"
    fi
    
    # Clean backend logs
    if [[ -d "backend/logs" ]]; then
        rm -rf "backend/logs"
        mkdir -p "backend/logs"
        log_success "Backend логи очищены"
    fi
}

# Function to cleanup frontend data
cleanup_frontend() {
    log_info "Очистка данных frontend..."
    
    # Clean frontend cache
    if [[ -d "web/.cache" ]]; then
        rm -rf "web/.cache"
        log_success "Frontend кэш очищен"
    fi
    
    # Clean frontend logs
    if [[ -d "web/logs" ]]; then
        rm -rf "web/logs"
        mkdir -p "web/logs"
        log_success "Frontend логи очищены"
    fi
}

# Function to show cleanup summary
show_cleanup_summary() {
    echo ""
    echo -e "${GREEN}🎉 Очистка завершена успешно!${NC}"
    echo ""
    echo -e "${BLUE}Что было очищено:${NC}"
    echo "  ✅ База данных"
    echo "  ✅ Контракты и ABI файлы"
    echo "  ✅ Anvil блокчейн"
    echo "  ✅ Тестовые данные"
    echo "  ✅ Backend данные"
    echo "  ✅ Frontend данные"
    echo ""
    echo -e "${BLUE}Следующие шаги:${NC}"
    echo "  1. Запустите скрипт деплоя: ./deploy_contracts_improved.sh"
    echo "  2. Запустите тестовые скрипты: ./test/run_full_test_cycle.sh"
    echo ""
    echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Контейнеры НЕ были перезапущены!${NC}"
    echo "  Если нужен перезапуск, выполните: docker-compose restart"
}

# Main execution
main() {
    # Parse command line arguments
    SKIP_BACKUP="false"
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
            *)
                log_error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Check if running in project root
    check_project_root
    
    # Check Docker containers
    check_docker_containers
    
    # Show warning and ask for confirmation
    if [[ "$FORCE" != "true" ]]; then
        echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные!${NC}"
        echo ""
        echo "Будет очищено:"
        echo "  - База данных"
        echo "  - Контракты и ABI файлы"
        echo "  - Anvil блокчейн"
        echo "  - Тестовые данные"
        echo "  - Backend и Frontend данные"
        echo ""
        echo -e "${YELLOW}Контейнеры НЕ будут перезапущены!${NC}"
        echo ""
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Очистка отменена"
            exit 0
        fi
    fi
    
    # Create backup
    create_backup
    
    # Perform cleanup
    cleanup_database
    cleanup_contracts
    cleanup_anvil
    cleanup_test_data
    cleanup_backend
    cleanup_frontend
    
    # Show summary
    show_cleanup_summary
}

# Run main function
main "$@"
