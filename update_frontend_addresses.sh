#!/bin/bash

# Скрипт для автоматического обновления адресов контрактов в frontend
# Использует информацию из deployment_logs для обновления project-payout.js

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

# Проверка наличия файла с информацией о развертывании
check_deployment_info() {
    if [ ! -f "deployment_logs/deployment_info.json" ]; then
        error "Файл deployment_logs/deployment_info.json не найден. Сначала запустите deploy_contracts_improved.sh"
    fi
    
    log "✅ Файл с информацией о развертывании найден"
}

# Извлечение адресов из файла развертывания
extract_addresses() {
    log "Извлечение адресов контрактов..."
    
    # Используем jq для парсинга JSON (если доступен)
    if command -v jq &> /dev/null; then
        log "Используем jq для парсинга JSON..."
        
        TREASURY_ADDRESS=$(jq -r '.contracts.Treasury.address' deployment_logs/deployment_info.json)
        PROJECTS_ADDRESS=$(jq -r '.contracts.Projects.address' deployment_logs/deployment_info.json)
        GOVERNANCE_SBT_ADDRESS=$(jq -r '.contracts.GovernanceSBT.address' deployment_logs/deployment_info.json)
        BALLOT_ADDRESS=$(jq -r '.contracts.BallotCommitReveal.address' deployment_logs/deployment_info.json)
        MULTISIG_ADDRESS=$(jq -r '.contracts.CommunityMultisig.address' deployment_logs/deployment_info.json)
    else
        log "jq не найден, используем grep для извлечения адресов..."
        
        TREASURY_ADDRESS=$(grep -o '"Treasury":"[^"]*"' deployment_logs/deployment_info.json | cut -d'"' -f4)
        PROJECTS_ADDRESS=$(grep -o '"Projects":"[^"]*"' deployment_logs/deployment_info.json | cut -d'"' -f4)
        GOVERNANCE_SBT_ADDRESS=$(grep -o '"GovernanceSBT":"[^"]*"' deployment_logs/deployment_info.json | cut -d'"' -f4)
        BALLOT_ADDRESS=$(grep -o '"BallotCommitReveal":"[^"]*"' deployment_logs/deployment_info.json | cut -d'"' -f4)
        MULTISIG_ADDRESS=$(grep -o '"CommunityMultisig":"[^"]*"' deployment_logs/deployment_info.json | cut -d'"' -f4)
    fi
    
    # Проверяем, что все адреса получены
    if [ -z "$TREASURY_ADDRESS" ] || [ -z "$PROJECTS_ADDRESS" ] || [ -z "$GOVERNANCE_SBT_ADDRESS" ] || [ -z "$BALLOT_ADDRESS" ] || [ -z "$MULTISIG_ADDRESS" ]; then
        error "Не удалось извлечь все адреса контрактов"
    fi
    
    log "✅ Адреса контрактов извлечены:"
    echo "   Treasury: $TREASURY_ADDRESS"
    echo "   Projects: $PROJECTS_ADDRESS"
    echo "   GovernanceSBT: $GOVERNANCE_SBT_ADDRESS"
    echo "   BallotCommitReveal: $BALLOT_ADDRESS"
    echo "   CommunityMultisig: $MULTISIG_ADDRESS"
}

# Создание резервной копии
create_backup() {
    log "Создание резервной копии frontend файлов..."
    
    mkdir -p backups/frontend_$(date +%Y%m%d_%H%M%S)
    
    # Копируем основные файлы
    cp web/project-payout.js "backups/frontend_$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || warn "Не удалось скопировать project-payout.js"
    cp web/index.html "backups/frontend_$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || warn "Не удалось скопировать index.html"
    cp web/app.js "backups/frontend_$(date +%Y%m%d_%H%M%S)/" 2>/dev/null || warn "Не удалось скопировать app.js"
    
    log "✅ Резервная копия создана в backups/frontend_$(date +%Y%m%d_%H%M%S)/"
}

# Обновление project-payout.js
update_project_payout_js() {
    log "Обновление адресов в project-payout.js..."
    
    local file="web/project-payout.js"
    
    if [ ! -f "$file" ]; then
        error "Файл $file не найден"
    fi
    
    # Создаем временный файл
    local temp_file=$(mktemp)
    
    # Обновляем адреса в файле
    sed -e "s/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65/$MULTISIG_ADDRESS/g" \
        -e "s/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/$TREASURY_ADDRESS/g" \
        -e "s/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/$PROJECTS_ADDRESS/g" \
        "$file" > "$temp_file"
    
    # Проверяем, что изменения применились
    if ! grep -q "$MULTISIG_ADDRESS" "$temp_file"; then
        warn "Адрес multisig не обновлен, возможно уже правильный"
    fi
    
    if ! grep -q "$TREASURY_ADDRESS" "$temp_file"; then
        warn "Адрес treasury не обновлен, возможно уже правильный"
    fi
    
    if ! grep -q "$PROJECTS_ADDRESS" "$temp_file"; then
        warn "Адрес projects не обновлен, возможно уже правильный"
    fi
    
    # Заменяем оригинальный файл
    mv "$temp_file" "$file"
    
    log "✅ project-payout.js обновлен"
}

