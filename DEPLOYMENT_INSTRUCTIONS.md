# 🚀 Инструкции по развертыванию FundChain с нуля

## 📋 Обзор

Этот документ содержит пошаговые инструкции по полному пересозданию проекта FundChain с нуля, включая:

1. **Очистку Docker** - удаление всех контейнеров и образов
2. **Развертывание контрактов** - с автоматическим сохранением адресов
3. **Обновление frontend** - автоматическая замена адресов контрактов
4. **Чтение файлов из Docker** - для диагностики и анализа

## 🧹 Шаг 1: Очистка Docker

### Полная очистка
```bash
# Остановка и удаление контейнеров
docker-compose down -v

# Удаление всех образов, контейнеров и volumes
docker system prune -a --volumes -f
```

### Что это делает:
- Останавливает все запущенные контейнеры
- Удаляет все Docker образы
- Очищает все volumes и networks
- Освобождает место на диске- Jcdj,j;lftn vtcnj yf lbcrt


## 🚀 Шаг 2: Развертывание контрактов

### Запуск улучшенного скрипта развертывания
```bash
# Сделать скрипт исполняемым (если еще не сделано)
chmod +x deploy_contracts_improved.sh

# Запустить развертывание
./deploy_contracts_improved.sh
```

### Что происходит:
1. **Проверка зависимостей** - Foundry, Docker
2. **Подключение к Anvil** - ожидание готовности блокчейна
3. **Получение приватного ключа** - из детерминированных ключей Anvil
4. **Развертывание контрактов** - через Foundry script
5. **Извлечение адресов** - из логов развертывания
6. **Создание файлов** - с полной информацией о развертывании

### Создаваемые файлы:
- `deployment_logs/deployment_info.json` - полная информация
- `deployment_logs/contracts.env` - для backend
- `deployment_logs/frontend_config.js` - для frontend
- `deployment_logs/README.md` - инструкции

## 🔧 Шаг 3: Обновление Frontend

### Автоматическое обновление адресов
```bash
# Сделать скрипт исполняемым
chmod +x update_frontend_addresses.sh

# Запустить обновление
./update_frontend_addresses.sh
```

### Что происходит:
1. **Чтение адресов** - из файла развертывания
2. **Создание резервных копий** - оригинальных файлов
3. **Обновление project-payout.js** - замена хардкодных адресов
4. **Создание contract-config.js** - централизованная конфигурация
5. **Обновление HTML файлов** - подключение конфигурации

### Обновляемые файлы:
- `web/project-payout.js` - основной файл выплат
- `web/contract-config.js` - новый файл конфигурации
- `web/project-payout.html` - страница выплат
- `web/index.html` - главная страница

## 📖 Шаг 4: Чтение файлов из Docker

### Получение файлов из контейнеров
```bash
# Сделать скрипт исполняемым
chmod +x read_docker_files.sh

# Запустить чтение файлов
./read_docker_files.sh
```

### Что происходит:
1. **Проверка Docker** - доступность и права
2. **Список контейнеров** - текущее состояние
3. **Чтение backend файлов** - конфигурация, БД, логи
4. **Чтение frontend файлов** - HTML, JS, nginx
5. **Чтение anvil файлов** - информация о блокчейне
6. **Копирование логов** - всех контейнеров

### Создаваемые файлы:
- `docker_files/backend/` - файлы backend контейнера
- `docker_files/frontend/` - файлы frontend контейнера
- `docker_files/anvil/` - файлы anvil контейнера
- `docker_files/logs/` - логи всех контейнеров
- `docker_files/README.md` - сводный отчет

## 🐳 Шаг 5: Запуск Docker

### Запуск всех сервисов
```bash
# Запуск всех контейнеров
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### Что запускается:
- **Anvil** - локальный блокчейн (порт 8545)
- **Backend** - Python API (порт 8000)
- **Frontend** - Nginx web (порт 3000)

## 🔍 Шаг 6: Проверка и тестирование

### Проверка контрактов
```bash
# Проверка баланса казны
cast balance $TREASURY_ADDRESS --rpc-url http://localhost:8545

