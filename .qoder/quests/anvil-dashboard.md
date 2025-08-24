# Anvil Dashboard Design Document

## Overview

This document outlines the design for a new Anvil dashboard page that will display information about smart contracts and test accounts in separate tabs. The dashboard will be implemented as a standalone page in the `web` directory without dependencies on other scripts in the folder.

## Requirements

1. Create a new page `anvil_front.html` in the `web` directory
2. Implement two tabs:
   - Contracts tab: Displays information about deployed smart contracts
   - Accounts tab: Displays information about Anvil test accounts
3. All interface elements must be in Russian language only
4. No dependencies on other scripts in the `web` folder
5. Self-contained implementation

## Architecture

### File Structure
```
web/
├── anvil_front.html     # Main HTML page
├── anvil_front.js       # JavaScript logic for the dashboard
└── anvil_front.css      # Styles for the dashboard
```

### Page Structure

The page will have the following structure:
1. Header with page title
2. Tab navigation (Contracts, Accounts)
3. Content area that changes based on selected tab
4. Responsive design that works on different screen sizes

## Implementation Details

### Contracts Tab

The Contracts tab will display:
- Table with contract names and addresses
- Network information (RPC URL, Chain ID)
- Contract deployment status

Data will be sourced from `contract-config.js` which contains:
- Treasury contract address
- Projects contract address
- Governance SBT contract address
- Ballot contract address
- Multisig contract address
- Network configuration (RPC URL, Chain ID)

### Accounts Tab

The Accounts tab will display:
- Table with account information (address)
- Account balances
- Account labels (Account 1, Account 2, etc.)

Data will be retrieved directly from the Anvil node using Web3 RPC calls:
- Account addresses via `eth_accounts` RPC method
- Account balances via `eth_getBalance` RPC method

This approach ensures we display the actual accounts available in the Anvil instance rather than hardcoded test accounts.

### Localization

Since the requirement is to use Russian language only without switching:
- All text elements will be hardcoded in Russian
- No i18n library integration needed
- No language switcher will be implemented

### Styling

The page will use:
- Self-contained CSS in `anvil_front.css`
- Similar styling to existing FundChain pages for consistency
- Responsive design using CSS flexbox/grid
- Tab navigation component
- Data tables for displaying contract and account information

## Technical Implementation

### HTML Structure
```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Панель управления Anvil</title>
    <link rel="stylesheet" href="anvil_front.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Панель управления Anvil</h1>
        </header>
        
        <nav class="tabs">
            <button class="tab-button active" data-tab="contracts">Контракты</button>
            <button class="tab-button" data-tab="accounts">Аккаунты</button>
        </nav>
        
        <main class="tab-content">
            <section id="contracts-tab" class="tab-pane active">
                <div id="contracts-content">
                    <!-- Contracts data will be loaded here -->
                </div>
            </section>
            
            <section id="accounts-tab" class="tab-pane">
                <div id="accounts-content">
                    <!-- Accounts data will be loaded here -->
                </div>
            </section>
        </main>
    </div>
    
    <script src="contract-config.js"></script>
    <script src="anvil_front.js"></script>
</body>
</html>
```

### HTML Implementation Details

The HTML structure will include:

1. **Document Structure**:
   - HTML5 doctype declaration
   - Russian language specification
   - Responsive viewport meta tag
   - Title in Russian

2. **Header Section**:
   - Main heading "Панель управления Anvil"

3. **Navigation Section**:
   - Tab buttons for "Контракты" and "Аккаунты"
   - Active state for the default tab
   - Data attributes for JavaScript interaction

4. **Main Content Section**:
   - Tab panes for contracts and accounts
   - Container divs for dynamic content loading
   - Proper semantic HTML structure

5. **Script Inclusion**:
   - Reference to `contract-config.js` for data
   - Reference to `anvil_front.js` for functionality

### JavaScript Logic
The JavaScript will:
1. Handle tab switching
2. Load contract data from `CONTRACT_CONFIG`
3. Load account data from `CONTRACT_CONFIG`
4. Render data in appropriate tables
5. Handle any error states

#### Tab Switching Implementation
```javascript
// Tab switching logic
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding tab pane
            const tabName = button.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}
```

#### Data Loading and Rendering
```javascript
// Load and display contract data
function loadContracts() {
    const contractsContainer = document.getElementById('contracts-content');
    
    try {
        // Display contracts table
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
        
        // Add each contract
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
        
        // Display network info
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

// Load and display account data from Anvil node
async function loadAccounts() {
    const accountsContainer = document.getElementById('accounts-content');
    
    try {
        // Get accounts from Anvil node
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
        
        // Add each account with balance
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            // Get account balance
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
            
            // Convert Wei to ETH
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
```

### CSS Styling
The CSS will:
1. Implement tab navigation
2. Style data tables
3. Ensure responsive design
4. Match existing FundChain styling where appropriate
5. Use CSS variables for consistent theming

#### CSS Implementation
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #f1f5f9;
    --border-color: #e5e7eb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --success-color: #059669;
    --warning-color: #d97706;
    --danger-color: #dc2626;
}

body {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: var(--text-primary);
    background-color: var(--bg-secondary);
    margin: 0;
    padding: 0;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header h1 {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 1.5rem;
}

/* Tab Navigation */
.tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
}

.tab-button {
    background: none;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 0.5rem 0.5rem 0 0;
    transition: all 0.2s;
}

.tab-button:hover {
    color: var(--primary-color);
    background-color: var(--secondary-color);
}

