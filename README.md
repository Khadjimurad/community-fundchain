# fundqueue-mvp — Traceable Community Fund (MVP)

Локально разворачиваемый прототип «прослеживаемого фонда общины»:
- Эскроу-казна, разметка взносов по проектам (pledges), пополнение и перераспределение до выплаты.
- Параллельно: тайное приоритетное голосование (commit→reveal) **и** распределение сумм.
- Взвешенные голоса (SBT), мультисиг-выплаты, публичные агрегаты и приватная статистика донора.
- Локально: Foundry/Anvil. Бэкенд: FastAPI + Web3; UI: простая HTML/JS-страница.

## Быстрый старт (локально)
1) Установите Foundry: https://book.getfoundry.sh/getting-started/installation  
   Затем запустите локальную сеть:
   ```bash
   anvil
   ```
2) В другом терминале: скопируйте `.env.example` в `.env` и заполните RPC/ключи при необходимости.
3) Сборка/деплой контрактов — см. `contracts/script/Deploy.s.sol` и `Makefile`.
4) Запустите бэкенд:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
5) Откройте `web/index.html` в браузере (или раздайте статикой из любого сервера).