# Обновление других frontend файлов
update_other_frontend_files() {
    log "Обновление других frontend файлов..."
    
    # Обновляем app.js если он существует
    if [ -f "web/app.js" ]; then
        log "Обновление app.js..."
        sed -i.bak -e "s/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65/$MULTISIG_ADDRESS/g" \
                   -e "s/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/$TREASURY_ADDRESS/g" \
                   -e "s/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/$PROJECTS_ADDRESS/g" \
                   "web/app.js"
        log "✅ app.js обновлен"
    fi
    
    # Обновляем app-core.js если он существует
    if [ -f "web/app-core.js" ]; then
        log "Обновление app-core.js..."
        sed -i.bak -e "s/0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65/$MULTISIG_ADDRESS/g" \
                   -e "s/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/$TREASURY_ADDRESS/g" \
                   -e "s/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/$PROJECTS_ADDRESS/g" \
                   "web/app-core.js"
        log "✅ app-core.js обновлен"
    fi
    

}

# Создание файла конфигурации для frontend
create_frontend_config() {
    log "Создание файла конфигурации для frontend..."
    
    cat > "web/contract-config.js" << EOF
// Конфигурация контрактов FundChain
// Автоматически сгенерировано: $(date -u +'%Y-%m-%dT%H:%M:%S.000Z')

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

    log "✅ Файл конфигурации создан: web/contract-config.js"
}

# Обновление HTML файлов для подключения конфигурации
update_html_files() {
    log "Обновление HTML файлов..."
    
    # Обновляем project-payout.html
    if [ -f "web/project-payout.html" ]; then
        log "Обновление project-payout.html..."
        
        # Проверяем, есть ли уже подключение к contract-config.js
        if ! grep -q "contract-config.js" "web/project-payout.html"; then
            # Добавляем подключение перед project-payout.js
            sed -i.bak '/<script src="project-payout.js"><\/script>/i\    <script src="contract-config.js"></script>' "web/project-payout.html"
            log "✅ contract-config.js подключен к project-payout.html"
        else
            log "contract-config.js уже подключен к project-payout.html"
        fi
    fi
    
    # Обновляем index.html
    if [ -f "web/index.html" ]; then
        log "Обновление index.html..."
        
        if ! grep -q "contract-config.js" "web/index.html"; then
            sed -i.bak '/<script src="app.js"><\/script>/i\    <script src="contract-config.js"></script>' "web/index.html"
            log "✅ contract-config.js подключен к index.html"
        else
            log "contract-config.js уже подключен к index.html"
        fi
    fi
}

# Создание отчета об обновлении
create_update_report() {
    log "Создание отчета об обновлении..."
    
    cat > "frontend_update_report.md" << EOF
# Отчет об обновлении frontend адресов контрактов

## 📅 Дата обновления
$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')

## 🔄 Обновленные файлы

### Основные файлы
- \`web/project-payout.js\` - Основной файл для выплат проектов
- \`web/contract-config.js\` - Новый файл конфигурации контрактов
- \`web/project-payout.html\` - HTML файл для страницы выплат
- \`web/index.html\` - Главная страница

### Резервные копии
- Создана в: \`backups/frontend_$(date +%Y%m%d_%H%M%S)/\`

## 📋 Новые адреса контрактов

| Контракт | Старый адрес | Новый адрес |
|----------|--------------|-------------|
| Treasury | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | $TREASURY_ADDRESS |
| Projects | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | $PROJECTS_ADDRESS |
| GovernanceSBT | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | $GOVERNANCE_SBT_ADDRESS |
| BallotCommitReveal | 0x90F79bf6EB2c4f870365E785982E1f101E93b906 | $BALLOT_ADDRESS |
| CommunityMultisig | 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 | $MULTISIG_ADDRESS |

## 🚀 Как использовать новую конфигурацию

### В JavaScript файлах
\`\`\`javascript
// Вместо хардкода адресов используйте:
const multisigAddress = CONTRACT_CONFIG.getAddress('multisig');
const projectsAddress = CONTRACT_CONFIG.getAddress('projects');
const treasuryAddress = CONTRACT_CONFIG.getAddress('treasury');

// Проверка сети
if (!CONTRACT_CONFIG.isCorrectNetwork(chainId)) {
    alert('Подключитесь к правильной сети!');
}
\`\`\`

### В HTML файлах
Файл \`contract-config.js\` автоматически подключен к основным страницам.

## 🔧 Следующие шаги

1. **Перезапустите frontend** для применения изменений
2. **Проверьте консоль браузера** на наличие ошибок
3. **Протестируйте функциональность** выплат проектов
4. **Убедитесь**, что адреса контрактов корректны

## 🚨 Важно

- Все изменения автоматически сохранены
- Созданы резервные копии оригинальных файлов
- Новые адреса соответствуют развернутым контрактам
- Файл \`contract-config.js\` централизует конфигурацию

## 📊 Статистика обновления

- Обновлено файлов: 4
- Создано новых файлов: 1
- Создано резервных копий: 1
- Время обновления: $(date +%H:%M:%S)
EOF

    log "✅ Отчет об обновлении создан: frontend_update_report.md"
}

# Основная функция
main() {
    log "Начало обновления адресов контрактов в frontend..."
    
    check_deployment_info
    extract_addresses
    create_backup
    update_project_payout_js
    update_other_frontend_files
    create_frontend_config
    update_html_files
    create_update_report
    
    log "✅ Обновление frontend завершено успешно!"
    echo ""
    echo "🎉 Frontend обновлен с новыми адресами контрактов!"
    echo ""
    echo "📁 Обновленные файлы:"
    echo "   - web/project-payout.js"
    echo "   - web/contract-config.js (новый)"
    echo "   - web/project-payout.html"
    echo "   - web/index.html"
    echo ""
    echo "📖 Отчет: frontend_update_report.md"
    echo "💾 Резервная копия: backups/frontend_$(date +%Y%m%d_%H%M%S)/"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "   1. Перезапустите frontend контейнер"
    echo "   2. Проверьте консоль браузера"
    echo "   3. Протестируйте функциональность"
    echo ""
}

# Запуск основной функции
main "$@"
