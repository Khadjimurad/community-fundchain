# FundChain Testing Guide

## 🚀 **БЫСТРЫЙ СТАРТ**

### **1. Полная очистка системы (если нужно)**
```bash
# Очистить все данные, контракты, базы, ABI файлы (БЕЗ перезапуска контейнеров)
./scripts/fresh_start.sh

# Или без подтверждения
./scripts/fresh_start.sh --force
```

### **2. Деплой контрактов**
```bash
# Развернуть все контракты и создать contract-config.js
./deploy_contracts_improved.sh
```

**Результат:**
- ✅ Контракты развернуты на Anvil
- ✅ `deployment_info.json` создан с адресами
- ✅ `web/contract-config.js` создан для frontend
- ✅ `.env` файл создан для backend

### **3. Запуск полного цикла тестирования**
```bash
# Запустить все тесты последовательно
./test/run_full_test_cycle.sh
```

## 📋 **ДЕТАЛЬНОЕ ОПИСАНИЕ**

### **Скрипт очистки (`fresh_start.sh`)**
- ✅ **Очищает**: базы данных, контракты, ABI файлы, Anvil блокчейн, тестовые данные
- ❌ **НЕ перезапускает**: Docker контейнеры
- 🔄 **Создает**: резервную копию перед очисткой
- 📁 **Результат**: чистая система для нового деплоя

### **Скрипт деплоя (`deploy_contracts_improved.sh`)**
- 🚀 **Разворачивает**: все смарт-контракты на Anvil
- 💾 **Сохраняет**: адреса в `deployment_logs/deployment_info.json`
- 📝 **Создает**: `web/contract-config.js` для frontend
- 🔗 **Настраивает**: связи между контрактами
- 🌍 **Создает**: `.env` файл для backend переменных окружения

### **Тестовые скрипты**

#### **Phase 1: `00_fund_accounts.py`**
- 💰 **Пополняет**: все 10 тестовых аккаунтов Anvil
- 🎯 **Цель**: 100 ETH на каждый аккаунт
- ✅ **Результат**: готовность к тестированию

#### **Phase 2: `01_seed_real_data.py`**
- 👥 **Создает**: 10 тестовых участников
- 📋 **Создает**: 10 проектов с русскими описаниями
- 💸 **Создает**: тестовые пожертвования
- 🗄️ **Использует**: SQLite базу данных

#### **Phase 3: `02_voting_cycle.py`**
- 🗳️ **Запускает**: полный цикл голосования
- 🔐 **Тестирует**: commit-reveal схему
- ⚡ **Включает**: быстрые тестовые раунды
- 📊 **Показывает**: результаты голосования

## 🔧 **РУЧНОЕ ВЫПОЛНЕНИЕ**

### **Если нужно запустить тесты по отдельности:**

```bash
# 1. Пополнить балансы
docker exec community-fundchain-backend-1 python /app/test/00_fund_accounts.py

# 2. Создать тестовые данные
docker exec community-fundchain-backend-1 python /app/test/01_seed_real_data.py

# 3. Запустить голосование
docker exec community-fundchain-backend-1 python /app/test/02_voting_cycle.py
```

### **Проверка результатов:**
```bash
# Посмотреть логи тестов
ls -la test/*_output_*.log

# Проверить базу данных
docker exec community-fundchain-backend-1 sqlite3 /app/fundchain.db ".tables"
```

## 🌐 **Frontend интеграция**

### **Автоматическое обновление адресов:**
- ✅ `deploy_contracts_improved.sh` создает `web/contract-config.js`
- ✅ `project-payout.js` автоматически использует `CONTRACT_CONFIG`
- ✅ `app.js` может использовать `CONTRACT_CONFIG` для адресов

### **Кнопка синхронизации:**
- 🔄 **Frontend**: кнопка "Sync Blockchain" в разделе голосования
- 📡 **Backend**: API endpoint `/votes/sync-blockchain`
- 🔗 **Функция**: синхронизация данных голосования с блокчейном

## 🌍 **Переменные окружения (.env)**

### **Автоматическое создание:**
- ✅ `deploy_contracts_improved.sh` автоматически создает `.env` файл
- ✅ **Backend** автоматически читает все настройки из `.env`
- ✅ **Docker Compose** использует `.env` файл для переменных

### **Основные переменные в .env:**
```bash
# Contract Addresses
TREASURY_ADDRESS=0x...
PROJECTS_ADDRESS=0x...
GOVERNANCE_SBT_ADDRESS=0x...
BALLOT_ADDRESS=0x...
MULTISIG_ADDRESS=0x...

# Blockchain Configuration
RPC_URL=http://anvil:8545
CHAIN_ID=31337
START_BLOCK=0

# Application Settings
DEBUG=true
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### **Преимущества .env файла:**
- 🔄 **Автоматическое обновление** при каждом деплое
- 🚀 **Нет необходимости** вручную копировать адреса
- 🔒 **Безопасность** - приватные ключи не в коде
- 📱 **Гибкость** - легко изменить настройки

## 🚨 **Устранение проблем**

### **Контейнеры не запущены:**
```bash
docker-compose up -d
```

### **Anvil недоступен:**
```bash
# Проверить статус
docker ps | grep anvil

# Перезапустить если нужно
docker-compose restart anvil
```

### **Ошибки в тестах:**
```bash
# Посмотреть логи
docker logs community-fundchain-backend-1

# Проверить файлы в контейнере
docker exec community-fundchain-backend-1 ls -la /app/test/
```

## 📊 **Ожидаемые результаты**

### **После успешного выполнения:**
- 💰 **10 аккаунтов** с балансом 100+ ETH
- 👥 **10 участников** в базе данных
- 📋 **10 проектов** с русскими описаниями
- 🗳️ **Результаты голосования** в смарт-контрактах
- 🔄 **Frontend** синхронизирован с блокчейном

### **Готовность к выплатам:**
- ✅ **project-payout.html** может использоваться для тестирования выплат
- ✅ **Все контракты** развернуты и настроены
- ✅ **База данных** содержит тестовые данные
- ✅ **Голосование** завершено с результатами

## 🎯 **Следующие шаги**

1. **Проверить результаты** в frontend интерфейсе
2. **Протестировать выплаты** через `project-payout.html`
3. **Анализировать логи** для понимания процесса
4. **Настроить параметры** голосования при необходимости
