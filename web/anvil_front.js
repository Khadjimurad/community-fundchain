// Функция для получения отображаемого имени контракта
function getContractDisplayName(name) {
    const names = {
        'treasury': 'Treasury',
        'projects': 'Projects',
        'governancesbt': 'Governance SBT',
        'ballot': 'Ballot',
        'multisig': 'Multisig'
    };
    return names[name.toLowerCase()] || name;
}

// Функция для настройки переключения вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Удаление активного класса у всех кнопок и панелей
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Добавление активного класса к нажатой кнопке
            button.classList.add('active');
            
            // Отображение соответствующей вкладки
            const tabName = button.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Функция для загрузки и отображения данных контрактов
function loadContracts() {
    const contractsContainer = document.getElementById('contracts-content');
    
    try {
        // Создание таблицы контрактов
        let contractsHtml = `
            <h2>Контракты</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Название</th>
                        <th>Адрес</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Добавление каждого контракта
        Object.entries(CONTRACT_CONFIG.addresses).forEach(([name, address]) => {
            const displayName = getContractDisplayName(name);
            contractsHtml += `
                <tr>
                    <td>${displayName}</td>
                    <td><code>${address}</code></td>
                </tr>
            `;
        });
        
        contractsHtml += `</tbody></table>`;
        
        // Отображение сетевой информации
        contractsHtml += `
            <h3>Сетевые параметры</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Параметр</th>
                        <th>Значение</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>RPC URL</td>
                        <td>${CONTRACT_CONFIG.network.rpcUrl}</td>
                    </tr>
                    <tr>
                        <td>Chain ID</td>
                        <td>${CONTRACT_CONFIG.network.chainId}</td>
                    </tr>
                    <tr>
                        <td>Network Name</td>
                        <td>${CONTRACT_CONFIG.network.networkName}</td>
                    </tr>
                </tbody>
            </table>
        `;
        
        contractsContainer.innerHTML = contractsHtml;
    } catch (error) {
        contractsContainer.innerHTML = `<p class="error">Ошибка загрузки данных контрактов: ${error.message}</p>`;
    }
}

// Функция для загрузки и отображения данных аккаунтов
async function loadAccounts() {
    const accountsContainer = document.getElementById('accounts-content');
    
    try {
        // Получение аккаунтов из ноды Anvil
        const accountsResponse = await fetch(CONTRACT_CONFIG.network.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_accounts",
                params: [],
                id: 1
            })
        });
        
        const accountsData = await accountsResponse.json();
        const accounts = accountsData.result || [];
        
        if (accounts.length === 0) {
            accountsContainer.innerHTML = `<p class="error">Аккаунты не найдены</p>`;
            return;
        }
        
        let accountsHtml = `
            <h2>Аккаунты</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Метка</th>
                        <th>Адрес</th>
                        <th>Баланс (ETH)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Добавление каждого аккаунта с балансом
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            // Получение баланса аккаунта
            const balanceResponse = await fetch(CONTRACT_CONFIG.network.rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBalance",
                    params: [account, "latest"],
                    id: 1
                })
            });
            
            const balanceData = await balanceResponse.json();
            const balanceWei = balanceData.result || "0";
            
            // Конвертация из Wei в ETH
            const balanceEth = parseFloat((parseInt(balanceWei, 16) / 1e18).toFixed(4));
            
            accountsHtml += `
                <tr>
                    <td>Account ${i + 1}</td>
                    <td><code>${account}</code></td>
                    <td>${balanceEth} ETH</td>
                </tr>
            `;
        }
        
        accountsHtml += `</tbody></table>`;
        
        accountsContainer.innerHTML = accountsHtml;
    } catch (error) {
        accountsContainer.innerHTML = `<p class="error">Ошибка загрузки данных аккаунтов: ${error.message}</p>`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupTabs();
    loadContracts();
    loadAccounts();
});