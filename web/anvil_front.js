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

// Функция для получения конфигурации контрактов через API
async function getContractConfig() {
    try {
        const response = await fetch('http://localhost:8000/api/v1/admin/system/config');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const config = await response.json();
        
        // Формируем объект с адресами контрактов
        const addresses = {};
        
        // Добавляем только те контракты, у которых есть адреса
        if (config.treasury_address) addresses.treasury = config.treasury_address;
        if (config.projects_address) addresses.projects = config.projects_address;
        if (config.sbt_address) addresses.governancesbt = config.sbt_address;
        if (config.ballot_address) addresses.ballot = config.ballot_address;
        if (config.multisig_address) addresses.multisig = config.multisig_address;
        
        return {
            addresses,
            network: {
                rpcUrl: 'http://localhost:8545',
                chainId: '0x7a69', // 31337 в hex
                networkName: 'Anvil Local'
            }
        };
    } catch (error) {
        console.error('Ошибка получения конфигурации контрактов:', error);
        // Возвращаем пустую конфигурацию в случае ошибки
        return {
            addresses: {},
            network: {
                rpcUrl: 'http://localhost:8545',
                chainId: '0x7a69',
                networkName: 'Anvil Local'
            }
        };
    }
}

// Функция для загрузки и отображения данных контрактов
async function loadContracts() {
    const contractsContainer = document.getElementById('contracts-content');
    
    try {
        // Получаем конфигурацию контрактов
        const contractConfig = await getContractConfig();
        
        // Проверяем, есть ли контракты для отображения
        if (Object.keys(contractConfig.addresses).length === 0) {
            contractsContainer.innerHTML = `
                <h2>Контракты</h2>
                <p class="error">Контракты не найдены или не развернуты</p>
            `;
            return;
        }
        
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
        Object.entries(contractConfig.addresses).forEach(([name, address]) => {
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
                        <td>${contractConfig.network.rpcUrl}</td>
                    </tr>
                    <tr>
                        <td>Chain ID</td>
                        <td>${contractConfig.network.chainId} (${parseInt(contractConfig.network.chainId, 16)} в decimal)</td>
                    </tr>
                    <tr>
                        <td>Network Name</td>
                        <td>${contractConfig.network.networkName}</td>
                    </tr>
                </tbody>
            </table>
        `;
        
        contractsContainer.innerHTML = contractsHtml;
    } catch (error) {
        contractsContainer.innerHTML = `<p class="error">Ошибка загрузки данных контрактов: ${error.message}</p>`;
    }
}

// Функция для загрузки и отображения данных проектов
async function loadProjects() {
    const projectsContainer = document.getElementById('projects-content');
    
    try {
        // Получаем конфигурацию контрактов
        const contractConfig = await getContractConfig();
        
        // Проверяем, есть ли адрес контракта Projects
        if (!contractConfig.addresses.projects) {
            projectsContainer.innerHTML = `
                <h2>Проекты</h2>
                <p class="error">Контракт Projects не развернут</p>
            `;
            return;
        }
        
        // Получаем ABI для контракта Projects
        const abiResponse = await fetch(`http://localhost:8000/api/v1/admin/contracts/abi/Projects`);
        if (!abiResponse.ok) {
            throw new Error(`HTTP ${abiResponse.status}: ${abiResponse.statusText}`);
        }
        const abiData = await abiResponse.json();
        
        // Создаем Web3 экземпляр
        const web3 = new Web3('http://localhost:8545');
        const projectsContract = new web3.eth.Contract(abiData.abi, contractConfig.addresses.projects);
        
        // Получаем список проектов
        const projectIds = await projectsContract.methods.listIds().call();
        
        if (!projectIds || projectIds.length === 0) {
            projectsContainer.innerHTML = `
                <h2>Проекты</h2>
                <p class="info">Проекты не найдены</p>
                <div class="project-actions">
                    <button class="btn btn-primary" onclick="createSampleProject()">Создать тестовый проект</button>
                </div>
            `;
            return;
        }
        
        // Получаем детали каждого проекта
        const projects = [];
        for (let i = 0; i < projectIds.length; i++) {
            try {
                const projectId = projectIds[i];
                const project = await projectsContract.methods.projects(projectId).call();
                
                // Проверяем, что проект существует
                if (project && project.id !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    projects.push({
                        id: project.id,
                        name: project.name || `Проект ${i}`,
                        description: project.description || 'Без описания',
                        target: web3.utils.fromWei(project.target, 'ether'),
                        softCap: web3.utils.fromWei(project.softCap, 'ether'),
                        hardCap: web3.utils.fromWei(project.hardCap, 'ether'),
                        status: getProjectStatus(parseInt(project.status)),
                        category: project.category || 'Общая',
                        createdAt: new Date(parseInt(project.createdAt) * 1000).toLocaleDateString('ru-RU'),
                        deadline: project.deadline ? new Date(parseInt(project.deadline) * 1000).toLocaleDateString('ru-RU') : 'Не указано',
                        totalAllocated: web3.utils.fromWei(project.totalAllocated, 'ether'),
                        totalPaidOut: web3.utils.fromWei(project.totalPaidOut, 'ether')
                    });
                }
            } catch (error) {
                console.warn(`Ошибка получения проекта ${i}:`, error);
            }
        }
        
        // Отображаем проекты
        if (projects.length === 0) {
            projectsContainer.innerHTML = `
                <h2>Проекты</h2>
                <p class="info">Проекты не найдены</p>
                <div class="project-actions">
                    <button class="btn btn-primary" onclick="createSampleProject()">Создать тестовый проект</button>
                </div>
            `;
            return;
        }
        
        let projectsHtml = `
            <h2>Проекты (${projects.length})</h2>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="createSampleProject()">Создать тестовый проект</button>
                <button class="btn btn-secondary" onclick="refreshProjects()">Обновить</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Описание</th>
                        <th>Цель</th>
                        <th>Статус</th>
                        <th>Категория</th>
                        <th>Создан</th>
                        <th>Дедлайн</th>
                        <th>Выделено</th>
                        <th>Выплачено</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        projects.forEach(project => {
            projectsHtml += `
                <tr>
                    <td><code>${project.id.substring(0, 10)}...</code></td>
                    <td><strong>${project.name}</strong></td>
                    <td>${project.description}</td>
                    <td>${project.target} ETH</td>
                    <td><span class="status-badge status-${project.status.toLowerCase()}">${project.status}</span></td>
                    <td>${project.category}</td>
                    <td>${project.createdAt}</td>
                    <td>${project.deadline}</td>
                    <td>${project.totalAllocated} ETH</td>
                    <td>${project.totalPaidOut} ETH</td>
                </tr>
            `;
        });
        
        projectsHtml += `
                </tbody>
            </table>
        `;
        
        projectsContainer.innerHTML = projectsHtml;
        
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
        projectsContainer.innerHTML = `
            <h2>Проекты</h2>
            <p class="error">Ошибка загрузки проектов: ${error.message}</p>
            <div class="project-actions">
                <button class="btn btn-primary" onclick="createSampleProject()">Создать тестовый проект</button>
            </div>
        `;
    }
}

// Функция для получения статуса проекта
function getProjectStatus(status) {
    const statuses = {
        0: 'Draft',
        1: 'Active',
        2: 'Paused',
        3: 'Cancelled',
        4: 'ReadyToPayout',
        5: 'Completed',
        6: 'Failed'
    };
    return statuses[status] || 'Unknown';
}

// Функция для создания тестового проекта
async function createSampleProject() {
    try {
        const contractConfig = await getContractConfig();
        if (!contractConfig.addresses.projects) {
            alert('Контракт Projects не развернут');
            return;
        }
        
        const abiResponse = await fetch(`http://localhost:8000/api/v1/admin/contracts/abi/Projects`);
        if (!abiResponse.ok) {
            throw new Error(`HTTP ${abiResponse.status}: ${abiResponse.statusText}`);
        }
        const abiData = await abiResponse.json();
        
        const web3 = new Web3('http://localhost:8545');
        const projectsContract = new web3.eth.Contract(abiData.abi, contractConfig.addresses.projects);
        
        // Генерируем уникальный ID проекта
        const projectId = web3.utils.randomHex(32);
        const name = 'Тестовый проект ' + Math.floor(Math.random() * 1000);
        const description = 'Описание тестового проекта для демонстрации';
        const target = web3.utils.toWei('10', 'ether');
        const softCap = web3.utils.toWei('5', 'ether');
        const hardCap = web3.utils.toWei('15', 'ether');
        const category = 'Тест';
        const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 дней
        const softCapEnabled = true;
        
        // Получаем аккаунт для подписи транзакции
        const accounts = await web3.eth.getAccounts();
        const fromAccount = accounts[0];
        
        // Создаем проект
        const result = await projectsContract.methods.createProject(
            projectId, name, description, target, softCap, hardCap, category, deadline, softCapEnabled
        ).send({ from: fromAccount, gas: 500000 });
        
        alert(`Проект "${name}" успешно создан!`);
        await loadProjects(); // Обновляем список проектов
        
    } catch (error) {
        console.error('Ошибка создания проекта:', error);
        alert(`Ошибка создания проекта: ${error.message}`);
    }
}

// Функция для обновления списка проектов
async function refreshProjects() {
    await loadProjects();
}

// Функция для загрузки и отображения данных аккаунтов
async function loadAccounts() {
    const accountsContainer = document.getElementById('accounts-content');
    
    try {
        // Получаем конфигурацию контрактов для RPC URL
        const contractConfig = await getContractConfig();
        
        // Получение аккаунтов из ноды Anvil
        const accountsResponse = await fetch(contractConfig.network.rpcUrl, {
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
            const balanceResponse = await fetch(contractConfig.network.rpcUrl, {
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
    loadProjects();
    loadAccounts();
});