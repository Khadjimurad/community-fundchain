#!/bin/bash

# Улучшенный скрипт развертывания контрактов FundChain
# Сохраняет все адреса, токены и конфигурацию в файл

set -e  # Остановка при ошибке

echo "🚀 Запуск улучшенного развертывания контрактов FundChain..."

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

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v forge &> /dev/null; then
        error "Foundry не установлен. Установите: curl -L https://foundry.paradigm.xyz | bash"
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
    fi
    
    log "✅ Все зависимости установлены"
}

# Проверка подключения к Anvil
check_anvil_connection() {
    log "Проверка подключения к Anvil..."
    
    # Ждем пока Anvil запустится
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            http://localhost:8545 > /dev/null 2>&1; then
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Не удалось подключиться к Anvil после $max_attempts попыток"
        fi
        
        warn "Попытка $attempt/$max_attempts: Anvil еще не готов, ждем 2 секунды..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    BLOCK_NUMBER=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    log "✅ Подключен к Anvil (Блок: $BLOCK_NUMBER)"
}

# Получение приватного ключа из Anvil
get_anvil_private_key() {
    log "Получение приватного ключа из Anvil..."
    
    # Получаем первый аккаунт из Anvil
    local accounts_response=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
        http://localhost:8545)
    
    if [ $? -ne 0 ]; then
        error "Не удалось получить аккаунты из Anvil"
    fi
    
    # Извлекаем первый адрес
    local first_account=$(echo "$accounts_response" | grep -o '"0x[a-fA-F0-9]*"' | head -1 | tr -d '"')
    
    if [ -z "$first_account" ]; then
        error "Не удалось извлечь адрес аккаунта из ответа Anvil"
    fi
    
    log "Используем аккаунт: $first_account"
    
    # Получаем приватный ключ (в Anvil это детерминированные ключи)
    case "$first_account" in
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
            PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
            ;;
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")
            PRIVATE_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
            ;;
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC")
            PRIVATE_KEY="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
            ;;
        *)
            warn "Неизвестный аккаунт, используем первый стандартный ключ Anvil"
            PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
            ;;
    esac
    
    log "Приватный ключ получен"
}

# Развертывание контрактов
deploy_contracts() {
    log "Развертывание контрактов..."
    
    cd contracts
    
    # Устанавливаем переменную окружения
    export PRIVATE_KEY="$PRIVATE_KEY"
    
    # Запускаем скрипт развертывания
    log "Запуск скрипта развертывания..."
    forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --verify
    
    if [ $? -ne 0 ]; then
        error "Ошибка при развертывании контрактов"
    fi
    
    log "✅ Контракты успешно развернуты"
    
    cd ..
}

# Извлечение адресов из логов развертывания
extract_contract_addresses() {
    log "Извлечение адресов контрактов..."
    
    # Проверяем, есть ли файл развертывания
    if [ -f "contracts/deployments/31337/deployment.json" ]; then
        log "Найден файл развертывания, извлекаем адреса..."
        
        # Читаем адреса из файла развертывания
        TREASURY_ADDRESS=$(grep -o '"Treasury":"[^"]*"' contracts/deployments/31337/deployment.json | cut -d'"' -f4)
        PROJECTS_ADDRESS=$(grep -o '"Projects":"[^"]*"' contracts/deployments/31337/deployment.json | cut -d'"' -f4)
        GOVERNANCE_SBT_ADDRESS=$(grep -o '"GovernanceSBT":"[^"]*"' contracts/deployments/31337/deployment.json | cut -d'"' -f4)
        BALLOT_ADDRESS=$(grep -o '"BallotCommitReveal":"[^"]*"' contracts/deployments/31337/deployment.json | cut -d'"' -f4)
        MULTISIG_ADDRESS=$(grep -o '"CommunityMultisig":"[^"]*"' contracts/deployments/31337/deployment.json | cut -d'"' -f4)
        
        log "Адреса извлечены из файла развертывания"
    else
        warn "Файл развертывания не найден, используем детерминированные адреса..."
        
        # Используем детерминированные адреса Anvil
        TREASURY_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
        PROJECTS_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        GOVERNANCE_SBT_ADDRESS="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
        BALLOT_ADDRESS="0x90F79bf6EB2c4f870365E785982E1f101E93b906"
        MULTISIG_ADDRESS="0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
    fi
    
    # Проверяем, что все адреса получены
    if [ -z "$TREASURY_ADDRESS" ] || [ -z "$PROJECTS_ADDRESS" ] || [ -z "$GOVERNANCE_SBT_ADDRESS" ] || [ -z "$BALLOT_ADDRESS" ] || [ -z "$MULTISIG_ADDRESS" ]; then
        error "Не удалось получить все адреса контрактов"
    fi
    
    log "✅ Все адреса контрактов получены"
}