# Проверка количества проектов
cast call $PROJECTS_ADDRESS "projectCount()" --rpc-url http://localhost:8545

# Проверка владельцев multisig
cast call $MULTISIG_ADDRESS "getOwners()" --rpc-url http://localhost:8545
```

### Проверка frontend
1. Откройте `http://localhost:3000` в браузере
2. Проверьте консоль на наличие ошибок
3. Протестируйте функциональность выплат проектов

### Проверка backend
```bash
# Проверка API
curl http://localhost:8000/health

# Проверка базы данных
sqlite3 backend/fundchain.db ".tables"
```

## 📁 Структура создаваемых файлов

```
deployment_logs/
├── deployment_info.json      # Полная информация о развертывании
├── contracts.env            # Переменные окружения для backend
├── frontend_config.js       # Конфигурация для frontend
└── README.md               # Инструкции по использованию

docker_files/
├── backend/                # Файлы из backend контейнера
├── frontend/               # Файлы из frontend контейнера
├── anvil/                  # Файлы из anvil контейнера
├── logs/                   # Логи всех контейнеров
└── README.md              # Сводный отчет

backups/
└── frontend_YYYYMMDD_HHMMSS/  # Резервные копии frontend файлов
```

## 🚨 Возможные проблемы и решения

### Проблема: Foundry не установлен
```bash
# Установка Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Проблема: Docker не запущен
```bash
# Запуск Docker Desktop (macOS/Windows)
# Или запуск Docker daemon (Linux)
sudo systemctl start docker
```

### Проблема: Порт занят
```bash
# Проверка занятых портов
lsof -i :8545  # Anvil
lsof -i :8000  # Backend
lsof -i :3000  # Frontend

# Остановка процессов
kill -9 <PID>
```

### Проблема: Контракты не развертываются
```bash
# Проверка подключения к Anvil
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# Проверка приватного ключа
echo $PRIVATE_KEY
```

## 🔄 Автоматизация

### Создание master скрипта
```bash
#!/bin/bash
# deploy_all.sh

echo "🚀 Полное развертывание FundChain..."

# Очистка Docker
echo "🧹 Очистка Docker..."
docker-compose down -v
docker system prune -a --volumes -f

# Развертывание контрактов
echo "📋 Развертывание контрактов..."
./deploy_contracts_improved.sh

# Обновление frontend
echo "🔧 Обновление frontend..."
./update_frontend_addresses.sh

# Запуск Docker
echo "🐳 Запуск Docker..."
docker-compose up -d

echo "✅ Развертывание завершено!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend: http://localhost:8000"
echo "⛓️  Anvil: http://localhost:8545"
```

## 📚 Дополнительные ресурсы

### Полезные команды
```bash
# Просмотр логов в реальном времени
docker-compose logs -f [service_name]

# Вход в контейнер
docker exec -it community-fundchain-backend-1 bash

# Перезапуск сервиса
docker-compose restart [service_name]

# Остановка всех сервисов
docker-compose down
```

### Файлы для изучения
- `contracts/script/Deploy.s.sol` - скрипт развертывания
- `web/project-payout.js` - логика выплат проектов
- `backend/app/config.py` - конфигурация backend
- `docker-compose.yml` - конфигурация Docker

## 🎯 Заключение

Эти скрипты обеспечивают:

1. **Автоматизацию** - минимальное вмешательство человека
2. **Надежность** - резервные копии и проверки
3. **Прозрачность** - подробные логи и отчеты
4. **Повторяемость** - одинаковый результат при каждом запуске

После выполнения всех шагов у вас будет полностью рабочая система FundChain с правильными адресами контрактов и обновленным frontend.

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи контейнеров
2. Изучите созданные отчеты
3. Убедитесь, что все зависимости установлены
4. Проверьте, что порты не заняты другими процессами

Удачи с развертыванием! 🚀
