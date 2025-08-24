// Конфигурация контрактов FundChain
// Автоматически сгенерировано: 2025-08-24T15:28:16.000Z

const CONTRACT_CONFIG = {
    // Адреса контрактов
    addresses: {
        treasury: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
        projects: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        governanceSBT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        ballot: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
        multisig: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
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