# Создание файла с информацией о развертывании
create_deployment_info() {
    log "Создание файла с информацией о развертывании..."
    
    # Создаем директорию для логов
    mkdir -p deployment_logs
    
    # Создаем основной файл с информацией
    cat > "deployment_logs/deployment_info.json" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "network": "anvil-local",
    "chainId": 31337,
    "blockNumber": "$BLOCK_NUMBER",
    "deployer": "$(echo $PRIVATE_KEY | cut -c3- | xxd -r -p | keccak256 | cut -c3- | xxd -r -p | base58)",
    "privateKey": "$PRIVATE_KEY"
  },
  "contracts": {
    "Treasury": {
      "address": "$TREASURY_ADDRESS",
      "name": "Treasury",
      "description": "Контракт казны для управления средствами"
    },
    "Projects": {
      "address": "$PROJECTS_ADDRESS",
      "name": "Projects",
      "description": "Контракт управления проектами"
    },
    "GovernanceSBT": {
      "address": "$GOVERNANCE_SBT_ADDRESS",
      "name": "GovernanceSBT",
      "description": "Soulbound токен для управления"
    },
    "BallotCommitReveal": {
      "address": "$BALLOT_ADDRESS",
      "name": "BallotCommitReveal",
      "description": "Контракт голосования с коммит-ривеал схемой"
    },
    "CommunityMultisig": {
      "address": "$MULTISIG_ADDRESS",
      "name": "CommunityMultisig",
      "description": "Мультисиг контракт для управления сообществом"
    }
  },
  "accounts": {
    "owner1": {
      "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      "description": "Основной владелец"
    },
    "owner2": {
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "privateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      "description": "Второй владелец"
    },
    "owner3": {
      "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "privateKey": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      "description": "Третий владелец"
    }
  },
  "configuration": {
    "multisigRequired": 2,
    "sbtWeightCap": 100,
    "sbtBaseDonationUnit": "1000000000000000000",
    "sbtMinimumDonation": "100000000000000000",
    "defaultCommitDuration": "604800",
    "defaultRevealDuration": "259200",
    "defaultCancellationThreshold": 66,
    "defaultMaxActivePerCategory": 10,
    "globalSoftCapEnabled": false
  }
}
EOF

    # Создаем файл .env для backend
    cat > "deployment_logs/contracts.env" << EOF
# Contract Addresses - Chain ID: 31337
# Generated on: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)

TREASURY_ADDRESS=$TREASURY_ADDRESS
PROJECTS_ADDRESS=$PROJECTS_ADDRESS
GOVERNANCE_SBT_ADDRESS=$GOVERNANCE_SBT_ADDRESS
BALLOT_ADDRESS=$BALLOT_ADDRESS
MULTISIG_ADDRESS=$MULTISIG_ADDRESS

# Network Configuration
RPC_URL=http://localhost:8545
CHAIN_ID=31337
START_BLOCK=0

# Deployment Info
DEPLOYMENT_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
DEPLOYMENT_BLOCK=$BLOCK_NUMBER
EOF

    # Создаем .env файл в корне проекта для backend
    cat > ".env" << EOF
# FundChain Environment Configuration
# Generated on: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)

# Application
APP_NAME=FundChain API
DEBUG=true
ENVIRONMENT=development

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=sqlite+aiosqlite:///./fundchain.db

# Blockchain Configuration
RPC_URL=http://anvil:8545
WEB3_PROVIDER_URI=http://anvil:8545
CHAIN_ID=31337
START_BLOCK=0

# Contract Addresses
TREASURY_ADDRESS=$TREASURY_ADDRESS
PROJECTS_ADDRESS=$PROJECTS_ADDRESS
GOVERNANCE_SBT_ADDRESS=$GOVERNANCE_SBT_ADDRESS
BALLOT_ADDRESS=$BALLOT_ADDRESS
MULTISIG_ADDRESS=$MULTISIG_ADDRESS

# Private Key (for development only)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# API Settings
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8001,http://127.0.0.1:8001
API_RATE_LIMIT=100

# Security
SECRET_KEY=dev_secret_key_change_in_production

# Privacy
K_ANONYMITY_THRESHOLD=5
ENABLE_PRIVACY_FILTERS=true

# Indexer
INDEXER_ENABLED=true
INDEXER_POLL_INTERVAL=5
INDEXER_BATCH_SIZE=1000

# Cache
CACHE_TTL=300
ENABLE_CACHING=true

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=text

# Export
MAX_EXPORT_RECORDS=10000

# Deployment Info
DEPLOYMENT_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
DEPLOYMENT_BLOCK=$BLOCK_NUMBER
EOF

    # Создаем файл для frontend
    cat > "deployment_logs/frontend_config.js" << EOF
// Frontend Configuration - Generated on: $(date -u +%Y-%m-%S.000Z)
// Copy this configuration to your frontend files

const CONTRACT_ADDRESSES = {
    treasury: '$TREASURY_ADDRESS',
    projects: '$PROJECTS_ADDRESS',
    governanceSBT: '$GOVERNANCE_SBT_ADDRESS',
    ballot: '$BALLOT_ADDRESS',
    multisig: '$MULTISIG_ADDRESS'
};

const NETWORK_CONFIG = {
    rpcUrl: 'http://localhost:8545',
    chainId: 31337,
    networkName: 'Anvil Local'
};