.tab-button.active {
    color: var(--primary-color);
    border-bottom: 3px solid var(--primary-color);
    background-color: var(--bg-primary);
}

/* Tab Content */
.tab-pane {
    display: none;
}

.tab-pane.active {
    display: block;
}

/* Data Tables */
.data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
}

.data-table th,
.data-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.data-table th {
    background-color: var(--secondary-color);
    font-weight: 600;
    color: var(--text-primary);
}

.data-table tr:last-child td {
    border-bottom: none;
}

.data-table code {
    font-family: monospace;
    font-size: 0.875rem;
    background-color: var(--secondary-color);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    word-break: break-all;
}

/* Headings */
h2, h3 {
    color: var(--text-primary);
    margin: 1.5rem 0 1rem 0;
}

h2 {
    font-size: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
}

h3 {
    font-size: 1.25rem;
}

/* Error Messages */
.error {
    color: var(--danger-color);
    padding: 1rem;
    background-color: #fee2e2;
    border: 1px solid var(--danger-color);
    border-radius: 0.5rem;
    margin: 1rem 0;
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .tabs {
        flex-direction: column;
    }
    
    .data-table {
        font-size: 0.875rem;
    }
    
    .data-table th,
    .data-table td {
        padding: 0.5rem;
    }
    
    .data-table code {
        font-size: 0.75rem;
    }
}
```

## Data Flow

1. Page loads and initializes
2. Tab navigation is set up with event listeners
3. Contract data is loaded from `CONTRACT_CONFIG` object
4. Account data is loaded from `CONTRACT_CONFIG` object
5. Data is rendered in respective tabs
6. User can switch between tabs to view different information

## UI Mockups

### Contracts Tab Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Панель управления Anvil                                    │
├─────────────────────────────────────────────────────────────┤
│ [Контракты] [Аккаунты]                                      │
├─────────────────────────────────────────────────────────────┤
│ Контракты                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Название          │ Адрес                               │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Treasury          │ 0x5FC8d32690cc91D4c39d9d3abcBD16989F│ │
│ │ Projects          │ 0x9fE46736679d2D9a65F0992F2272dE9f3c│ │
│ │ Governance SBT    │ 0x5FbDB2315678afecb367f032d93F642f64│ │
│ │ Ballot            │ 0x0165878A594ca255338adfa4d48449f692│ │
│ │ Multisig          │ 0x8A791620dd6260079BF849Dc5567aDC3F2│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Сетевые параметры                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Параметр     │ Значение                                  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ RPC URL      │ http://localhost:8545                     │ │
│ │ Chain ID     │ 31337                                     │ │
│ │ Network Name │ Anvil Local                               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Accounts Tab Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Панель управления Anvil                                    │
├─────────────────────────────────────────────────────────────┤
│ [Контракты] [Аккаунты]                                      │
├─────────────────────────────────────────────────────────────┤
│ Аккаунты                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Метка      │ Адрес                              │ Баланс │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Account 1  │ 0xf39Fd6e51aad88F6F4ce6aB8827279cffF│ 10000  │ │
│ │            │ b92266                             │ ETH    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Account 2  │ 0x70997970C51812dc3A010C7d01b50e0d17│ 10000  │ │
│ │            │ dc79C8                             │ ETH    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Account 3  │ 0x3C44CdDdB6a900fa2b585dd299e03d12FA│ 10000  │ │
│ │            │ 4293BC                             │ ETH    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Account 4  │ 0x90F79bf6EB2c4f870365E785982E1f101E│ 10000  │ │
│ │            │ 93b906                             │ ETH    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

- Private keys will be displayed as they are in the config file (this is acceptable for test environment)
- No external dependencies reduces attack surface
- Client-side only implementation

## Deployment

### File Placement
The following files need to be created in the `web` directory:
1. `anvil_front.html` - Main HTML page
2. `anvil_front.js` - JavaScript functionality
3. `anvil_front.css` - Styling

### Accessing the Dashboard
The dashboard will be accessible at `http://localhost:3000/anvil_front.html` (or the appropriate URL based on the web server configuration).

## Usage Instructions

1. **Opening the Dashboard**:
   - Navigate to the Anvil dashboard page in a web browser
   - The Contracts tab will be displayed by default

2. **Viewing Contracts**:
   - The contracts tab shows all deployed smart contract addresses
   - Network information is displayed below the contracts table

3. **Viewing Accounts**:
   - Click the "Аккаунты" tab to view test account information
   - Each account's address and private key are displayed

4. **Responsive Design**:
   - The dashboard works on both desktop and mobile devices
   - Tables will adjust to fit smaller screens

## Testing

- Verify tab switching works correctly
- Verify contract data displays correctly
- Verify account data displays correctly
- Test responsive design on different screen sizes
- Verify all text is in Russian

## Future Enhancements

Potential enhancements for future versions:
1. Add copy-to-clipboard functionality for addresses and keys
2. Implement search/filter functionality for contracts and accounts
3. Add status indicators for contract deployment
4. Include QR codes for addresses
5. Add export functionality for data

## Summary

This design document outlines the implementation of an Anvil dashboard page that displays smart contract and account information in separate tabs. The implementation will be self-contained within the `web` directory and feature a Russian-only interface without language switching capabilities. The dashboard will provide developers and testers with easy access to contract addresses and real account information from the Anvil node, including account balances. This approach ensures that the dashboard displays actual runtime data rather than hardcoded test values.