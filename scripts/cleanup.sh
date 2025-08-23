#!/bin/bash

# Скрипт очистки данных FundChain
# Обертка для Python-скрипта очистки данных

set -euo pipefail  # Строгая обработка ошибок

# Определяем директории
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup_data.py"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
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

# Функция помощи
show_help() {
    cat << EOF
Скрипт очистки данных FundChain

ИСПОЛЬЗОВАНИЕ:
    $0 [ОПЦИИ]

ОПЦИИ:
    -h, --help          Показать эту справку
    -q, --quick         Быстрая очистка без резервной копии
    -s, --stats         Показать только статистику данных
    -f, --full          Полная очистка с резервной копией (по умолчанию)
    --no-docker         Запуск без проверки Docker (для локальной разработки)

ПРИМЕРЫ:
    $0                  # Полная очистка с резервной копией
    $0 --quick          # Быстрая очистка без резервной копии
    $0 --stats          # Только статистика
    $0 --no-docker      # Запуск без Docker

ОПИСАНИЕ:
    Этот скрипт очищает все тестовые данные из базы данных FundChain
    и подготавливает систему для нового тестирования.
    
    Скрипт выполняет:
    - Создание резервной копии базы данных (опционально)
    - Полную очистку всех таблиц базы данных
    - Очистку временных файлов и логов
    - Проверку результатов очистки

EOF
}

# Функция проверки зависимостей
check_dependencies() {
    log_info "Проверка зависимостей..."
    
    # Проверяем Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 не найден. Установите Python 3 для продолжения."
        exit 1
    fi
    
    # Проверяем существование скрипта очистки
    if [[ ! -f "$CLEANUP_SCRIPT" ]]; then
        log_error "Скрипт очистки не найден: $CLEANUP_SCRIPT"
        exit 1
    fi
    
    log_success "Все зависимости найдены"
}

# Функция проверки Docker (если нужно)
check_docker() {
    if [[ "$USE_DOCKER" == "true" ]]; then
        log_info "Проверка Docker контейнеров..."
        
        if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
            log_error "Docker не найден. Установите Docker или используйте опцию --no-docker"
            exit 1
        fi
        
        # Проверяем статус контейнеров
        if command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        
        cd "$PROJECT_ROOT"
        
        # Проверяем, запущены ли контейнеры
        if $COMPOSE_CMD ps | grep -q "Up"; then
            log_info "Docker контейнеры запущены"
        else
            log_warning "Docker контейнеры не запущены. Запускаем..."
            $COMPOSE_CMD up -d
            sleep 5  # Даем время на запуск
        fi
    fi
}

# Функция остановки сервисов перед очисткой
stop_services() {
    # Не останавливаем сервисы, так как они нужны для выполнения скрипта очистки
    log_info "Подготовка к очистке (сервисы остаются запущенными)..."
}

# Функция запуска сервисов после очистки
start_services() {
    if [[ "$USE_DOCKER" == "true" ]]; then
        log_info "Проверка статуса сервисов..."
        cd "$PROJECT_ROOT"
        
        if command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        
        # Проверяем что все сервисы запущены
        if ! $COMPOSE_CMD ps | grep -q "Up"; then
            log_info "Запуск сервисов..."
            $COMPOSE_CMD up -d
        fi
        
        log_success "Сервисы запущены"
    fi
}

# Функция запуска Python скрипта очистки
run_cleanup() {
    local args=()
    
    if [[ "$QUICK_MODE" == "true" ]]; then
        args+=(--no-backup)
    fi
    
    if [[ "$STATS_ONLY" == "true" ]]; then
        args+=(--stats-only)
    fi
    
    log_info "Запуск скрипта очистки данных..."
    
    cd "$PROJECT_ROOT"
    
    # Устанавливаем переменные окружения если нужно
    export PYTHONPATH="$PROJECT_ROOT:${PYTHONPATH:-}"
    
    # Запускаем Python скрипт через Docker если возможно, иначе локально
    if [[ "$USE_DOCKER" == "true" ]] && command -v docker-compose &> /dev/null; then
        log_info "Запуск через Docker контейнер..."
        
        # Убеждаемся что контейнер backend запущен
        if command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi
        
        # Запускаем скрипт в контейнере backend
        if $COMPOSE_CMD exec -T backend python3 /app/scripts/cleanup_docker.py "${args[@]}"; then
            log_success "Скрипт очистки выполнен успешно"
            return 0
        else
            log_error "Ошибка выполнения скрипта очистки в Docker"
            return 1
        fi
    else
        log_info "Запуск локально..."
        # Запускаем Python скрипт локально
        if python3 "$CLEANUP_SCRIPT" "${args[@]}"; then
            log_success "Скрипт очистки выполнен успешно"
            return 0
        else
            log_error "Ошибка выполнения скрипта очистки"
            return 1
        fi
    fi
}

# Функция создания директорий для логов и резервных копий
setup_directories() {
    log_info "Создание необходимых директорий..."
    
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/backups"
    
    log_success "Директории созданы"
}

# Главная функция
main() {
    # Значения по умолчанию
    QUICK_MODE="false"
    STATS_ONLY="false"
    USE_DOCKER="true"
    
    # Обработка аргументов
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -q|--quick)
                QUICK_MODE="true"
                shift
                ;;
            -s|--stats)
                STATS_ONLY="true"
                shift
                ;;
            -f|--full)
                QUICK_MODE="false"
                shift
                ;;
            --no-docker)
                USE_DOCKER="false"
                shift
                ;;
            *)
                log_error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Заголовок
    echo
    log_info "Скрипт очистки данных FundChain"
    log_info "======================================"
    
    if [[ "$STATS_ONLY" == "true" ]]; then
        log_info "Режим: Только статистика"
    elif [[ "$QUICK_MODE" == "true" ]]; then
        log_info "Режим: Быстрая очистка (без резервной копии)"
    else
        log_info "Режим: Полная очистка (с резервной копией)"
    fi
    
    if [[ "$USE_DOCKER" == "false" ]]; then
        log_info "Docker: Отключен"
    fi
    
    echo
    
    # Выполняем проверки и очистку
    check_dependencies
    setup_directories
    
    if [[ "$STATS_ONLY" == "false" ]]; then
        check_docker
        stop_services
    fi
    
    # Запускаем очистку
    if run_cleanup; then
        if [[ "$STATS_ONLY" == "false" ]]; then
            start_services
            echo
            log_success "Очистка данных завершена успешно!"
            log_info "Система готова для нового тестирования."
        fi
    else
        if [[ "$STATS_ONLY" == "false" ]]; then
            start_services
        fi
        echo
        log_error "Очистка данных завершилась с ошибками!"
        exit 1
    fi
}

# Обработка сигналов для корректного завершения
trap 'log_warning "Очистка прервана пользователем"; start_services; exit 1' INT TERM

# Запуск главной функции
main "$@"