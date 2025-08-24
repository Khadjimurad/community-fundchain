.PHONY: anvil build deploy backend web demo test clean help test-10-setup test-10-full test-10-quick test-10-help cleanup cleanup-quick cleanup-stats seed-10-participants

anvil:
	anvil

build:
	cd contracts && forge build

deploy:
	cd contracts && forge script script/Deploy.s.sol --broadcast --rpc-url ${RPC_URL:-http://127.0.0.1:8545}

backend:
	cd backend && uvicorn app.main:app --reload

web:
	python3 -m http.server -d web 8080

demo:
	@echo "🎬 Starting demo environment..."
	@echo "Please run in separate terminals:"
	@echo "  1. make anvil"
	@echo "  2. make deploy" 
	@echo "  3. make backend"

test:
	@echo "🧪 Running integration tests..."
	@chmod +x scripts/integration_test.sh
	@./scripts/integration_test.sh

clean:
	@echo "🧹 Cleaning build artifacts..."
	cd contracts && forge clean

# Data cleanup commands
cleanup:
	@echo "🗑️  Выполняем полную очистку данных..."
	@chmod +x scripts/cleanup.sh
	@./scripts/cleanup.sh

cleanup-quick:
	@echo "⚡ Выполняем быструю очистку данных..."
	@chmod +x scripts/cleanup.sh
	@./scripts/cleanup.sh --quick

cleanup-stats:
	@echo "📊 Показываем статистику данных..."
	@chmod +x scripts/cleanup.sh
	@./scripts/cleanup.sh --stats

# Data seeding commands
seed-10-participants:
	@echo "🌱 Creating seed data for 10 participants..."
	@docker-compose exec backend python3 /app/scripts/seed_10_participants_container.py

# Testing with 10 participants
test-10-setup:
	@echo "🚀 Setting up test environment with 10 participants..."
	@python3 scripts/seed_10_participants.py

test-10-full:
	@echo "🧪 Running comprehensive 10-participant tests..."
	@chmod +x scripts/test_10_participants.sh
	@./scripts/test_10_participants.sh

test-10-quick:
	@echo "⚡ Running quick 10-participant tests..."
	@python3 scripts/test_10_participants.py

test-10-help:
	@echo "🧪 ТЕСТИРОВАНИЕ С 10 УЧАСТНИКАМИ"
	@echo "================================"
	@echo ""
	@echo "Доступные команды:"
	@echo "  make test-10-setup  - Создать тестовые данные для 10 участников"
	@echo "  make test-10-quick  - Быстрое тестирование основных функций"
	@echo "  make test-10-full   - Полное комплексное тестирование"
	@echo ""
	@echo "Рекомендуемая последовательность:"
	@echo "  1. Запустите сервисы: make anvil, make deploy, make backend"
	@echo "  2. Создайте данные: make test-10-setup"
	@echo "  3. Запустите тесты: make test-10-full"
	@echo ""
	@echo "Подробная документация: TESTING_10_PARTICIPANTS.md"

help:
	@echo "Available targets:"
	@echo "  anvil          - Start Anvil blockchain"
	@echo "  build          - Build smart contracts"
	@echo "  deploy         - Deploy smart contracts"
	@echo "  backend        - Start backend service"
	@echo "  web            - Serve frontend"
	@echo "  demo           - Show demo setup instructions"
	@echo "  test           - Run integration tests"
	@echo "  clean          - Clean build artifacts"
	@echo "  cleanup        - Full data cleanup with backup"
	@echo "  cleanup-quick  - Quick data cleanup without backup"
	@echo "  cleanup-stats  - Show current data statistics"
	@echo "  seed-10-participants - Create seed data for 10 participants"
	@echo "  help           - Show this help"
	@echo ""
	@echo "🧪 Testing with 10 participants:"
	@echo "  test-10-setup  - Setup test environment with 10 participants"
	@echo "  test-10-full   - Run comprehensive 10-participant tests"
	@echo "  test-10-quick  - Run quick 10-participant tests"
	@echo "  test-10-help   - Show detailed testing help"