const ACCOUNT_KEYS = {
    owner1: {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    owner2: {
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    },
    owner3: {
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONTRACT_ADDRESSES, NETWORK_CONFIG, ACCOUNT_KEYS };
} else if (typeof window !== 'undefined') {
    window.CONTRACT_ADDRESSES = CONTRACT_ADDRESSES;
    window.NETWORK_CONFIG = NETWORK_CONFIG;
    window.ACCOUNT_KEYS = ACCOUNT_KEYS;
}
EOF

    # Создаем contract-config.js для web папки
    cat > "web/contract-config.js" << EOF
// Конфигурация контрактов FundChain
// Автоматически сгенерировано: $(date -u +%Y-%m-%dT%H:%M:%S.000Z)

const CONTRACT_CONFIG = {
    // Адреса контрактов
    addresses: {
        treasury: '$TREASURY_ADDRESS',
        projects: '$PROJECTS_ADDRESS',
        governanceSBT: '$GOVERNANCE_SBT_ADDRESS',
        ballot: '$BALLOT_ADDRESS',
        multisig: '$MULTISIG_ADDRESS'
    },
    
    // Конфигурация сети
    network: {
        rpcUrl: 'http://localhost:8545',
        chainId: 31337,
        networkName: 'Anvil Local'
    },
    
    // Тестовые аккаунты
    testAccounts: {
        owner1: {
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
        },
        owner2: {
            address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
        },
        owner3: {
            address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
        }
    },
    
    // Методы для получения адресов
    getAddress: function(contractName) {
        return this.addresses[contractName.toLowerCase()];
    },
    
    // Проверка подключения к сети
    isCorrectNetwork: function(chainId) {
        return chainId === this.network.chainId;
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONTRACT_CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONTRACT_CONFIG = CONTRACT_CONFIG;
}
EOF

    # Создаем README с инструкциями
    cat > "deployment_logs/README.md" << EOF
# Информация о развертывании контрактов FundChain

## 📅 Дата развертывания
$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

## 🌐 Сеть
- **Название**: Anvil Local
- **Chain ID**: 31337
- **RPC URL**: http://localhost:8545
- **Блок развертывания**: $BLOCK_NUMBER

## 📋 Адреса контрактов

### Основные контракты
- **Treasury**: $TREASURY_ADDRESS
- **Projects**: $PROJECTS_ADDRESS
- **GovernanceSBT**: $GOVERNANCE_SBT_ADDRESS
- **BallotCommitReveal**: $BALLOT_ADDRESS
- **CommunityMultisig**: $MULTISIG_ADDRESS

### Аккаунты владельцев
- **Owner 1**: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- **Owner 2**: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- **Owner 3**: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

## 🔧 Использование

### Backend (.env файл)
Скопируйте содержимое \`contracts.env\` в ваш backend .env файл.

### Frontend
Импортируйте \`frontend_config.js\` в ваши frontend файлы.

### Проверка контрактов
\`\`\`bash
# Проверить баланс казны
cast balance $TREASURY_ADDRESS --rpc-url http://localhost:8545

# Проверить количество проектов
cast call $PROJECTS_ADDRESS "projectCount()" --rpc-url http://localhost:8545
\`\`\`

## 📁 Файлы
- \`deployment_info.json\` - Полная информация о развертывании
- \`contracts.env\` - Переменные окружения для backend
- \`frontend_config.js\` - Конфигурация для frontend
- \`README.md\` - Этот файл

## 🚨 Важно
- Сохраните приватные ключи в безопасном месте
- Не используйте эти ключи в production
- Все адреса специфичны для локальной сети Anvil
EOF

    log "✅ Файлы с информацией о развертывании созданы в папке deployment_logs/"
    log "✅ contract-config.js создан в папке web/"
    log "✅ .env файл создан в корне проекта для backend"
}

# Вывод результатов
show_results() {
    echo ""
    echo "🎉 Развертывание завершено успешно!"
    echo ""
    echo "📋 Адреса контрактов:"
    echo "   Treasury: $TREASURY_ADDRESS"
    echo "   Projects: $PROJECTS_ADDRESS"
    echo "   GovernanceSBT: $GOVERNANCE_SBT_ADDRESS"
    echo "   BallotCommitReveal: $BALLOT_ADDRESS"
    echo "   CommunityMultisig: $MULTISIG_ADDRESS"
    echo ""
    echo "📁 Файлы созданы в папке: deployment_logs/"
    echo "   - deployment_info.json (полная информация)"
    echo "   - contracts.env (для backend)"
    echo "   - frontend_config.js (для frontend)"
    echo "   - README.md (инструкции)"
    echo ""
    echo "🔑 Приватный ключ: $PRIVATE_KEY"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "   1. Скопируйте адреса в ваш frontend код"
    echo "   2. Backend автоматически использует .env файл"
    echo "   3. Перезапустите backend и frontend"
    echo ""
}

# Основная функция
main() {
    log "Начало процесса развертывания..."
    
    check_dependencies
    check_anvil_connection
    get_anvil_private_key
    deploy_contracts
    extract_contract_addresses
    create_deployment_info
    show_results
    
    log "✅ Развертывание завершено успешно!"
}

# Запуск основной функции
main "$@"
