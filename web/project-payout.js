// Project Payout Interface
// Handles Web3 connection and project payout workflow

class ProjectPayoutInterface {
  constructor() {
    this.web3 = null;
    this.account = null;
    this.contracts = {
      multisig: null,
      treasury: null,
      projects: null
    };
    this.currentProject = null;
    this.currentTransactionId = localStorage.getItem('currentTransactionId') || null;
    this.workflowStep = 1;
    
    console.log('ProjectPayoutInterface initialized');
    console.log('Current transaction ID from localStorage:', this.currentTransactionId);
    
    if (this.currentTransactionId) {
      console.log('Loaded transaction ID from localStorage:', this.currentTransactionId);
    }
    
    // Update transaction display if we have a saved transaction ID
    setTimeout(() => {
      this.updateTransactionDisplay();
      
      // Check if manual transaction form exists
      const manualTxForm = document.getElementById('manual-tx-form');
      console.log('Manual transaction form in constructor:', manualTxForm);
      if (manualTxForm) {
        console.log('Manual form initial state:', {
          exists: true,
          display: manualTxForm.style.display,
          hidden: manualTxForm.classList.contains('hidden')
        });
      } else {
        console.error('Manual transaction form not found in DOM during initialization');
      }
    }, 100);
    
    // Contract ABIs
    this.abis = {
      multisig: [
        {
          "inputs": [
            {
              "internalType": "address[]",
              "name": "_owners",
              "type": "address[]"
            },
            {
              "internalType": "uint256",
              "name": "_required",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "sender",
              "type": "address"
            }
          ],
          "name": "Confirmation",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "name": "Execution",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "name": "ExecutionFailure",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "OwnerAddition",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "OwnerRemoval",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "required",
              "type": "uint256"
            }
          ],
          "name": "RequirementChange",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            { "indexed": true,  "internalType": "uint256",  "name": "txId",      "type": "uint256" },
            { "indexed": true,  "internalType": "address",  "name": "proposer",  "type": "address" },
            { "indexed": true,  "internalType": "address",  "name": "to",        "type": "address" },
            { "indexed": false, "internalType": "uint256",  "name": "value",     "type": "uint256" },
            { "indexed": false, "internalType": "uint8",    "name": "txType",    "type": "uint8" },
            { "indexed": false, "internalType": "bytes32",  "name": "projectId", "type": "bytes32" },
            { "indexed": false, "internalType": "string",  "name": "description", "type": "string" }
          ],
          "name": "TxProposed",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "name": "TxRevocation",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "addOwner",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_required",
              "type": "uint256"
            }
          ],
          "name": "changeRequirement",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "name": "confirm",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "name": "execute",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "name": "revokeConfirmation",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "owner",
              "type": "address"
            }
          ],
          "name": "removeOwner",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            }
          ],
          "name": "proposeProjectPayout",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            }
          ],
          "name": "propose",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "required",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "txCount",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
          "name": "txs",
          "outputs": [
            { "internalType": "uint256", "name": "id",          "type": "uint256" },
            { "internalType": "address", "name": "to",          "type": "address" },
            { "internalType": "uint256", "name": "value",       "type": "uint256" },
            { "internalType": "bytes",   "name": "data",        "type": "bytes" },
            { "internalType": "uint8",   "name": "txType",      "type": "uint8" },
            { "internalType": "uint8",   "name": "status",      "type": "uint8" },
            { "internalType": "uint256", "name": "confirmations", "type": "uint256" },
            { "internalType": "uint256", "name": "createdAt",   "type": "uint256" },
            { "internalType": "uint256", "name": "executedAt",  "type": "uint256" },
            { "internalType": "bytes32", "name": "projectId",  "type": "bytes32" },
            { "internalType": "string",  "name": "description", "type": "string" },
            { "internalType": "address", "name": "proposer",    "type": "address" }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            { "internalType": "uint256", "name": "txId", "type": "uint256" },
            { "internalType": "address", "name": "owner", "type": "address" }
          ],
          "name": "confirmations",
          "outputs": [
            { "internalType": "bool", "name": "", "type": "bool" }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            { "internalType": "uint256", "name": "txId", "type": "uint256" },
            { "internalType": "address", "name": "owner", "type": "address" }
          ],
          "name": "hasConfirmed",
          "outputs": [
            { "internalType": "bool", "name": "", "type": "bool" }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      treasury: [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_admin",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "Allocated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "Payout",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "allocate",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            }
          ],
          "name": "payout",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            }
          ],
          "name": "totalAllocatedTo",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            }
          ],
          "name": "totalPaidOutFrom",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      projects: [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "creator",
              "type": "address"
            }
          ],
          "name": "ProjectCreated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "enum Projects.ProjectStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "reason",
              "type": "string"
            }
          ],
          "name": "ProjectStatusChanged",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "target",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "softCap",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "hardCap",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "category",
              "type": "string"
            },
            {
              "internalType": "uint8",
              "name": "priority",
              "type": "uint8"
            },
            {
              "internalType": "bool",
              "name": "softCapEnabled",
              "type": "bool"
            }
          ],
          "name": "createProject",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "internalType": "enum Projects.ProjectStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "string",
              "name": "reason",
              "type": "string"
            }
          ],
          "name": "setStatus",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "name": "projects",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "creator",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "target",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "softCap",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "hardCap",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "enum Projects.ProjectStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "string",
              "name": "category",
              "type": "string"
            },
            {
              "internalType": "uint8",
              "name": "priority",
              "type": "uint8"
            },
            {
              "internalType": "bool",
              "name": "softCapEnabled",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "totalAllocated",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalPaidOut",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "projectIds",
          "outputs": [
            {
              "internalType": "bytes32[]",
              "name": "",
              "type": "bytes32[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "projectIds",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ]
    };
    
    this.init();
  }

  init() {
    // Wait for DOM to be fully loaded before setting up event listeners
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM fully loaded, setting up event listeners');
        this.setupEventListeners();
        this.updateWorkflowStep(1);
        this.tryAutoConnect(); // Попробовать автоматически подключиться к Web3
      });
    } else {
      // DOM is already loaded
      console.log('DOM already loaded, setting up event listeners');
      this.setupEventListeners();
      this.updateWorkflowStep(1);
      this.tryAutoConnect(); // Попробовать автоматически подключиться к Web3
    }
  }
  
  async tryAutoConnect() {
    try {
      console.log('Attempting to auto-connect to Web3...');
      
      // Проверяем, есть ли уже сохраненные настройки подключения
      const savedRpcUrl = localStorage.getItem('rpcUrl');
      const savedChainId = localStorage.getItem('chainId');
      const savedPrivateKey = localStorage.getItem('privateKey');
      
      // Устанавливаем сохраненные значения в поля ввода, если они есть
      try {
        let rpcUrlElement = document.getElementById('rpc-url');
        if (!rpcUrlElement) {
          rpcUrlElement = document.querySelector('[data-rpc-url]') || 
                         document.querySelector('.rpc-url');
        }
        if (rpcUrlElement && savedRpcUrl) {
          rpcUrlElement.value = savedRpcUrl;
        }
        
        let chainIdElement = document.getElementById('chain-id');
        if (!chainIdElement) {
          chainIdElement = document.querySelector('[data-chain-id]') || 
                          document.querySelector('.chain-id');
        }
        if (chainIdElement && savedChainId) {
          chainIdElement.value = savedChainId;
        }
        
        let privateKeyElement = document.getElementById('private-key');
        if (!privateKeyElement) {
          privateKeyElement = document.querySelector('[data-private-key]') || 
                             document.querySelector('.private-key');
        }
        if (privateKeyElement && savedPrivateKey) {
          privateKeyElement.value = savedPrivateKey;
        }
      } catch (uiError) {
        console.warn('Failed to update UI elements during auto-connect:', uiError);
      }
      
      // Пробуем подключиться с использованием MetaMask, если он доступен
      if (window.ethereum) {
        try {
          console.log('MetaMask detected, trying to connect...');
          await this.connectWeb3();
          return;
        } catch (error) {
          console.warn('Failed to auto-connect using MetaMask:', error);
        }
      }
      
      // Если есть сохраненный RPC URL, пробуем подключиться с его использованием
      if (savedRpcUrl) {
        try {
          console.log('Saved RPC URL found, trying to connect...');
          await this.connectWeb3();
          return;
        } catch (error) {
          console.warn('Failed to auto-connect using saved RPC URL:', error);
        }
      }
      
      console.log('Auto-connect attempt complete. User may need to connect manually.');
    } catch (error) {
      console.error('Error during auto-connect attempt:', error);
    }
  }

  setupEventListeners() {
    try {
      // Connection events
      try {
        let connectButton = document.getElementById('connect-button');
        if (!connectButton) {
          connectButton = document.querySelector('[data-connect-button]') || 
                         document.querySelector('.connect-button');
        }
        if (connectButton) {
          connectButton.addEventListener('click', () => this.connectWeb3());
        }
        
        let disconnectButton = document.getElementById('disconnect-button');
        if (!disconnectButton) {
          disconnectButton = document.querySelector('[data-disconnect-button]') || 
                            document.querySelector('.disconnect-button');
        }
        if (disconnectButton) {
          disconnectButton.addEventListener('click', () => this.disconnectWeb3());
        }
      } catch (error) {
        console.warn('Failed to setup connection event listeners:', error);
      }
    
          // Debug buttons (temporary - remove in production)
      try {
        let debugStateButton = document.getElementById('debug-state');
        if (!debugStateButton) {
          debugStateButton = document.querySelector('[data-debug-state]') || 
                            document.querySelector('.debug-state');
        }
        if (debugStateButton) {
          debugStateButton.addEventListener('click', () => {
            if (window.projectPayout) {
              window.projectPayout.checkState();
            }
          });
        }
        
        let clearTxIdButton = document.getElementById('clear-tx-id');
        if (!clearTxIdButton) {
          clearTxIdButton = document.querySelector('[data-clear-tx-id]') || 
                           document.querySelector('.clear-tx-id');
        }
        if (clearTxIdButton) {
          clearTxIdButton.addEventListener('click', () => {
            if (window.projectPayout) {
              window.projectPayout.clearTransactionId();
            }
          });
        }
        
        let resetWorkflowButton = document.getElementById('reset-workflow');
        if (!resetWorkflowButton) {
          resetWorkflowButton = document.querySelector('[data-reset-workflow]') || 
                               document.querySelector('.reset-workflow');
        }
        if (resetWorkflowButton) {
          resetWorkflowButton.addEventListener('click', () => {
            if (window.projectPayout) {
              window.projectPayout.resetWorkflow();
            }
          });
        }
      } catch (error) {
        console.warn('Failed to setup debug event listeners:', error);
      }
    
          // Make debug buttons visible for testing
      try {
        setTimeout(() => {
          let debugBtn = document.getElementById('debug-state');
          if (!debugBtn) {
            debugBtn = document.querySelector('[data-debug-state]') || 
                      document.querySelector('.debug-state');
          }
          
          let clearBtn = document.getElementById('clear-tx-id');
          if (!clearBtn) {
            clearBtn = document.querySelector('[data-clear-tx-id]') || 
                      document.querySelector('.clear-tx-id');
          }
          
          let resetBtn = document.getElementById('reset-workflow');
          if (!resetBtn) {
            resetBtn = document.querySelector('[data-reset-workflow]') || 
                      document.querySelector('.reset-workflow');
          }
          
          if (debugBtn) debugBtn.style.display = 'inline-block';
          if (clearBtn) clearBtn.style.display = 'inline-block';
          if (resetBtn) resetBtn.style.display = 'inline-block';
        }, 1000);
      } catch (error) {
        console.warn('Failed to setup debug button visibility:', error);
      }
    
          // Step 1 events
      try {
        let refreshProjectsButton = document.getElementById('refresh-projects-button');
        if (!refreshProjectsButton) {
          refreshProjectsButton = document.querySelector('[data-refresh-projects-button]') || 
                                 document.querySelector('.refresh-projects-button');
        }
        if (refreshProjectsButton) {
          refreshProjectsButton.addEventListener('click', () => this.refreshProjects());
        }

        let nextStep1Btn = document.getElementById('next-step-1');
        if (!nextStep1Btn) {
          nextStep1Btn = document.querySelector('[data-next-step-1]') || 
                        document.querySelector('.next-step-1');
        }
        if (nextStep1Btn) {
          nextStep1Btn.addEventListener('click', () => this.updateWorkflowStep(2));
        }
      } catch (error) {
        console.warn('Failed to setup step 1 event listeners:', error);
      }

          // Step 2 events
      try {
        let backStep2 = document.getElementById('back-step-2');
        if (!backStep2) {
          backStep2 = document.querySelector('[data-back-step-2]') || 
                     document.querySelector('.back-step-2');
        }
        if (backStep2) {
          backStep2.addEventListener('click', () => this.previousStep());
        }

        let proposeBtn = document.getElementById('propose-button');
        if (!proposeBtn) {
          proposeBtn = document.querySelector('[data-propose-button]') || 
                      document.querySelector('.propose-button');
        }
        if (proposeBtn) {
          proposeBtn.addEventListener('click', () => this.proposePayout());
        }
        
        // Manual transaction ID input on step 2
        let setManualTxIdStep2Btn = document.getElementById('set-manual-tx-id-step2');
        if (!setManualTxIdStep2Btn) {
          setManualTxIdStep2Btn = document.querySelector('[data-set-manual-tx-id-step2]') || 
                                  document.querySelector('.set-manual-tx-id-step2');
        }
        if (setManualTxIdStep2Btn) {
          setManualTxIdStep2Btn.addEventListener('click', () => this.setManualTransactionIdStep2());
        }
        
        let continueToStep3Btn = document.getElementById('continue-to-step3');
        if (!continueToStep3Btn) {
          continueToStep3Btn = document.querySelector('[data-continue-to-step3]') || 
                              document.querySelector('.continue-to-step3');
        }
        if (continueToStep3Btn) {
          continueToStep3Btn.addEventListener('click', () => this.continueToStep3());
        }
        
        // Test button for manual form
        let testShowFormBtn = document.getElementById('test-show-form');
        if (!testShowFormBtn) {
          testShowFormBtn = document.querySelector('[data-test-show-form]') || 
                           document.querySelector('.test-show-form');
        }
        if (testShowFormBtn) {
          testShowFormBtn.addEventListener('click', () => this.testShowManualForm());
        }
      } catch (error) {
        console.warn('Failed to setup step 2 event listeners:', error);
      }

          // Step 3 events
      try {
        let backStep3 = document.getElementById('back-step-3');
        if (!backStep3) {
          backStep3 = document.querySelector('[data-back-step-3]') || 
                     document.querySelector('.back-step-3');
        }
        if (backStep3) {
          backStep3.addEventListener('click', () => this.previousStep());
        }

        let refreshTxButton = document.getElementById('refresh-tx-button');
        if (!refreshTxButton) {
          refreshTxButton = document.querySelector('[data-refresh-tx-button]') || 
                           document.querySelector('.refresh-tx-button');
        }
        if (refreshTxButton) {
          refreshTxButton.addEventListener('click', () => this.refreshTransactionStatus());
        }

        let confirmBtn = document.getElementById('confirm-button');
        if (!confirmBtn) {
          confirmBtn = document.querySelector('[data-confirm-button]') || 
                      document.querySelector('.confirm-button');
        }
        if (confirmBtn) {
          confirmBtn.addEventListener('click', () => this.confirmTransaction());
        }
        
        // Skip to next step button
        let skipToNextBtn = document.getElementById('skip-to-next');
        if (!skipToNextBtn) {
          skipToNextBtn = document.querySelector('[data-skip-to-next]') || 
                         document.querySelector('.skip-to-next');
        }
        if (skipToNextBtn) {
          skipToNextBtn.addEventListener('click', () => this.skipToNextStep());
        }
      } catch (error) {
        console.warn('Failed to setup step 3 event listeners:', error);
      }

          // Manual transaction ID input
      try {
        let setManualTxIdBtn = document.getElementById('set-manual-tx-id');
        if (!setManualTxIdBtn) {
          setManualTxIdBtn = document.querySelector('[data-set-manual-tx-id]') || 
                             document.querySelector('.set-manual-tx-id');
        }
        if (setManualTxIdBtn) {
          setManualTxIdBtn.addEventListener('click', () => this.setManualTransactionId());
        }

        // Confirmation events (Step 3)
        let nextStep3 = document.getElementById('next-step-3');
        if (!nextStep3) {
          nextStep3 = document.querySelector('[data-next-step-3]') || 
                     document.querySelector('.next-step-3');
        }
        if (nextStep3) {
          nextStep3.addEventListener('click', () => this.nextStep());
        }
      } catch (error) {
        console.warn('Failed to setup manual transaction ID and confirmation event listeners:', error);
      }

          // Execution events
      try {
        let backStep4 = document.getElementById('back-step-4');
        if (!backStep4) {
          backStep4 = document.querySelector('[data-back-step-4]') || 
                     document.querySelector('.back-step-4');
        }
        if (backStep4) {
          backStep4.addEventListener('click', () => this.previousStep());
        }
        
        let refreshExecTxButton = document.getElementById('refresh-exec-tx-button');
        if (!refreshExecTxButton) {
          refreshExecTxButton = document.querySelector('[data-refresh-exec-tx-button]') || 
                                document.querySelector('.refresh-exec-tx-button');
        }
        if (refreshExecTxButton) {
          refreshExecTxButton.addEventListener('click', () => this.refreshExecutionStatus());
        }
        
        let executeButton = document.getElementById('execute-button');
        if (!executeButton) {
          executeButton = document.querySelector('[data-execute-button]') || 
                         document.querySelector('.execute-button');
        }
        if (executeButton) {
          executeButton.addEventListener('click', () => this.executeTransaction());
        }
        
        // Skip to next step button on step 4
        let skipToNextStep4Btn = document.getElementById('skip-to-next-step4');
        if (!skipToNextStep4Btn) {
          skipToNextStep4Btn = document.querySelector('[data-skip-to-next-step4]') || 
                               document.querySelector('.skip-to-next-step4');
        }
        if (skipToNextStep4Btn) {
          skipToNextStep4Btn.addEventListener('click', () => this.skipToNextStep());
        }
        
        let nextStep4 = document.getElementById('next-step-4');
        if (!nextStep4) {
          nextStep4 = document.querySelector('[data-next-step-4]') || 
                     document.querySelector('.next-step-4');
        }
        if (nextStep4) {
          nextStep4.addEventListener('click', () => this.nextStep());
        }
      } catch (error) {
        console.warn('Failed to setup execution event listeners:', error);
      }
    
          // Completion events
      try {
        let backStep5 = document.getElementById('back-step-5');
        if (!backStep5) {
          backStep5 = document.querySelector('[data-back-step-5]') || 
                     document.querySelector('.back-step-5');
        }
        if (backStep5) {
          backStep5.addEventListener('click', () => this.previousStep());
        }
        
        let refreshProjectStatus = document.getElementById('refresh-project-status');
        if (!refreshProjectStatus) {
          refreshProjectStatus = document.querySelector('[data-refresh-project-status]') || 
                                document.querySelector('.refresh-project-status');
        }
        if (refreshProjectStatus) {
          refreshProjectStatus.addEventListener('click', () => this.refreshProjectStatus());
        }
        
        let completeProjectButton = document.getElementById('complete-project-button');
        if (!completeProjectButton) {
          completeProjectButton = document.querySelector('[data-complete-project-button]') || 
                                 document.querySelector('.complete-project-button');
        }
        if (completeProjectButton) {
          completeProjectButton.addEventListener('click', () => this.completeProject());
        }
        
        // Skip to next step button on step 5
        let skipToNextStep5Btn = document.getElementById('skip-to-next-step5');
        if (!skipToNextStep5Btn) {
          skipToNextStep5Btn = document.querySelector('[data-skip-to-next-step5]') || 
                               document.querySelector('.skip-to-next-step5');
        }
        if (skipToNextStep5Btn) {
          skipToNextStep5Btn.addEventListener('click', () => this.skipToFinishWorkflow());
        }
        
        let finishWorkflow = document.getElementById('finish-workflow');
        if (!finishWorkflow) {
          finishWorkflow = document.querySelector('[data-finish-workflow]') || 
                          document.querySelector('.finish-workflow');
        }
        if (finishWorkflow) {
          finishWorkflow.addEventListener('click', () => this.finishWorkflow());
        }
      } catch (error) {
        console.warn('Failed to setup completion event listeners:', error);
      }

    console.log('DOM event listeners set up');
    } catch (error) {
      console.error('Failed to setup event listeners:', error);
    }
  }

 

  async connectWeb3() {
    try {
      console.log('Connecting to Web3...');
      
      let rpcUrlElement = document.getElementById('rpc-url');
      if (!rpcUrlElement) {
        rpcUrlElement = document.querySelector('[data-rpc-url]') || 
                       document.querySelector('.rpc-url');
      }
      
      let chainIdElement = document.getElementById('chain-id');
      if (!chainIdElement) {
        chainIdElement = document.querySelector('[data-chain-id]') || 
                        document.querySelector('.chain-id');
      }
      
      let privateKeyElement = document.getElementById('private-key');
      if (!privateKeyElement) {
        privateKeyElement = document.querySelector('[data-private-key]') || 
                           document.querySelector('.private-key');
      }
      
      const rpcUrl = rpcUrlElement ? rpcUrlElement.value : '';
      const chainId = chainIdElement ? parseInt(chainIdElement.value) : 31337;
      const privateKey = privateKeyElement ? privateKeyElement.value : '';
      
      // Сохраняем настройки подключения в localStorage
      if (rpcUrl) localStorage.setItem('rpcUrl', rpcUrl);
      if (chainId) localStorage.setItem('chainId', chainId.toString());
      if (privateKey) localStorage.setItem('privateKey', privateKey);
      
      // Prefer RPC + Private Key when provided, even if MetaMask is installed
      if (rpcUrl && privateKey) {
        console.log('Using custom provider with private key');
        try {
          const provider = new Web3.providers.HttpProvider(rpcUrl);
          this.web3 = new Web3(provider);
          this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
          this.web3.eth.accounts.wallet.add(privateKey);
          console.log('Connected with account:', this.account);
        } catch (error) {
          console.error('Custom provider connection error:', error);
          this.showError('Не удалось подключиться к провайдеру: ' + error.message);
          return;
        }
      } else if (window.ethereum) {
        // Browser wallet (MetaMask)
        console.log('Using MetaMask or other browser wallet');
        this.web3 = new Web3(window.ethereum);
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const accounts = await this.web3.eth.getAccounts();
          this.account = accounts[0];
          console.log('Connected with account:', this.account);
        } catch (error) {
          console.error('MetaMask connection error:', error);
          this.showError('Не удалось подключиться к MetaMask: ' + error.message);
          return;
        }
      } else if (rpcUrl) {
        // Use custom provider without private key (view only)
        console.log('Using custom provider without private key (view only)');
        try {
          this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
          this.account = null;
          // Show a warning that this is view-only mode
          this.showWarning('Подключение установлено в режиме просмотра. Для отправки транзакций необходимо подключить кошелек с приватным ключом или использовать MetaMask.');
        } catch (error) {
          console.error('Custom provider connection error:', error);
          this.showError('Не удалось подключиться к провайдеру: ' + error.message);
          return;
        }
      } else {
        this.showError('Пожалуйста, укажите браузерный кошелек или RPC URL');
        return;
      }
      
      // Проверяем соединение с сетью
      try {
        await this.web3.eth.net.isListening();
        console.log('Web3 connection confirmed');
      } catch (error) {
        console.error('Web3 connection error:', error);
        this.showError('Не удалось подключиться к сети. Проверьте, что указанный RPC URL доступен.');
        this.web3 = null;
        this.account = null;
        return;
      }
      
      // Initialize contracts
      try {
        this.initializeContracts();
        console.log('Contracts initialized');
      } catch (error) {
        console.error('Contract initialization error:', error);
        this.showError('Не удалось инициализировать контракты: ' + error.message);
        return;
      }
      
      // Update UI
      try {
        let connectionStatus = document.getElementById('connection-status');
        if (!connectionStatus) {
          connectionStatus = document.querySelector('[data-connection-status]') || 
                           document.querySelector('.connection-status');
        }
        if (connectionStatus) {
          connectionStatus.textContent = 'Подключено';
        }
        
        let currentAccount = document.getElementById('current-account');
        if (!currentAccount) {
          currentAccount = document.querySelector('[data-current-account]') || 
                         document.querySelector('.current-account');
        }
        if (currentAccount) {
          currentAccount.textContent = this.account || 'Нет аккаунта';
        }
        
        let accountInfo = document.getElementById('account-info');
        if (!accountInfo) {
          accountInfo = document.querySelector('[data-account-info]') || 
                       document.querySelector('.account-info');
        }
        if (accountInfo) {
          accountInfo.classList.remove('hidden');
        }
        
        let connectButton = document.getElementById('connect-button');
        if (!connectButton) {
          connectButton = document.querySelector('[data-connect-button]') || 
                         document.querySelector('.connect-button');
        }
        if (connectButton) {
          connectButton.classList.add('hidden');
        }
        
        let disconnectButton = document.getElementById('disconnect-button');
        if (!disconnectButton) {
          disconnectButton = document.querySelector('[data-disconnect-button]') || 
                            document.querySelector('.disconnect-button');
        }
        if (disconnectButton) {
          disconnectButton.classList.remove('hidden');
        }
        
        let payoutInterface = document.getElementById('payout-interface');
        if (!payoutInterface) {
          payoutInterface = document.querySelector('[data-payout-interface]') || 
                           document.querySelector('.payout-interface');
        }
        if (payoutInterface) {
          payoutInterface.classList.remove('hidden');
        }
      } catch (uiError) {
        console.warn('Failed to update UI elements:', uiError);
      }
      
      this.showSuccess('Успешно подключено к Web3');
      
      // Load projects for step 1
      this.refreshProjects();
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      this.showError('Не удалось подключиться к Web3: ' + error.message);
      return false;
    }
  }

  disconnectWeb3() {
    try {
      this.web3 = null;
      this.account = null;
      this.contracts = {
        multisig: null,
        treasury: null,
        projects: null
      };
      
      // Clear current project and transaction ID
      this.currentProject = null;
      this.currentTransactionId = null;
      localStorage.removeItem('currentTransactionId');
      console.log('Cleared transaction ID from localStorage');
      
      // Reset workflow step
      this.workflowStep = 1;
      
      // Update UI
      try {
        let connectionStatus = document.getElementById('connection-status');
        if (!connectionStatus) {
          connectionStatus = document.querySelector('[data-connection-status]') || 
                           document.querySelector('.connection-status');
        }
        if (connectionStatus) {
          connectionStatus.textContent = 'Отключено';
        }
        
        let accountInfo = document.getElementById('account-info');
        if (!accountInfo) {
          accountInfo = document.querySelector('[data-account-info]') || 
                       document.querySelector('.account-info');
        }
        if (accountInfo) {
          accountInfo.classList.add('hidden');
        }

        let connectButton = document.getElementById('connect-button');
        if (!connectButton) {
          connectButton = document.querySelector('[data-connect-button]') || 
                         document.querySelector('.connect-button');
        }
        if (connectButton) {
          connectButton.classList.remove('hidden');
        }
        
        let disconnectButton = document.getElementById('disconnect-button');
        if (!disconnectButton) {
          disconnectButton = document.querySelector('[data-disconnect-button]') || 
                            document.querySelector('.disconnect-button');
        }
        if (disconnectButton) {
          disconnectButton.classList.add('hidden');
        }
        
        let payoutInterface = document.getElementById('payout-interface');
        if (!payoutInterface) {
          payoutInterface = document.querySelector('[data-payout-interface]') || 
                           document.querySelector('.payout-interface');
        }
        if (payoutInterface) {
          payoutInterface.classList.add('hidden');
        }
      } catch (uiError) {
        console.warn('Failed to update UI elements during disconnect:', uiError);
      }
      
      // Reset steps UI
      this.updateWorkflowStep(1);
    } catch (error) {
      console.error('Error disconnecting from Web3:', error);
      this.showError('Failed to disconnect from Web3: ' + error.message);
    }
  }

  // Method to reset the entire workflow (for debugging)
  resetWorkflow() {
    try {
      this.currentProject = null;
      this.currentTransactionId = null;
      localStorage.removeItem('currentTransactionId');
      this.workflowStep = 1;
      console.log('Workflow reset');
      this.updateWorkflowStep(1);
      this.showSuccess('Workflow reset completed');
    } catch (error) {
      console.error('Error resetting workflow:', error);
      this.showError('Failed to reset workflow: ' + error.message);
    }
  }

  
  
  // Метод для проверки подключения к Web3 и автоматического подключения при необходимости
  async checkWeb3Connection() {
    try {
      if (this.web3 && this.contracts.multisig) {
        try {
          // Проверяем, что соединение активно
          await this.web3.eth.net.isListening();
          return true;
        } catch (error) {
          console.warn('Web3 connection lost, attempting to reconnect...', error);
        }
      }
      
      // Пробуем автоматически подключиться
      const success = await this.connectWeb3();
      
      if (!success) {
        this.showError('Необходимо подключение к Web3 для выполнения этого действия');
      }
      
      return success;
    } catch (error) {
      console.error('Error checking Web3 connection:', error);
      this.showError('Failed to check Web3 connection: ' + error.message);
      return false;
    }
  }

  initializeContracts() {
    try {
      let multisigAddressElement = document.getElementById('multisig-address');
      if (!multisigAddressElement) {
        multisigAddressElement = document.querySelector('[data-multisig-address]') || 
                                document.querySelector('.multisig-address');
      }
      
      let treasuryAddressElement = document.getElementById('treasury-address');
      if (!treasuryAddressElement) {
        treasuryAddressElement = document.querySelector('[data-treasury-address]') || 
                                document.querySelector('.treasury-address');
      }
      
      let projectsAddressElement = document.getElementById('projects-address');
      if (!projectsAddressElement) {
        projectsAddressElement = document.querySelector('[data-projects-address]') || 
                                document.querySelector('.projects-address');
      }
      
      const multisigAddress = multisigAddressElement ? multisigAddressElement.value : '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';
      const treasuryAddress = treasuryAddressElement ? treasuryAddressElement.value : '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
      const projectsAddress = projectsAddressElement ? projectsAddressElement.value : '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
      
      this.contracts.multisig = new this.web3.eth.Contract(this.abis.multisig, multisigAddress);
      this.contracts.treasury = new this.web3.eth.Contract(this.abis.treasury, treasuryAddress);
      this.contracts.projects = new this.web3.eth.Contract(this.abis.projects, projectsAddress);
    } catch (error) {
      console.error('Error initializing contracts:', error);
      this.showError('Failed to initialize contracts: ' + error.message);
    }
  }

  async refreshProjects() {
    try {
      console.log('refreshProjects() method called');
      
      if (!this.web3 || !this.contracts.projects) {
        this.showError('Not connected to Web3');
        return;
      }
      
      // Get all projects and filter for ReadyToPayout status
      let projectsList = document.getElementById('projects-list');
      if (!projectsList) {
        console.warn('projects-list element not found, trying alternative selectors');
        projectsList = document.querySelector('[data-projects-list]') || 
                     document.querySelector('.projects-list') ||
                     document.querySelector('#step-1 .projects-list');
      }
      
      if (projectsList) {
        console.log('Found projects-list element, updating content');
        try {
          projectsList.innerHTML = '<p class="text-muted">Загрузка проектов...</p>';
        } catch (error) {
          console.warn('Failed to update projects list loading message:', error);
        }
        
        try {
          // Получаем реальные проекты из контракта
          let projects = [];
          try {
            // Попробуем получить проекты из контракта
            const projectIds = await this.contracts.projects.methods.projectIds().call();
            console.log('Project IDs from contract:', projectIds);
            
            if (projectIds && projectIds.length > 0) {
              for (let i = 0; i < Math.min(projectIds.length, 10); i++) {
                try {
                  const projectId = projectIds[i];
                  const project = await this.contracts.projects.methods.projects(projectId).call();
                  if (project && project.id && project.id !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    projects.push({
                      id: project.id,
                      name: project.name || `Project ${i}`,
                      description: project.description || 'No description',
                      status: parseInt(project.status) || 0,
                      target: project.target || '0',
                      totalAllocated: project.totalAllocated || '0',
                      totalPaidOut: project.totalPaidOut || '0',
                      category: project.category || 'General'
                    });
                  }
                } catch (projectError) {
                  console.warn(`Failed to get project ${i}:`, projectError);
                }
              }
            }
          } catch (contractError) {
            console.warn('Failed to get projects from contract, using demo data:', contractError);
          }
          
          // Если не удалось получить проекты из контракта, используем демо-данные
          if (projects.length === 0) {
            projects = [
              {
                id: '0x0000000000000000000000000000000000000000000000000000000000000001',
                name: 'Строительство общественного центра',
                description: 'Проект по строительству общественного центра в районе',
                status: 4, // ReadyToPayout
                target: this.web3.utils.toWei('10', 'ether'),
                totalAllocated: this.web3.utils.toWei('8', 'ether'),
                totalPaidOut: this.web3.utils.toWei('0', 'ether'),
                category: 'Инфраструктура'
              },
              {
                id: '0x0000000000000000000000000000000000000000000000000000000000000002',
                name: 'Образовательная программа',
                description: 'Программа для поддержки образования в регионе',
                status: 4, // ReadyToPayout
                target: this.web3.utils.toWei('5', 'ether'),
                totalAllocated: this.web3.utils.toWei('5', 'ether'),
                totalPaidOut: this.web3.utils.toWei('0', 'ether'),
                category: 'Образование'
              },
              {
                id: '0x0000000000000000000000000000000000000000000000000000000000000003',
                name: 'Экологическая инициатива',
                description: 'Проект по очистке реки и прибрежных территорий',
                status: 4, // ReadyToPayout
                target: this.web3.utils.toWei('3', 'ether'),
                totalAllocated: this.web3.utils.toWei('3', 'ether'),
                totalPaidOut: this.web3.utils.toWei('0', 'ether'),
                category: 'Экология'
              }
            ];
          }
          
          // Если проектов нет
          if (projects.length === 0) {
            projectsList.innerHTML = '<div class="alert alert-info">Нет проектов для отображения.</div>';
            return;
          }
          
          // Отображаем список проектов
          let projectsHTML = '<h4>Доступные проекты:</h4><div class="project-list">';
          
          projects.forEach(project => {
            const availableAmount = this.web3.utils.fromWei(
              (BigInt(project.totalAllocated) - BigInt(project.totalPaidOut)).toString(), 
              'ether'
            );
            
            // Определяем статус проекта
            const statusMap = ['Draft', 'Active', 'FundingReady', 'Voting', 'ReadyToPayout', 'Paid', 'Cancelled', 'Archived'];
            const statusText = statusMap[project.status] || 'Unknown';
            const statusClass = project.status === 4 ? 'badge-info' : 
                               project.status === 5 ? 'badge-success' : 
                               project.status === 6 ? 'badge-danger' : 'badge-secondary';
            
            projectsHTML += `
              <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                  <div class="project-title">${project.name}</div>
                  <div class="project-status">
                    <span class="badge ${statusClass}">${statusText}</span>
                  </div>
                </div>
                <div class="project-details">
                  <div>${project.description}</div>
                  <div class="project-metrics">
                    <div class="project-metric">Категория: ${project.category}</div>
                    <div class="project-metric">Доступно: ${availableAmount} ETH</div>
                    <div class="project-metric">Статус: ${statusText}</div>
                  </div>
                </div>
                <button class="btn btn-primary select-project-btn" data-project-id="${project.id}">Выбрать</button>
              </div>
            `;
          });
          
          projectsHTML += '</div>';
          
          // Add refresh button
          projectsHTML += '<div class="mt-3"><button class="btn btn-secondary" id="refresh-projects-btn"><i class="fas fa-sync-alt"></i> Обновить список</button></div>';
          
          projectsList.innerHTML = projectsHTML;
          
          console.log('Projects list updated with available projects');
          
          // Add event listener for refresh button
          const refreshButton = document.getElementById('refresh-projects-btn');
          if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshProjects());
          }
          
          // Прикрепляем обработчики событий к кнопкам выбора проекта
          const selectButtons = document.querySelectorAll('.select-project-btn');
          selectButtons.forEach(button => {
            button.addEventListener('click', (event) => {
              const projectId = event.target.getAttribute('data-project-id');
              console.log(`Project selected: ${projectId}`);
              this.loadProjectById(projectId, projects);
            });
          });
          
        } catch (error) {
          console.error('Error loading projects:', error);
          projectsList.innerHTML = `
            <div class="alert alert-warning">
              <p>Не удалось загрузить список проектов. Пожалуйста, введите ID проекта вручную:</p>
              <div class="form-group">
                <label for="manual-project-id">ID проекта (bytes32 hex)</label>
                <input type="text" id="manual-project-id" class="form-control" placeholder="0x..." value="0x0000000000000000000000000000000000000000000000000000000000000001">
              </div>
              <button id="load-manual-project" class="btn btn-primary">Загрузить проект</button>
            </div>
          `;
          
          // Прикрепляем обработчик для ручного ввода ID
          const loadManualProjectButton = document.getElementById('load-manual-project');
          if (loadManualProjectButton) {
            console.log('Found load-manual-project button, attaching event listener');
            loadManualProjectButton.addEventListener('click', () => {
              const manualProjectIdInput = document.getElementById('manual-project-id');
              if (manualProjectIdInput && manualProjectIdInput.value) {
                const projectId = manualProjectIdInput.value;
                console.log(`Manual project ID entered: ${projectId}`);
                // Create a mock project for demonstration
                const mockProject = {
                  id: projectId,
                  name: 'Проект загружен вручную',
                  description: 'Проект загружен через ручной ввод ID',
                  status: 4, // ReadyToPayout
                  target: this.web3.utils.toWei('10', 'ether'),
                  totalAllocated: this.web3.utils.toWei('10', 'ether'),
                  totalPaidOut: this.web3.utils.toWei('0', 'ether'),
                  category: 'Ручной ввод'
                };
                this.loadProjectById(projectId, [mockProject]);
              } else {
                this.showError('Пожалуйста, введите корректный ID проекта');
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in refreshProjects:', error);
      this.showError('Не удалось обновить список проектов: ' + error.message);
    }
  }

  async loadManualProject() {
    try {
      const manualProjectIdElement = document.getElementById('manual-project-id');
      const projectId = manualProjectIdElement ? manualProjectIdElement.value : '';
      
      if (!projectId || !this.web3.utils.isHexStrict(projectId)) {
        this.showError('Invalid project ID (must be hex)');
        return;
      }
      
      // Get project details
      const project = await this.contracts.projects.methods.projects(projectId).call();
      
      // Check if project exists
      if (!project || project.createdAt === '0') {
        this.showError('Project not found');
        return;
      }
      
      // Check if project is ReadyToPayout (status 4) or Paid (status 5)
      if (project.status !== '4' && project.status !== '5') {
        this.showError(`Project is not ready for payout. Current status: ${project.status}`);
        return;
      }
      
      // Format project details
      const statusMap = ['Draft', 'Active', 'FundingReady', 'Voting', 'ReadyToPayout', 'Paid', 'Cancelled', 'Archived'];
      
      this.currentProject = {
        id: project.id,
        name: project.name,
        description: project.description,
        target: this.web3.utils.fromWei(project.target, 'ether') + ' ETH',
        softCap: this.web3.utils.fromWei(project.softCap, 'ether') + ' ETH',
        hardCap: this.web3.utils.fromWei(project.hardCap, 'ether') + ' ETH',
        createdAt: new Date(project.createdAt * 1000).toLocaleString(),
        deadline: project.deadline > 0 ? new Date(project.deadline * 1000).toLocaleString() : 'No deadline',
        status: statusMap[project.status] || 'Unknown',
        category: project.category,
        priority: project.priority,
        softCapEnabled: project.softCapEnabled,
        totalAllocated: this.web3.utils.fromWei(project.totalAllocated, 'ether') + ' ETH',
        totalPaidOut: this.web3.utils.fromWei(project.totalPaidOut, 'ether') + ' ETH'
      };
      
      // Display project in step 1
      this.displayProjectInStep1();
      
      // Enable next button
      const nextStep1 = document.getElementById('next-step-1');
      if (nextStep1) {
        nextStep1.disabled = false;
      }
      
      this.showSuccess('Project loaded successfully');
    } catch (error) {
      console.error('Error loading project:', error);
      this.showError('Failed to load project: ' + error.message);
    }
  }
  
  loadProjectById(projectId, projects) {
    try {
      console.log(`Loading project with ID: ${projectId}`);
      
      // Find the project in the provided array
      const project = projects.find(p => p.id === projectId);
      
      if (!project) {
        console.error(`Project with ID ${projectId} not found`);
        this.showError(`Проект с ID ${projectId} не найден`);
        return;
      }
      
      // Validate project data
      if (!project.id || !project.name) {
        console.error('Invalid project data:', project);
        this.showError('Некорректные данные проекта');
        return;
      }
      
      // Set the current project
      this.currentProject = {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        target: this.web3.utils.fromWei(project.target, 'ether') + ' ETH',
        totalAllocated: this.web3.utils.fromWei(project.totalAllocated, 'ether') + ' ETH',
        totalPaidOut: this.web3.utils.fromWei(project.totalPaidOut, 'ether') + ' ETH',
        category: project.category,
        creator: project.creator || '0x0000000000000000000000000000000000000000'
      };
      
      // Update project status display
      const statusMap = ['Draft', 'Active', 'FundingReady', 'Voting', 'ReadyToPayout', 'Paid', 'Cancelled', 'Archived'];
      this.currentProject.statusText = statusMap[project.status] || 'Unknown';
      
      // Отображаем проект в шаге 1
      this.displayProjectInStep1();
      
      // Разрешаем переход к следующему шагу
      const nextStep1 = document.getElementById('next-step-1');
      if (nextStep1) {
        nextStep1.disabled = false;
      }
      
      this.showSuccess('Проект успешно загружен');
    } catch (error) {
      console.error('Error loading project by ID:', error);
      this.showError('Не удалось загрузить проект: ' + error.message);
    }
  }

  displayProjectInStep1() {
    try {
      let projectsList = document.getElementById('projects-list');
      if (!projectsList) {
        console.warn('projects-list element not found, trying alternative selectors');
        projectsList = document.querySelector('[data-projects-list]') || 
                     document.querySelector('.projects-list') ||
                     document.querySelector('#step-1 .projects-list');
      }
      
      if (projectsList) {
        projectsList.innerHTML = `
          <div class="project-card selected">
            <div class="project-header">
              <div class="project-title">${this.currentProject.name}</div>
              <div class="project-status">
                <span class="badge badge-info">${this.currentProject.statusText || this.currentProject.status}</span>
              </div>
            </div>
            <div class="project-details">
              <div>${this.currentProject.description}</div>
                          <div class="project-metrics">
              <div class="project-metric">Target: ${this.currentProject.target}</div>
              <div class="project-metric">Category: ${this.currentProject.category}</div>
              <div class="project-metric">Priority: ${this.currentProject.priority}</div>
              <div class="project-metric">Status: ${this.currentProject.statusText || this.currentProject.status}</div>
            </div>
            </div>
          </div>
        `;
      } else {
        console.warn('projects-list element not found anywhere');
      }
    } catch (error) {
      console.warn('Failed to display project in step 1:', error);
    }
  }

  updateWorkflowStep(step) {
    console.log(`Updating workflow step from ${this.workflowStep} to ${step}`);
    this.workflowStep = step;
    
    // Update step indicators
    try {
      for (let i = 1; i <= 5; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        if (stepElement) {
          stepElement.classList.remove('active', 'completed');
          
          if (i < step) {
            stepElement.classList.add('completed');
          } else if (i === step) {
            stepElement.classList.add('active');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to update step indicators:', error);
    }
    
    // Show/hide step content
    try {
      for (let i = 1; i <= 5; i++) {
        const contentElement = document.getElementById(`step-${i}-content`);
        if (contentElement) {
          if (i === step) {
            contentElement.classList.remove('hidden');
          } else {
            contentElement.classList.add('hidden');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to update step content visibility:', error);
    }
    
    // Update step-specific content
    switch (step) {
      case 2:
        console.log('Setting up step 2');
        try {
          this.setupStep2();
        } catch (error) {
          console.warn('Failed to setup step 2:', error);
        }
        break;
      case 3:
        console.log('Setting up step 3');
        try {
          this.setupStep3();
        } catch (error) {
          console.warn('Failed to setup step 3:', error);
        }
        break;
      case 4:
        console.log('Setting up step 4');
        try {
          this.setupStep4();
        } catch (error) {
          console.warn('Failed to setup step 4:', error);
        }
        break;
      case 5:
        console.log('Setting up step 5');
        try {
          this.setupStep5();
        } catch (error) {
          console.warn('Failed to setup step 5:', error);
        }
        break;
      default:
        console.log(`No specific setup for step ${step}`);
    }
  }

  setupStep2() {
    console.log('Setting up step 2, current project:', this.currentProject);
    
    // Check if manual transaction form exists
    const manualTxForm = document.getElementById('manual-tx-form');
    console.log('Manual transaction form in setupStep2:', manualTxForm);
    if (manualTxForm) {
      console.log('Manual form initial display style:', manualTxForm.style.display);
    }
    
    if (!this.currentProject) {
      this.showError('Проект не выбран');
      return;
    }
    
    // Отображаем информацию о проекте
    try {
      const projectNameDisplay = document.getElementById('project-name-display');
      if (projectNameDisplay) {
        projectNameDisplay.textContent = this.currentProject.name;
      }
      
      const projectDetailsDisplay = document.getElementById('project-details-display');
      if (projectDetailsDisplay) {
        projectDetailsDisplay.innerHTML = `
          <div><strong>Описание:</strong> ${this.currentProject.description}</div>
          <div><strong>Целевая сумма:</strong> ${this.currentProject.target}</div>
          <div><strong>Категория:</strong> ${this.currentProject.category}</div>
          <div><strong>Статус:</strong> <span class="badge badge-info">${this.currentProject.statusText || this.currentProject.status}</span></div>
        `;
      }
      
      // Заполняем адрес получателя адресом создателя проекта
      const recipientAddress = document.getElementById('recipient-address');
      if (recipientAddress) {
        recipientAddress.value = this.currentProject.creator || '';
      }
    } catch (error) {
      console.warn('Failed to update project display elements:', error);
    }
    
    // Рассчитываем и отображаем максимально доступную сумму
    try {
      const cleanTotalAllocated = this.currentProject.totalAllocated.replace(' ETH', '');
      const cleanTotalPaidOut = this.currentProject.totalPaidOut.replace(' ETH', '');
      const maxAvailable = parseFloat(cleanTotalAllocated) - parseFloat(cleanTotalPaidOut);
      
      const maxAvailableElement = document.getElementById('max-available');
      if (maxAvailableElement) {
        maxAvailableElement.textContent = maxAvailable.toFixed(4);
      }
      
      // Получаем ссылку на поле ввода суммы
      const payoutAmount = document.getElementById('payout-amount');
      if (payoutAmount) {
        // Устанавливаем начальную сумму
        payoutAmount.value = maxAvailable.toFixed(4);
        
        // Добавляем контейнер для вариантов выбора суммы
        const amountContainer = payoutAmount.parentElement;
        if (amountContainer) {
          // Создаем контейнер для кнопок выбора суммы
          const amountOptionsContainer = document.createElement('div');
          amountOptionsContainer.className = 'amount-options mt-2';
          amountOptionsContainer.innerHTML = `
            <div class="btn-group w-100">
              <button type="button" id="use-max-amount" class="btn btn-outline-primary">Использовать всю сумму (${maxAvailable.toFixed(4)} ETH)</button>
              <button type="button" id="use-half-amount" class="btn btn-outline-secondary">Использовать половину (${(maxAvailable / 2).toFixed(4)} ETH)</button>
            </div>
            <div class="form-text text-muted mt-1">Вы можете указать свою сумму в поле выше или выбрать один из вариантов.</div>
          `;
          
          // Добавляем контейнер после поля ввода
          amountContainer.appendChild(amountOptionsContainer);
          
          // Добавляем обработчики событий для кнопок
          const useMaxButton = document.getElementById('use-max-amount');
          if (useMaxButton) {
            useMaxButton.addEventListener('click', () => {
              payoutAmount.value = maxAvailable.toFixed(4);
              console.log(`Max amount set: ${maxAvailable.toFixed(4)} ETH`);
            });
          }
          
          const useHalfButton = document.getElementById('use-half-amount');
          if (useHalfButton) {
            useHalfButton.addEventListener('click', () => {
              payoutAmount.value = (maxAvailable / 2).toFixed(4);
              console.log(`Half amount set: ${(maxAvailable / 2).toFixed(4)} ETH`);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error calculating max available amount:', error);
      this.showError('Ошибка при расчете максимальной доступной суммы: ' + error.message);
    }
  }

  setupStep3() {
    console.log('Setting up step 3, current transaction ID:', this.currentTransactionId);
    
    // Get transaction details container
    let transactionDetails = document.getElementById('transaction-details');
    if (!transactionDetails) {
      console.warn('transaction-details element not found, trying alternative selectors');
      transactionDetails = document.querySelector('[data-transaction-details]') || 
                         document.querySelector('.transaction-details') ||
                         document.querySelector('#step-3 .transaction-details');
    }
    
    if (!transactionDetails) {
      console.error('transaction-details element not found anywhere');
      return;
    }
    
    if (!this.currentTransactionId) {
      console.warn('No transaction ID available for step 3');
      // Display form for manual transaction ID input
      transactionDetails.innerHTML = `
        <div class="alert alert-warning">
          <strong>Внимание:</strong> Транзакция для подтверждения не выбрана.
        </div>
        <div class="form-group">
          <label for="manual-tx-id">Введите ID транзакции:</label>
          <input type="number" id="manual-tx-id" class="form-control" placeholder="Введите числовой ID транзакции">
          <small class="text-muted">Укажите ID транзакции, созданной на шаге 2, или вернитесь на шаг 2 для создания новой транзакции.</small>
        </div>
        <button id="load-manual-tx" class="btn btn-primary">Загрузить транзакцию</button>
        <div class="mt-3">
          <button id="back-to-step-2" class="btn btn-secondary">← Назад к шагу 2</button>
        </div>
      `;
      
      // Attach event listener to the load button
      const loadManualTxButton = document.getElementById('load-manual-tx');
      if (loadManualTxButton) {
        loadManualTxButton.addEventListener('click', async () => {
          const manualTxIdInput = document.getElementById('manual-tx-id');
          if (manualTxIdInput && manualTxIdInput.value) {
            const txId = manualTxIdInput.value;
            
            // Validate the transaction ID
            const isValid = await this.isValidTransactionId(txId);
            if (isValid) {
              this.currentTransactionId = txId;
              // Save to localStorage
              localStorage.setItem('currentTransactionId', this.currentTransactionId);
              console.log('Manually set transaction ID:', this.currentTransactionId);
              // Refresh the step with the new transaction ID
              this.setupStep3();
            } else {
              this.showError('Неверный ID транзакции. Пожалуйста, проверьте ID и попробуйте снова.');
            }
          } else {
            this.showError('Пожалуйста, введите корректный ID транзакции');
          }
        });
      }
      
      // Attach event listener to the back button
      const backToStep2Button = document.getElementById('back-to-step-2');
      if (backToStep2Button) {
        backToStep2Button.addEventListener('click', () => {
          this.updateWorkflowStep(2);
        });
      }
      
      return;
    }
    
    if (!this.web3 || !this.contracts.multisig) {
      console.warn('Web3 or contracts not initialized. Please connect to Web3 first.');
      transactionDetails.innerHTML = `
        <div class="alert alert-warning">
          <strong>Внимание:</strong> Необходимо подключение к Web3 для продолжения.
        </div>
        <div class="mt-3">
          <button id="back-to-step-2" class="btn btn-secondary">← Назад к шагу 2</button>
        </div>
      `;
      
      // Attach event listener to the back button
      const backToStep2Button = document.getElementById('back-to-step-2');
      if (backToStep2Button) {
        backToStep2Button.addEventListener('click', () => {
          this.updateWorkflowStep(2);
        });
      }
      
      return;
    }
    
    // Display transaction ID
    transactionDetails.innerHTML = `
      <h3 data-i18n="project_payout.step_3_content.transaction">Transaction: <span id="tx-id-display">#${this.currentTransactionId}</span></h3>
      <div class="transaction-details" id="tx-details-display"></div>
      <div class="mt-3">
        <button id="back-to-step-2" class="btn btn-secondary">← Назад к шагу 2</button>
      </div>
    `;
    
    // Update the transaction display
    this.updateTransactionDisplay();
    
    // Attach event listener to the back button
    const backToStep2Button = document.getElementById('back-to-step-2');
    if (backToStep2Button) {
      backToStep2Button.addEventListener('click', () => {
        this.updateWorkflowStep(2);
      });
    }
    
    console.log('Transaction ID displayed:', this.currentTransactionId);
    
    // Load transaction details
    this.refreshTransactionStatus();
  }

  setupStep4() {
    console.log('Setting up step 4, current transaction ID:', this.currentTransactionId);
    
    if (!this.currentTransactionId) {
      console.warn('No transaction ID available for step 4');
      return;
    }
    
    // Display transaction ID
    let txIdDisplay = document.getElementById('execute-tx-id-display');
    if (!txIdDisplay) {
      // Если элемент не найден, попробуем найти его в другом месте или создать
      console.warn('Element execute-tx-id-display not found, trying to locate it');
      txIdDisplay = document.querySelector('[data-tx-id-display]') || 
                   document.querySelector('.tx-id-display') ||
                   document.querySelector('#step-4 .tx-id-display');
    }
    
    if (txIdDisplay) {
      txIdDisplay.textContent = `#${this.currentTransactionId}`;
      console.log('Execution transaction ID displayed:', this.currentTransactionId);
    } else {
      console.warn('Element execute-tx-id-display not found anywhere, transaction ID:', this.currentTransactionId);
    }
    
    // Load transaction details
    this.refreshExecutionStatus();
  }

  setupStep5() {
    if (!this.currentProject) {
      this.showError('No project selected');
      return;
    }
    
    // Display project information
    try {
      const projectNameDisplay = document.getElementById('complete-project-name-display');
      if (projectNameDisplay) {
        projectNameDisplay.textContent = this.currentProject.name;
      }
      
      const projectDetailsDisplay = document.getElementById('complete-project-details-display');
      if (projectDetailsDisplay) {
        projectDetailsDisplay.innerHTML = `
          <div><strong>Description:</strong> ${this.currentProject.description}</div>
          <div><strong>Target:</strong> ${this.currentProject.target}</div>
          <div><strong>Category:</strong> ${this.currentProject.category}</div>
          <div><strong>Status:</strong> <span class="badge badge-info">${this.currentProject.statusText || this.currentProject.status}</span></div>
        `;
      }
    } catch (error) {
      console.warn('Failed to update project display elements in step 5:', error);
    }
  }

  nextStep() {
    try {
      if (this.workflowStep < 5) {
        this.updateWorkflowStep(this.workflowStep + 1);
      }
    } catch (error) {
      console.error('Error moving to next step:', error);
      this.showError('Failed to move to next step: ' + error.message);
    }
  }

  previousStep() {
    try {
      if (this.workflowStep > 1) {
        this.updateWorkflowStep(this.workflowStep - 1);
      }
    } catch (error) {
      console.error('Error moving to previous step:', error);
      this.showError('Failed to move to previous step: ' + error.message);
    }
  }

  async proposePayout() {
    try {
      // Проверяем подключение к Web3
      const isConnected = await this.checkWeb3Connection();
      if (!isConnected) return;
      
      // Проверяем, что у нас есть действующий аккаунт для отправки транзакции
      if (!this.account) {
        this.showError('Для отправки транзакции необходимо подключить кошелек с приватным ключом или использовать MetaMask. Пожалуйста, укажите приватный ключ или подключите MetaMask.');
        return;
      }
      
      if (!this.currentProject) {
        this.showError('Проект не выбран');
        return;
      }
      
      const recipientAddressElement = document.getElementById('recipient-address');
      const payoutAmountElement = document.getElementById('payout-amount');
      const payoutDescriptionElement = document.getElementById('payout-description');
      
      const recipient = recipientAddressElement ? recipientAddressElement.value : '';
      const amount = payoutAmountElement ? this.web3.utils.toWei(payoutAmountElement.value, 'ether') : '0';
      const description = payoutDescriptionElement ? (payoutDescriptionElement.value || `Выплата по проекту ${this.currentProject.name}`) : `Выплата по проекту ${this.currentProject.name}`;
      
      if (!this.web3.utils.isAddress(recipient)) {
        this.showError('Неверный адрес получателя');
        return;
      }
      
      // Validate amount
      if (!amount || amount === '0') {
        this.showError('Пожалуйста, укажите корректную сумму выплаты');
        return;
      }
      
      // Показываем индикатор загрузки
      const proposeButton = document.getElementById('propose-button');
      if (proposeButton) {
        proposeButton.disabled = true;
        proposeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
      }
      
      console.log('Proposing payout for project:', this.currentProject.id);
      console.log('Recipient:', recipient);
      console.log('Amount:', this.web3.utils.fromWei(amount, 'ether'), 'ETH');
      console.log('From account:', this.account);
      
      // Call proposeProjectPayout function with gas parameters
      const txReceipt = await this.contracts.multisig.methods.proposeProjectPayout(
        recipient,
        amount,
        this.currentProject.id,
        description
      ).send({
        from: this.account,
        gas: 300000, // Установим достаточный лимит газа
        gasPrice: await this.web3.eth.getGasPrice()
      });
      
      console.log('Transaction receipt:', txReceipt);
      
      // Store receipt globally for debugging
      window.lastTxReceipt = txReceipt;
      console.log('Transaction receipt stored in window.lastTxReceipt for debugging');
      
      // Log the logs for manual inspection
      if (txReceipt.logs && txReceipt.logs.length > 0) {
        console.log('Transaction logs for manual txId extraction:');
        txReceipt.logs.forEach((log, index) => {
          console.log(`Log ${index}:`, {
            topics: log.topics,
            data: log.data,
            address: log.address
          });
        });
      }
      
      // Try to get txId directly from the receipt first
      let transactionId = null;
      
      // Method 1: Try to get from events (Web3.js v1.x format)
      if (txReceipt.events && txReceipt.events.TxProposed && txReceipt.events.TxProposed.returnValues) {
        transactionId = txReceipt.events.TxProposed.returnValues.txId;
        console.log('Found txId in events:', transactionId);
      }
      
      // Method 1b: Try alternative event format
      if (!transactionId && txReceipt.events && typeof txReceipt.events === 'object') {
        for (const [eventName, eventData] of Object.entries(txReceipt.events)) {
          if (eventName === 'TxProposed' && eventData && eventData.returnValues && eventData.returnValues.txId) {
            transactionId = eventData.returnValues.txId;
            console.log('Found txId in alternative event format:', transactionId);
            break;
          }
        }
      }
      
      // Method 2: Try to get from raw logs by decoding the first topic as txId
      if (!transactionId && txReceipt.logs && txReceipt.logs.length > 0) {
        console.log('Attempting to extract txId from raw logs...');
        for (let i = 0; i < txReceipt.logs.length; i++) {
          const log = txReceipt.logs[i];
          console.log(`Analyzing log ${i}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          });
          
          // The first topic should be the indexed txId parameter
          if (log.topics && log.topics.length > 0) {
            try {
              const firstTopic = log.topics[0];
              if (firstTopic && firstTopic.startsWith('0x')) {
                const decoded = this.web3.utils.hexToNumberString(firstTopic);
                if (decoded && !isNaN(decoded) && parseInt(decoded) > 0) {
                  console.log('Found txId in first topic:', decoded);
                  transactionId = decoded;
                  break;
                }
              }
            } catch (e) {
              console.warn('Failed to decode topic as number:', e);
            }
          }
        }
      }
      
      // Method 3: If extraction failed, try to get latest transaction ID from contract
      if (!transactionId) {
        console.log('Transaction ID not found in event logs, trying to get latest transaction ID from contract');
        try {
          const txCount = await this.contracts.multisig.methods.txCount().call();
          if (txCount && parseInt(txCount) > 0) {
            transactionId = (parseInt(txCount) - 1).toString();
            console.log('Transaction ID from txCount fallback:', transactionId);
          }
        } catch (error) {
          console.error('Fallback method failed:', error);
          // Попробуем использовать номер блока как fallback
          if (txReceipt.blockNumber) {
            transactionId = txReceipt.blockNumber.toString();
            console.log('Using block number as fallback transaction ID:', transactionId);
          }
        }
      }
      
      if (!transactionId) {
        console.error('Failed to extract transaction ID from event logs');
        this.showWarning('Не удалось получить ID транзакции автоматически. Используйте форму ниже для ручного ввода.');
        
        // Показываем форму для ручного ввода txId
        const manualTxForm = document.getElementById('manual-tx-form');
        console.log('Looking for manual-tx-form element:', manualTxForm);
        if (manualTxForm) {
          manualTxForm.style.display = 'block';
          console.log('Manual transaction form displayed');
        } else {
          console.error('manual-tx-form element not found in DOM');
        }
        
        // Попробуем использовать последний известный txCount как fallback
        try {
          const lastTxCount = await this.contracts.multisig.methods.txCount().call();
          if (lastTxCount && parseInt(lastTxCount) > 0) {
            transactionId = (parseInt(lastTxCount) - 1).toString();
            console.log('Using last txCount as fallback transaction ID:', transactionId);
            this.showWarning(`Используется резервный ID транзакции: ${transactionId}. Если это неверно, введите правильный ID вручную.`);
          }
        } catch (fallbackError) {
          console.warn('Fallback txCount also failed:', fallbackError);
          // Используем номер блока как последний fallback
          if (txReceipt.blockNumber) {
            transactionId = txReceipt.blockNumber.toString();
            console.log('Using block number as final fallback transaction ID:', transactionId);
            this.showWarning(`Используется номер блока как ID транзакции: ${transactionId}. Если это неверно, введите правильный ID вручную.`);
          }
        }
        
        // Если всё ещё нет transactionId, останавливаем выполнение
        if (!transactionId) {
          // Восстанавливаем кнопку
          if (proposeButton) {
            proposeButton.disabled = false;
            proposeButton.innerHTML = 'Предложить выплату';
          }
          return;
        }
      }
      
      this.currentTransactionId = transactionId;
      
      // Save transaction ID to localStorage for persistence between page reloads
      if (this.currentTransactionId) {
        localStorage.setItem('currentTransactionId', this.currentTransactionId);
        console.log('Transaction ID saved to localStorage:', this.currentTransactionId);
        this.showSuccess(`Предложение на выплату создано с ID транзакции: ${this.currentTransactionId}`);
        
        // Update the transaction display
        this.updateTransactionDisplay();
        
        // Hide the manual input form if it was shown
        const manualTxForm = document.getElementById('manual-tx-form');
        if (manualTxForm) {
          manualTxForm.style.display = 'none';
        }
      } else {
        console.error('Failed to extract transaction ID');
        this.showError('Не удалось получить ID транзакции. Проверьте консоль для получения дополнительной информации.');
        // Восстанавливаем кнопку
        if (proposeButton) {
          proposeButton.disabled = false;
          proposeButton.innerHTML = 'Предложить выплату';
        }
        return;
      }
      
      // Восстанавливаем кнопку
      if (proposeButton) {
        proposeButton.disabled = false;
        proposeButton.innerHTML = 'Предложить выплату';
      }
      
      // Refresh projects list to show updated statuses
      try {
        await this.refreshProjects();
        console.log('Projects list refreshed after payout proposal');
      } catch (refreshError) {
        console.warn('Failed to refresh projects list:', refreshError);
      }
      
      // Move to step 3
      this.updateWorkflowStep(3);
    } catch (error) {
      console.error('Payout proposal error:', error);
      this.showError('Не удалось создать предложение на выплату: ' + error.message);
      
      // Восстанавливаем кнопку
      const proposeButton = document.getElementById('propose-button');
      if (proposeButton) {
        proposeButton.disabled = false;
        proposeButton.innerHTML = 'Предложить выплату';
      }
    }
  }

  // Method to check if a transaction ID is valid (for debugging)
  async isValidTransactionId(txId) {
    try {
      if (!this.contracts.multisig) {
        console.warn('Multisig contract not initialized');
        return false;
      }
      
      // Try to get transaction details
      const tx = await this.contracts.multisig.methods.txs(txId).call();
      console.log('Transaction details for ID', txId, ':', tx);
      
      // If we get here without an error, the transaction ID is valid
      return true;
    } catch (error) {
      console.error('Invalid transaction ID', txId, ':', error.message);
      return false;
    }
  }

  // Надёжное извлечение txId из квитанции транзакции
  async extractTxIdFromReceipt(txReceipt, recipient, amount, projectId) {
    try {
      console.log('Extracting txId from receipt:', txReceipt);
      
      // 1) Пробуем стандартный путь через events (Web3.js v1.x)
      if (txReceipt && txReceipt.events && txReceipt.events.TxProposed && txReceipt.events.TxProposed.returnValues) {
        const id = txReceipt.events.TxProposed.returnValues.txId;
        if (id !== undefined && id !== null) {
          console.log('Found txId in events.TxProposed.returnValues:', id);
          return id.toString();
        }
      }

      // 2) Если events — массив (Web3.js v1.x альтернативный формат)
      if (txReceipt && Array.isArray(txReceipt.events)) {
        const found = txReceipt.events.find(e => e && e.event === 'TxProposed' && e.returnValues && e.returnValues.txId !== undefined);
        if (found) {
          console.log('Found txId in events array:', found.returnValues.txId);
          return found.returnValues.txId.toString();
        }
      }

      // 3) Декодируем вручную логи по сигнатуре события
      if (txReceipt && Array.isArray(txReceipt.logs)) {
        console.log('Attempting manual log decoding, logs count:', txReceipt.logs.length);
        
        // Пробуем найти событие TxProposed по сигнатуре
        const eventSignature = this.web3.eth.abi.encodeEventSignature('TxProposed(uint256,address,address,uint256,uint8,bytes32,string)');
        console.log('Looking for event signature:', eventSignature);
        
        for (let i = 0; i < txReceipt.logs.length; i++) {
          const log = txReceipt.logs[i];
          console.log(`Log ${i}:`, log);
          
          if (log.topics && log.topics[0] === eventSignature) {
            console.log('Found matching event signature in log:', i);
            
            try {
              // Декодируем параметры события
              const eventInputs = [
                { type: 'uint256', name: 'txId', indexed: true },
                { type: 'address', name: 'proposer', indexed: true },
                { type: 'address', name: 'to', indexed: true },
                { type: 'uint256', name: 'value', indexed: false },
                { type: 'uint8', name: 'txType', indexed: false },
                { type: 'bytes32', name: 'projectId', indexed: false },
                { type: 'string', name: 'description', indexed: false }
              ];
              
              const decoded = this.web3.eth.abi.decodeLog(eventInputs, log.data, log.topics.slice(1));
              console.log('Decoded event parameters:', decoded);
              
              if (decoded && decoded.txId !== undefined) {
                console.log('Successfully extracted txId from log:', decoded.txId);
                return decoded.txId.toString();
              }
            } catch (decodeError) {
              console.warn('Failed to decode log:', decodeError);
            }
          }
        }
      }

      // 4) Резервно: пытаемся прочитать событие с того же блока через getPastEvents
      if (txReceipt && txReceipt.blockNumber) {
        console.log('Trying getPastEvents for block:', txReceipt.blockNumber);
        try {
          const past = await this.contracts.multisig.getPastEvents('TxProposed', {
            fromBlock: txReceipt.blockNumber,
            toBlock: txReceipt.blockNumber
          });
          console.log('getPastEvents result:', past);
          
          if (past && past.length > 0) {
            // Фильтруем по параметрам (где доступны)
            const match = past.find(ev => {
              try {
                const byTo = !recipient || recipient.toLowerCase() === (ev.returnValues.to || '').toLowerCase();
                const byAmount = !amount || amount === ev.returnValues.value;
                const byProject = !projectId || (ev.returnValues.projectId || '').toLowerCase() === projectId.toLowerCase();
                return byTo && byAmount && byProject;
              } catch (_) { return false; }
            }) || past[0];
            
            if (match && match.returnValues && match.returnValues.txId !== undefined) {
              console.log('Found txId via getPastEvents:', match.returnValues.txId);
              return match.returnValues.txId.toString();
            }
          }
        } catch (e) {
          console.warn('getPastEvents fallback failed:', e);
        }
      }

      // 5) В самом крайнем случае — текущий txCount как ID
      try {
        console.log('Trying txCount fallback');
        const transactionCount = await this.contracts.multisig.methods.txCount().call();
        if (parseInt(transactionCount) > 0) {
          console.log('Using txCount as txId:', transactionCount);
          return parseInt(transactionCount).toString();
        }
      } catch (countError) {
        console.warn('txCount fallback failed:', countError);
        // Если txCount не работает, попробуем другой подход
        try {
          console.log('Trying alternative approach - getting transaction by index');
          // Попробуем получить транзакцию по индексу
          const latestTx = await this.contracts.multisig.methods.txs(parseInt(transactionCount) - 1).call();
          if (latestTx && latestTx.id) {
            console.log('Found latest transaction ID:', latestTx.id);
            return latestTx.id.toString();
          }
        } catch (altError) {
          console.warn('Alternative approach also failed:', altError);
        }
      }

      console.log('All extraction methods failed');
      return null;
    } catch (error) {
      console.error('extractTxIdFromReceipt error:', error);
      return null;
    }
  }

  // Поиск txId по критериям в последних транзакциях контракта
  async findTxIdByCriteria({ to, value, projectId, proposer }) {
    try {
      if (!this.contracts.multisig) return null;
      const countRaw = await this.contracts.multisig.methods.txCount().call();
      const count = parseInt(countRaw || '0');
      if (count === 0) return null;
      // Просканируем последние 20 транзакций (или меньше, если их меньше)
      const scan = Math.min(20, count);
      for (let i = count - 1; i >= Math.max(0, count - scan); i--) {
        try {
          const tx = await this.contracts.multisig.methods.txs(i).call();
          const toOk = !to || (tx.to || '').toLowerCase() === to.toLowerCase();
          const valueOk = !value || value === tx.value;
          const projectOk = !projectId || (tx.projectId || '').toLowerCase() === projectId.toLowerCase();
          const proposerOk = !proposer || (tx.proposer || '').toLowerCase() === proposer.toLowerCase();
          if (toOk && valueOk && projectOk && proposerOk) {
            return i.toString();
          }
        } catch (_) {}
      }
      return null;
    } catch (error) {
      console.warn('findTxIdByCriteria error:', error);
      return null;
    }
  }

  

  

  async confirmTransaction() {
    try {
      if (!this.web3 || !this.contracts.multisig) {
        this.showError('Not connected to Web3');
        return;
      }
      
      if (!this.account) {
        this.showError('Для подтверждения транзакции необходимо подключить кошелек с приватным ключом или использовать MetaMask. Пожалуйста, укажите приватный ключ или подключите MetaMask.');
        return;
      }
      
      if (!this.currentTransactionId) {
        this.showError('No transaction selected');
        return;
      }
      
      // Disable button and show loading indicator
      const confirmButton = document.getElementById('confirm-button');
      if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Подтверждение...';
      }
      
      console.log('Confirming transaction:', this.currentTransactionId);
      console.log('From account:', this.account);
      
      // Call confirm function with gas parameters
      const receipt = await this.contracts.multisig.methods.confirm(this.currentTransactionId).send({
        from: this.account,
        gas: 200000, // Установим достаточный лимит газа
        gasPrice: await this.web3.eth.getGasPrice()
      });
      
      console.log('Confirmation receipt:', receipt);
      this.showSuccess(`Transaction #${this.currentTransactionId} confirmed successfully`);
      
      // Restore button
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.innerHTML = 'Confirm Transaction';
      }
      
      // Refresh transaction status
      try {
        await this.refreshTransactionStatus();
      } catch (refreshError) {
        console.warn('Failed to refresh transaction status after confirmation:', refreshError);
        // Продолжаем выполнение даже если обновление статуса не удалось
      }
      
      // Refresh projects list to show updated statuses
      try {
        await this.refreshProjects();
        console.log('Projects list refreshed after transaction confirmation');
      } catch (refreshError) {
        console.warn('Failed to refresh projects list:', refreshError);
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      this.showError(`Failed to confirm transaction: ${error.message}`);
      
      // Restore button
      const confirmButton = document.getElementById('confirm-button');
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.innerHTML = 'Confirm Transaction';
      }
    }
  }

  async refreshTransactionStatus() {
    try {
      console.log('Refreshing transaction status, transaction ID:', this.currentTransactionId);
      
      if (!this.currentTransactionId) {
        console.warn('No transaction ID available to refresh status');
        return;
      }
      
      if (!this.contracts.multisig) {
        console.warn('Multisig contract not initialized');
        return;
      }
      
      // Get transaction details
      console.log('Fetching transaction details for ID:', this.currentTransactionId);
      let tx, required, userConfirmed = false;
      
      try {
        tx = await this.contracts.multisig.methods.txs(this.currentTransactionId).call();
        console.log('Transaction details:', tx);
      } catch (txError) {
        console.warn('Failed to get transaction details:', txError);
        // Если не можем получить детали, создаём базовую структуру
        tx = {
          to: 'Unknown',
          value: '0',
          data: '0x',
          status: '0',
          confirmations: '0',
          proposer: 'Unknown',
          projectId: '0x0000000000000000000000000000000000000000000000000000000000000000',
          description: 'Transaction details unavailable'
        };
      }
      
      try {
        required = await this.contracts.multisig.methods.required().call();
        console.log('Required confirmations:', required);
      } catch (reqError) {
        console.warn('Failed to get required confirmations:', reqError);
        required = '1'; // Значение по умолчанию
      }
      
      // Check if current user has confirmed
      if (this.account) {
              try {
        userConfirmed = await this.contracts.multisig.methods.hasConfirmed(this.currentTransactionId, this.account).call();
        console.log('User confirmation status:', userConfirmed);
      } catch (confError) {
        console.warn('Failed to get user confirmation status:', confError);
        userConfirmed = false;
      }
      }
      
      // Format transaction details
      const details = {
        to: tx.to,
        value: this.web3.utils.fromWei(tx.value, 'ether') + ' ETH',
        data: tx.data,
        executed: tx.status === '1', // 1 means executed
        numConfirmations: parseInt(tx.confirmations),
        proposer: tx.proposer,
        projectId: tx.projectId,
        description: tx.description
      };
      
      console.log('Formatted transaction details:', details);
      
      // Display details
      const txDetailsDisplay = document.getElementById('tx-details-display');
      if (txDetailsDisplay) {
        txDetailsDisplay.innerHTML = `
          <div><strong>Status:</strong> <span class="badge ${details.executed ? 'badge-success' : 'badge-warning'}">${details.executed ? 'Executed' : 'Pending'}</span></div>
          <div><strong>To:</strong> ${details.to}</div>
          <div><strong>Amount:</strong> ${details.value}</div>
          <div><strong>Description:</strong> ${details.description}</div>
          <div><strong>Confirmations:</strong> ${details.numConfirmations}/${required}</div>
          <div><strong>Your confirmation:</strong> <span class="badge ${userConfirmed ? 'badge-success' : 'badge-secondary'}">${userConfirmed ? 'Confirmed' : 'Not confirmed'}</span></div>
          <div><strong>Proposer:</strong> ${details.proposer}</div>
        `;
      }
      
      // Enable next button if executed
      const nextButton = document.getElementById('next-step-3');
      if (nextButton) {
        try {
          if (details.executed) {
            nextButton.disabled = false;
            nextButton.classList.add('btn-success');
          } else {
            nextButton.disabled = true;
            nextButton.classList.remove('btn-success');
          }
        } catch (parseError) {
          console.warn('Failed to parse transaction status for next button:', parseError);
          nextButton.disabled = true;
        }
      }
      
      // Enable confirm button if not executed and not confirmed by user
      const confirmButton = document.getElementById('confirm-button');
      if (confirmButton) {
        try {
          if (!details.executed && !userConfirmed && this.account) {
            confirmButton.disabled = false;
          } else {
            confirmButton.disabled = true;
          }
        } catch (parseError) {
          console.warn('Failed to parse transaction status for confirm button:', parseError);
          confirmButton.disabled = true;
        }
      }
    } catch (error) {
      console.error('Error refreshing transaction status:', error);
      this.showError('Failed to refresh transaction status: ' + error.message);
    }
  }

  async refreshExecutionStatus() {
    try {
      if (!this.currentTransactionId || !this.contracts.multisig) {
        return;
      }
      
      // Get transaction details
      let tx;
      try {
        tx = await this.contracts.multisig.methods.txs(this.currentTransactionId).call();
      } catch (txError) {
        console.warn('Failed to get transaction details for execution status:', txError);
        // Если не можем получить детали, создаём базовую структуру
        tx = { 
          id: this.currentTransactionId,
          to: 'Unknown',
          value: '0',
          txType: '0',
          status: '0',
          confirmations: '0',
          createdAt: '0',
          executedAt: '0',
          projectId: '0x0000000000000000000000000000000000000000000000000000000000000000',
          description: 'Transaction details unavailable',
          proposer: 'Unknown'
        };
      }
      
      // Get multisig required confirmations
      let required = '1';
      try {
        required = await this.contracts.multisig.methods.required().call();
      } catch (reqError) {
        console.warn('Failed to get required confirmations:', reqError);
        required = '1'; // Значение по умолчанию
      }
      
      // Format transaction details
      const statusMap = ['Pending', 'Executed', 'Cancelled'];
      const typeMap = ['GeneralPayout', 'ProjectPayout', 'ConfigChange', 'OwnershipChange'];
      
      const details = {
        id: tx.id,
        to: tx.to,
        value: this.web3.utils.fromWei(tx.value, 'ether') + ' ETH',
        type: typeMap[tx.txType] || 'Unknown',
        status: statusMap[tx.status] || 'Unknown',
        confirmations: `${tx.confirmations}/${required}`,
        createdAt: new Date(tx.createdAt * 1000).toLocaleString(),
        executedAt: tx.executedAt > 0 ? new Date(tx.executedAt * 1000).toLocaleString() : 'Not executed',
        projectId: tx.projectId !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? tx.projectId : 'N/A',
        description: tx.description,
        proposer: tx.proposer
      };
      
      // Display details
      const executeTxDetailsDisplay = document.getElementById('execute-tx-details-display');
      if (executeTxDetailsDisplay) {
        executeTxDetailsDisplay.innerHTML = `
          <div><strong>Status:</strong> <span class="badge ${tx.status === '0' ? 'badge-warning' : tx.status === '1' ? 'badge-success' : 'badge-danger'}">${details.status}</span></div>
          <div><strong>To:</strong> ${details.to}</div>
          <div><strong>Amount:</strong> ${details.value}</div>
          <div><strong>Type:</strong> ${details.type}</div>
          <div><strong>Confirmations:</strong> ${details.confirmations}</div>
          <div><strong>Created:</strong> ${details.createdAt}</div>
          <div><strong>Description:</strong> ${details.description}</div>
        `;
      }
      
      // Enable next button if executed
      const nextButton = document.getElementById('next-step-4');
      if (nextButton) {
        try {
          if (tx.status === '1') { // Executed
            nextButton.disabled = false;
            nextButton.classList.add('btn-success');
          } else {
            nextButton.disabled = true;
            nextButton.classList.remove('btn-success');
          }
        } catch (parseError) {
          console.warn('Failed to parse transaction status for next button:', parseError);
          nextButton.disabled = true;
        }
      }
      
      // Enable execute button if confirmed but not executed
      const executeButton = document.getElementById('execute-button');
      if (executeButton) {
        try {
          if (tx.status === '0' && parseInt(tx.confirmations) >= parseInt(required)) {
            executeButton.disabled = false;
          } else {
            executeButton.disabled = true;
          }
        } catch (parseError) {
          console.warn('Failed to parse transaction status for execute button:', parseError);
          executeButton.disabled = true;
        }
      }
    } catch (error) {
      console.error('Error refreshing execution status:', error);
      this.showError('Failed to refresh execution status: ' + error.message);
    }
  }

  async executeTransaction() {
    try {
      if (!this.web3 || !this.contracts.multisig) {
        this.showError('Not connected to Web3');
        return;
      }
      
      if (!this.account) {
        this.showError('Для выполнения транзакции необходимо подключить кошелек с приватным ключом или использовать MetaMask. Пожалуйста, укажите приватный ключ или подключите MetaMask.');
        return;
      }
      
      if (!this.currentTransactionId) {
        this.showError('No transaction selected');
        return;
      }
      
      // Call execute function with gas parameters
      const receipt = await this.contracts.multisig.methods.execute(this.currentTransactionId).send({
        from: this.account,
        gas: 300000, // Установим достаточный лимит газа
        gasPrice: await this.web3.eth.getGasPrice()
      });
      
      console.log('Execution receipt:', receipt);
      this.showSuccess(`Transaction #${this.currentTransactionId} executed successfully`);
      
      // Refresh execution status
      try {
        await this.refreshExecutionStatus();
      } catch (refreshError) {
        console.warn('Failed to refresh execution status after execution:', refreshError);
        // Продолжаем выполнение даже если обновление статуса не удалось
      }
      
      // Automatically update project status to Paid (5) after successful payout
      if (this.currentProject && this.contracts.projects) {
        try {
          console.log('Updating project status to Paid after successful payout...');
          const updateReceipt = await this.contracts.projects.methods.setStatus(
            this.currentProject.id, 
            5, 
            'Project payout completed successfully'
          ).send({
            from: this.account,
            gas: 200000,
            gasPrice: await this.web3.eth.getGasPrice()
          });
          
          console.log('Project status updated to Paid:', updateReceipt);
          this.showSuccess('Статус проекта автоматически обновлен на "Paid"');
          
          // Update current project status
          this.currentProject.status = 5;
          this.currentProject.statusText = 'Paid';
          
        } catch (updateError) {
          console.warn('Failed to automatically update project status:', updateError);
          this.showWarning('Выплата выполнена, но не удалось автоматически обновить статус проекта. Обновите вручную.');
        }
      }
      
      // Refresh projects list to show updated statuses
      try {
        await this.refreshProjects();
        console.log('Projects list refreshed after transaction execution');
      } catch (refreshError) {
        console.warn('Failed to refresh projects list:', refreshError);
      }
    } catch (error) {
      console.error('Execution error:', error);
      this.showError(`Failed to execute transaction: ${error.message}`);
    }
  }

  async refreshProjectStatus() {
    try {
      if (!this.currentProject || !this.contracts.projects) {
        return;
      }
      
      // Get project details
      let project;
      try {
        project = await this.contracts.projects.methods.projects(this.currentProject.id).call();
      } catch (projectError) {
        console.warn('Failed to get project details:', projectError);
        // Если не можем получить детали проекта, предполагаем что он в статусе Paid
        project = { status: '5' };
      }
      
      // Format status
      const statusMap = ['Draft', 'Active', 'FundingReady', 'Voting', 'ReadyToPayout', 'Paid', 'Cancelled', 'Archived'];
      const status = statusMap[project.status] || 'Unknown';
      
      // Update current project status
      this.currentProject.status = status;
      
      // Enable finish button if project is Paid
      const finishButton = document.getElementById('finish-workflow');
      if (finishButton) {
        if (project.status === '5') { // Paid
          finishButton.disabled = false;
          finishButton.classList.add('btn-success');
        } else {
          finishButton.disabled = true;
          finishButton.classList.remove('btn-success');
        }
      } else {
        console.warn('Finish workflow button not found');
      }
    } catch (error) {
      console.error('Error refreshing project status:', error);
      this.showError('Failed to refresh project status: ' + error.message);
    }
  }

  async completeProject() {
    try {
      if (!this.web3 || !this.contracts.projects) {
        this.showError('Not connected to Web3');
        return;
      }
      
      if (!this.account) {
        this.showError('Для завершения проекта необходимо подключить кошелек с приватным ключом или использовать MetaMask. Пожалуйста, укажите приватный ключ или подключите MetaMask.');
        return;
      }
      
      if (!this.currentProject) {
        this.showError('No project selected');
        return;
      }
      
      const completionReasonElement = document.getElementById('completion-reason');
      const reason = completionReasonElement ? (completionReasonElement.value || 'Project payout completed') : 'Project payout completed';
      
      // Call setStatus function to mark project as Paid (status 5) with gas parameters
      const receipt = await this.contracts.projects.methods.setStatus(this.currentProject.id, 5, reason).send({
        from: this.account,
        gas: 200000, // Установим достаточный лимит газа
        gasPrice: await this.web3.eth.getGasPrice()
      });
      
      console.log('Project completion receipt:', receipt);
      this.showSuccess(`Project marked as Paid successfully`);
      
      // Enable the finish workflow button
      const finishWorkflowBtn = document.getElementById('finish-workflow');
      if (finishWorkflowBtn) {
        finishWorkflowBtn.disabled = false;
        console.log('Finish Workflow button enabled');
      } else {
        console.warn('Finish workflow button not found, trying alternative selectors');
        // Попробуем найти кнопку по альтернативным селекторам
        const altFinishBtn = document.querySelector('[data-finish-workflow]') || 
                            document.querySelector('.finish-workflow-btn') ||
                            document.querySelector('#step-5 .btn-success');
        if (altFinishBtn) {
          altFinishBtn.disabled = false;
          console.log('Alternative finish workflow button enabled');
        }
      }
      
      // Refresh project status (optional, can be skipped if it fails)
      try {
        await this.refreshProjectStatus();
      } catch (error) {
        console.warn('Failed to refresh project status, but project was completed successfully');
      }
    } catch (error) {
      console.error('Project completion error:', error);
      this.showError(`Failed to complete project: ${error.message}`);
    }
  }

  finishWorkflow() {
    this.showSuccess('Project payout workflow completed successfully!');
    
    // Попробуем показать модальное окно
    try {
      this.showModal('Workflow Completed', '<p>The project payout workflow has been completed successfully.</p><p>You can start a new workflow or disconnect from Web3.</p>');
    } catch (modalError) {
      console.warn('Failed to show completion modal:', modalError);
      // Если модальное окно не работает, показываем простое сообщение
      alert('Project payout workflow completed successfully!');
    }
    
    // Сбрасываем состояние для нового workflow
    this.currentTransactionId = null;
    localStorage.removeItem('currentTransactionId');
    this.workflowStep = 1;
    this.updateWorkflowStep(1);
    
    console.log('Workflow completed and reset for new session');
  }

  // Method to manually clear transaction ID from localStorage (for debugging)
  clearTransactionId() {
    try {
      this.currentTransactionId = null;
      localStorage.removeItem('currentTransactionId');
      console.log('Transaction ID manually cleared from localStorage');
      this.showSuccess('Transaction ID cleared from localStorage');
    } catch (error) {
      console.error('Error clearing transaction ID:', error);
      this.showError('Failed to clear transaction ID: ' + error.message);
    }
  }

  // Method to update transaction display
  updateTransactionDisplay() {
    if (this.currentTransactionId) {
      try {
        const txIdDisplay = document.getElementById('tx-id-display');
        if (txIdDisplay) {
          txIdDisplay.textContent = this.currentTransactionId;
        }
        
        // Also update the manual input field
        const manualTxIdInput = document.getElementById('manual-tx-id');
        if (manualTxIdInput) {
          manualTxIdInput.value = this.currentTransactionId;
        }
      } catch (error) {
        console.warn('Failed to update transaction display:', error);
      }
    }
  }

  // Method to set transaction ID manually on step 2
  setManualTransactionIdStep2() {
    try {
      const manualTxIdInput = document.getElementById('manual-tx-id-step2');
      if (!manualTxIdInput) {
        this.showError('Manual transaction ID input not found');
        return;
      }
      
      const txId = manualTxIdInput.value.trim();
      if (!txId) {
        this.showError('Please enter a transaction ID');
        return;
      }
      
      // Validate that it's a number
      if (isNaN(txId) || parseInt(txId) <= 0) {
        this.showError('Transaction ID must be a positive number');
        return;
      }
      
      // Set the transaction ID
      this.currentTransactionId = txId;
      localStorage.setItem('currentTransactionId', txId);
      
      console.log('Manual transaction ID set on step 2:', txId);
      this.showSuccess(`Transaction ID ${txId} set manually`);
      
      // Enable the continue button
      const continueBtn = document.getElementById('continue-to-step3');
      if (continueBtn) {
        continueBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error setting manual transaction ID:', error);
      this.showError('Failed to set manual transaction ID: ' + error.message);
    }
  }

  // Test method to show manual form
  testShowManualForm() {
    try {
      console.log('Testing manual form display...');
      const manualTxForm = document.getElementById('manual-tx-form');
      console.log('Manual form element:', manualTxForm);
      
      if (manualTxForm) {
        manualTxForm.style.display = 'block';
        console.log('Manual form should now be visible');
        this.showSuccess('Manual form displayed for testing');
      } else {
        console.error('Manual form not found');
        this.showError('Manual form not found in DOM');
      }
    } catch (error) {
      console.error('Error testing manual form display:', error);
      this.showError('Failed to test manual form display: ' + error.message);
    }
  }

  // Method to continue to step 3 after manual txId input
  continueToStep3() {
    try {
      if (!this.currentTransactionId) {
        this.showError('Please set a transaction ID first');
        return;
      }
      
      console.log('Continuing to step 3 with manual transaction ID:', this.currentTransactionId);
      this.updateWorkflowStep(3);
    } catch (error) {
      console.error('Error continuing to step 3:', error);
      this.showError('Failed to continue to step 3: ' + error.message);
    }
  }
  
  // Method to skip to next step without checking transaction status
  skipToNextStep() {
    try {
      if (!this.currentTransactionId) {
        this.showError('Please set a transaction ID first');
        return;
      }
      
      console.log('Skipping to next step with transaction ID:', this.currentTransactionId);
      this.showWarning('Skipping transaction status check. Make sure the transaction is valid before proceeding.');
      
      // Move to next step
      this.nextStep();
    } catch (error) {
      console.error('Error skipping to next step:', error);
      this.showError('Failed to skip to next step: ' + error.message);
    }
  }
  
  // Method to skip to finish workflow on step 5
  skipToFinishWorkflow() {
    console.log('Skipping to finish workflow');
    this.showWarning('Skipping project status check. Project was marked as Paid successfully.');
    
    // Enable the finish workflow button
    const finishWorkflowBtn = document.getElementById('finish-workflow');
    if (finishWorkflowBtn) {
      finishWorkflowBtn.disabled = false;
      console.log('Finish Workflow button enabled');
    } else {
      console.warn('Finish workflow button not found, trying alternative selectors');
      // Попробуем найти кнопку по альтернативным селекторам
      const altFinishBtn = document.querySelector('[data-finish-workflow]') || 
                          document.querySelector('.finish-workflow-btn') ||
                          document.querySelector('#step-5 .btn-success');
      if (altFinishBtn) {
        altFinishBtn.disabled = false;
        console.log('Alternative finish workflow button enabled');
      }
    }
  }

  // Method to set transaction ID manually
  setManualTransactionId() {
    try {
      const manualTxIdInput = document.getElementById('manual-tx-id');
      if (!manualTxIdInput) {
        this.showError('Manual transaction ID input not found');
        return;
      }
      
      const txId = manualTxIdInput.value.trim();
      if (!txId) {
        this.showError('Please enter a transaction ID');
        return;
      }
      
      // Validate that it's a number
      if (isNaN(txId) || parseInt(txId) <= 0) {
        this.showError('Transaction ID must be a positive number');
        return;
      }
      
      // Set the transaction ID
      this.currentTransactionId = txId;
      localStorage.setItem('currentTransactionId', txId);
      
      console.log('Manual transaction ID set:', txId);
      this.showSuccess(`Transaction ID ${txId} set manually`);
      
      // Update the display
      this.updateTransactionDisplay();
      
      // Enable the next step button if we have a valid transaction
      const nextStep3Btn = document.getElementById('next-step-3');
      if (nextStep3Btn) {
        nextStep3Btn.disabled = false;
      }
    } catch (error) {
      console.error('Error setting manual transaction ID:', error);
      this.showError('Failed to set manual transaction ID: ' + error.message);
    }
  }

  // Method to check current state (for debugging)
  checkState() {
    try {
      console.log('=== Current State ===');
      console.log('Web3 connected:', !!this.web3);
      console.log('Account:', this.account);
      console.log('Current project:', this.currentProject);
      console.log('Current transaction ID:', this.currentTransactionId);
      console.log('Workflow step:', this.workflowStep);
      console.log('LocalStorage transaction ID:', localStorage.getItem('currentTransactionId'));
      console.log('====================');
      
      this.showModal('Current State', `
        <div style="text-align: left;">
          <p><strong>Web3 connected:</strong> ${!!this.web3}</p>
          <p><strong>Account:</strong> ${this.account || 'None'}</p>
          <p><strong>Current project:</strong> ${this.currentProject ? this.currentProject.name : 'None'}</p>
          <p><strong>Current transaction ID:</strong> ${this.currentTransactionId || 'None'}</p>
          <p><strong>Workflow step:</strong> ${this.workflowStep}</p>
          <p><strong>LocalStorage transaction ID:</strong> ${localStorage.getItem('currentTransactionId') || 'None'}</p>
          <hr>
          <p><strong>Debug Info:</strong></p>
          <p>Last transaction receipt: ${window.lastTxReceipt ? 'Available' : 'None'}</p>
          <p>Console commands:</p>
          <code>window.lastTxReceipt</code> - view last receipt<br>
          <code>window.lastTxReceipt.logs</code> - view transaction logs<br>
          <code>window.lastTxReceipt.events</code> - view events
        </div>
      `);
    } catch (error) {
      console.error('Error checking state:', error);
      this.showError('Failed to check state: ' + error.message);
    }
  }

  showError(message) {
    console.error(message);
    try {
      this.showModal('Error', `<div class="alert alert-danger">${message}</div>`);
    } catch (error) {
      console.warn('Failed to show error modal:', error);
      // Fallback to simple alert
      alert(`Error: ${message}`);
    }
  }

  showSuccess(message) {
    console.log(message);
    // Show success message to user
    try {
      this.showModal('Success', `<div class="alert alert-success">${message}</div>`);
    } catch (error) {
      console.warn('Failed to show success modal:', error);
      // Fallback to simple alert
      alert(`Success: ${message}`);
    }
  }

  showWarning(message) {
    console.warn(message);
    try {
      this.showModal('Warning', `<div class="alert alert-warning">${message}</div>`);
    } catch (error) {
      console.warn('Failed to show warning modal:', error);
      // Fallback to simple alert
      alert(`Warning: ${message}`);
    }
  }

  showModal(title, content) {
    try {
      const modalTitle = document.getElementById('modal-title');
      if (modalTitle) {
        modalTitle.textContent = title;
      }
      
      const modalBody = document.getElementById('modal-body');
      if (modalBody) {
        modalBody.innerHTML = content;
      }
      
      const modal = document.getElementById('modal');
      if (modal) {
        modal.classList.remove('hidden');
      } else {
        console.warn('Modal element not found, falling back to alert');
        alert(`${title}\n\n${content.replace(/<[^>]*>/g, '')}`);
      }
    } catch (error) {
      console.warn('Failed to show modal:', error);
      // Fallback to simple alert
      alert(`${title}\n\n${content.replace(/<[^>]*>/g, '')}`);
    }
  }

  closeModal() {
    try {
      const modal = document.getElementById('modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    } catch (error) {
      console.warn('Failed to close modal:', error);
    }
  }
}

// Initialize the interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.projectPayout = new ProjectPayoutInterface();
  
  // Add global debug functions
  window.analyzeLastTx = () => {
    if (window.lastTxReceipt) {
      console.log('=== Last Transaction Analysis ===');
      console.log('Receipt:', window.lastTxReceipt);
      console.log('Events:', window.lastTxReceipt.events);
      console.log('Logs:', window.lastTxReceipt.logs);
      
      if (window.lastTxReceipt.logs && window.lastTxReceipt.logs.length > 0) {
        console.log('=== Log Analysis ===');
        window.lastTxReceipt.logs.forEach((log, index) => {
          console.log(`Log ${index}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          });
          
          // Try to decode topics
          if (log.topics && log.topics.length > 0) {
            log.topics.forEach((topic, topicIndex) => {
              try {
                const decoded = window.projectPayout.web3.utils.hexToNumberString(topic);
                console.log(`  Topic ${topicIndex} (${topic}): ${decoded}`);
              } catch (e) {
                console.log(`  Topic ${topicIndex} (${topic}): [not a number]`);
              }
            });
          }
        });
      }
    } else {
      console.log('No transaction receipt available. Create a transaction first.');
    }
  };
  
  window.getTxIdFromLogs = () => {
    if (window.lastTxReceipt && window.lastTxReceipt.logs && window.lastTxReceipt.logs.length > 0) {
      const log = window.lastTxReceipt.logs[0];
      console.log('Analyzing log for txId:', log);
      
      if (log.topics && log.topics.length > 0) {
        // Try all topics
        for (let i = 0; i < log.topics.length; i++) {
          try {
            const txId = window.projectPayout.web3.utils.hexToNumberString(log.topics[i]);
            if (txId && !isNaN(txId) && parseInt(txId) > 0) {
              console.log(`Found txId in topic ${i}:`, txId);
              return txId;
            }
          } catch (e) {
            console.log(`Topic ${i} is not a number:`, log.topics[i]);
          }
        }
        
        // Try to decode data field
        if (log.data && log.data !== '0x') {
          try {
            const decodedData = window.projectPayout.web3.utils.hexToNumberString(log.data);
            if (decodedData && !isNaN(decodedData) && parseInt(decodedData) > 0) {
              console.log('Found txId in data field:', decodedData);
              return decodedData;
            }
          } catch (e) {
            console.log('Data field is not a number:', log.data);
          }
        }
      }
      
      console.log('No txId found in logs');
      return null;
    }
    return null;
  };
  
  window.getTxIdFromStorage = () => {
    const storedTxId = localStorage.getItem('currentTransactionId');
    if (storedTxId) {
      console.log('Found txId in localStorage:', storedTxId);
      return storedTxId;
    }
    
    // Try to find any transaction ID in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('transaction') || key && key.includes('tx')) {
        const value = localStorage.getItem(key);
        console.log(`Found potential txId in ${key}:`, value);
        if (value && !isNaN(value) && parseInt(value) > 0) {
          return value;
        }
      }
    }
    
    console.log('No txId found in localStorage');
    return null;
  };
});