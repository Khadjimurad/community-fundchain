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
            {
              "indexed": true,
              "internalType": "uint256",
              "name": "txId",
              "type": "uint256"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "indexed": true,
              "internalType": "bytes32",
              "name": "projectId",
              "type": "bytes32"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "description",
              "type": "string"
            }
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
          "name": "proposeTransaction",
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
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "confirmations",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
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
          "name": "getConfirmationCount",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "count",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
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
          "name": "getConfirmations",
          "outputs": [
            {
              "internalType": "address[]",
              "name": "_confirmations",
              "type": "address[]"
            }
          ],
          "stateMutability": "view",
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
          "name": "isOwner",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
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
          "name": "isConfirmed",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owners",
          "outputs": [
            {
              "internalType": "address[]",
              "name": "",
              "type": "address[]"
            }
          ],
          "stateMutability": "view",
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
          "inputs": [],
          "name": "getTransactionCount",
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
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "txs",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
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
              "internalType": "enum CommunityMultisig.TransactionType",
              "name": "txType",
              "type": "uint8"
            },
            {
              "internalType": "enum CommunityMultisig.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "confirmations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "executedAt",
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
            },
            {
              "internalType": "address",
              "name": "proposer",
              "type": "address"
            }
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
    console.log('Attempting to auto-connect to Web3...');
    
    // Проверяем, есть ли уже сохраненные настройки подключения
    const savedRpcUrl = localStorage.getItem('rpcUrl');
    const savedChainId = localStorage.getItem('chainId');
    const savedPrivateKey = localStorage.getItem('privateKey');
    
    // Устанавливаем сохраненные значения в поля ввода, если они есть
    const rpcUrlElement = document.getElementById('rpc-url');
    if (rpcUrlElement && savedRpcUrl) {
      rpcUrlElement.value = savedRpcUrl;
    }
    
    const chainIdElement = document.getElementById('chain-id');
    if (chainIdElement && savedChainId) {
      chainIdElement.value = savedChainId;
    }
    
    const privateKeyElement = document.getElementById('private-key');
    if (privateKeyElement && savedPrivateKey) {
      privateKeyElement.value = savedPrivateKey;
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
  }

  setupEventListeners() {
    // Connection events
    const connectButton = document.getElementById('connect-button');
    if (connectButton) {
      connectButton.addEventListener('click', () => this.connectWeb3());
    }
    
    const disconnectButton = document.getElementById('disconnect-button');
    if (disconnectButton) {
      disconnectButton.addEventListener('click', () => this.disconnectWeb3());
    }
    
    // Debug buttons (temporary - remove in production)
    const debugStateButton = document.getElementById('debug-state');
    if (debugStateButton) {
      debugStateButton.addEventListener('click', () => {
        if (window.projectPayout) {
          window.projectPayout.checkState();
        }
      });
    }
    
    const clearTxIdButton = document.getElementById('clear-tx-id');
    if (clearTxIdButton) {
      clearTxIdButton.addEventListener('click', () => {
        if (window.projectPayout) {
          window.projectPayout.clearTransactionId();
        }
      });
    }
    
    const resetWorkflowButton = document.getElementById('reset-workflow');
    if (resetWorkflowButton) {
      resetWorkflowButton.addEventListener('click', () => {
        if (window.projectPayout) {
          window.projectPayout.resetWorkflow();
        }
      });
    }
    
    // Make debug buttons visible for testing
    setTimeout(() => {
      const debugBtn = document.getElementById('debug-state');
      const clearBtn = document.getElementById('clear-tx-id');
      const resetBtn = document.getElementById('reset-workflow');
      if (debugBtn) debugBtn.style.display = 'inline-block';
      if (clearBtn) clearBtn.style.display = 'inline-block';
      if (resetBtn) resetBtn.style.display = 'inline-block';
    }, 1000);
    
    console.log('DOM event listeners set up');
  }

  connectWeb3() {
    console.log('Connecting Web3');
    window.projectPayout.connect().then(
      (rpcUrl) => {
        console.log('Connected with RPC URL:', rpcUrl);
      },
      (error) => {
        console.warn('Failed to connect:', error);
      },
    );
  }

  disconnectWeb3() {
    console.log('Disconnecting Web3');
    window.projectPayout.disconnect().then(
      () => {
        console.log('Disconnected successfully');
      },
      (error) => {
        console.warn('Failed to disconnect:', error);
      },
    );
  }

  refreshProjects() {
    console.log('Refreshing projects list...');
    window.projectPayout.fetchProjectData();
  }

  proposePayout() {
    console.log('Proposing payout...');
    window.projectPayout.proposePayout();
  }

  refreshTransactionStatus() {
    console.log('Refreshing transaction status...');
    window.projectPayout.fetchTransactionData();
  }

  confirmTransaction() {
    console.log('Confirming transaction...');
    window.projectPayout.confirmPayout();
  }

  nextStep() {
    console.log('Moving to next step');
    window.projectPayout.nextStep();
  }

  previousStep() {
    console.log('Moving to previous step');
    window.projectPayout.previousStep();
  }
      nextStep3.addEventListener('click', () => this.nextStep());
    }
    
    // Execution events
    const backStep4 = document.getElementById('back-step-4');
    if (backStep4) {
      backStep4.addEventListener('click', () => this.previousStep());
    }
    
    const refreshExecTxButton = document.getElementById('refresh-exec-tx-button');
    if (refreshExecTxButton) {
      refreshExecTxButton.addEventListener('click', () => this.refreshExecutionStatus());
    }
    
    const executeButton = document.getElementById('execute-button');
    if (executeButton) {
      executeButton.addEventListener('click', () => this.executeTransaction());
    }
    
    const nextStep4 = document.getElementById('next-step-4');
    if (nextStep4) {
      nextStep4.addEventListener('click', () => this.nextStep());
    }
    
    // Completion events
    const backStep5 = document.getElementById('back-step-5');
    if (backStep5) {
      backStep5.addEventListener('click', () => this.previousStep());
    }
    
    const refreshProjectStatus = document.getElementById('refresh-project-status');
    if (refreshProjectStatus) {
      refreshProjectStatus.addEventListener('click', () => this.refreshProjectStatus());
    }
    
    const completeProjectButton = document.getElementById('complete-project-button');
    if (completeProjectButton) {
      completeProjectButton.addEventListener('click', () => this.completeProject());
    }
    
    const finishWorkflow = document.getElementById('finish-workflow');
    if (finishWorkflow) {
      finishWorkflow.addEventListener('click', () => this.finishWorkflow());
    }
  }

  async connectWeb3() {
    try {
      console.log('Connecting to Web3...');
      
      const rpcUrlElement = document.getElementById('rpc-url');
      const chainIdElement = document.getElementById('chain-id');
      const privateKeyElement = document.getElementById('private-key');
      
      const rpcUrl = rpcUrlElement ? rpcUrlElement.value : '';
      const chainId = chainIdElement ? parseInt(chainIdElement.value) : 31337;
      const privateKey = privateKeyElement ? privateKeyElement.value : '';
      
      // Сохраняем настройки подключения в localStorage
      if (rpcUrl) localStorage.setItem('rpcUrl', rpcUrl);
      if (chainId) localStorage.setItem('chainId', chainId.toString());
      if (privateKey) localStorage.setItem('privateKey', privateKey);
      
      // Try browser wallet first (MetaMask)
      if (window.ethereum) {
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
      } else if (rpcUrl && privateKey) {
        // Use custom provider with private key
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
      const connectionStatus = document.getElementById('connection-status');
      if (connectionStatus) {
        connectionStatus.textContent = 'Подключено';
      }
      
      const currentAccount = document.getElementById('current-account');
      if (currentAccount) {
        currentAccount.textContent = this.account || 'Нет аккаунта';
      }
      
      const accountInfo = document.getElementById('account-info');
      if (accountInfo) {
        accountInfo.classList.remove('hidden');
      }
      
      const connectButton = document.getElementById('connect-button');
      if (connectButton) {
        connectButton.classList.add('hidden');
      }
      
      const disconnectButton = document.getElementById('disconnect-button');
      if (disconnectButton) {
        disconnectButton.classList.remove('hidden');
      }
      
      const payoutInterface = document.getElementById('payout-interface');
      if (payoutInterface) {
        payoutInterface.classList.remove('hidden');
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
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
      connectionStatus.textContent = 'Отключено';
    }
    
    const accountInfo = document.getElementById('account-info');
    if (accountInfo) {
      accountInfo.classList.add('hidden');
    }
  }

  // Method to reset the entire workflow (for debugging)
  resetWorkflow() {
    this.currentProject = null;
    this.currentTransactionId = null;
    localStorage.removeItem('currentTransactionId');
    this.workflowStep = 1;
    console.log('Workflow reset');
    this.updateWorkflowStep(1);
    this.showSuccess('Workflow reset completed');
  }

  showError(message) {
    }
    
    const connectButton = document.getElementById('connect-button');
    if (connectButton) {
      connectButton.classList.remove('hidden');
    }
    
    const disconnectButton = document.getElementById('disconnect-button');
    if (disconnectButton) {
      disconnectButton.classList.add('hidden');
    }
    
    const payoutInterface = document.getElementById('payout-interface');
    if (payoutInterface) {
      payoutInterface.classList.add('hidden');
    }
    
    // Reset workflow steps UI
    this.updateWorkflowStep(1);
    
    this.showSuccess('Отключено от Web3. Все данные очищены.');
  }
  
  // Метод для проверки подключения к Web3 и автоматического подключения при необходимости
  async checkWeb3Connection() {
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
  }

  initializeContracts() {
    const multisigAddressElement = document.getElementById('multisig-address');
    const treasuryAddressElement = document.getElementById('treasury-address');
    const projectsAddressElement = document.getElementById('projects-address');
    
    const multisigAddress = multisigAddressElement ? multisigAddressElement.value : '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65';
    const treasuryAddress = treasuryAddressElement ? treasuryAddressElement.value : '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const projectsAddress = projectsAddressElement ? projectsAddressElement.value : '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    
    this.contracts.multisig = new this.web3.eth.Contract(this.abis.multisig, multisigAddress);
    this.contracts.treasury = new this.web3.eth.Contract(this.abis.treasury, treasuryAddress);
    this.contracts.projects = new this.web3.eth.Contract(this.abis.projects, projectsAddress);
  }

  async refreshProjects() {
    try {
      console.log('refreshProjects() method called');
      
      if (!this.web3 || !this.contracts.projects) {
        this.showError('Not connected to Web3');
        return;
      }
      
      // Get all projects and filter for ReadyToPayout status
      const projectsList = document.getElementById('projects-list');
      if (projectsList) {
        console.log('Found projects-list element, updating content');
        projectsList.innerHTML = '<p class="text-muted">Загрузка проектов...</p>';
        
        try {
          // Для демонстрационной версии - получаем список тестовых проектов
          // В реальной реализации мы должны запросить список проектов со статусом ReadyToPayout
          const demoProjects = [
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
          
          // В реальной реализации нужно будет получить проекты из блокчейна
          // Например: const projects = await this.getProjectsWithStatus(4); // 4 = ReadyToPayout
          
          // Если проектов нет
          if (demoProjects.length === 0) {
            projectsList.innerHTML = '<div class="alert alert-info">Нет проектов, готовых к выплате.</div>';
            return;
          }
          
          // Отображаем список проектов
          let projectsHTML = '<h4>Выберите проект для выплаты:</h4><div class="project-list">';
          
          demoProjects.forEach(project => {
            const availableAmount = this.web3.utils.fromWei(
              (BigInt(project.totalAllocated) - BigInt(project.totalPaidOut)).toString(), 
              'ether'
            );
            
            projectsHTML += `
              <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                  <div class="project-title">${project.name}</div>
                  <div class="project-status">
                    <span class="badge badge-info">Готов к выплате</span>
                  </div>
                </div>
                <div class="project-details">
                  <div>${project.description}</div>
                  <div class="project-metrics">
                    <div class="project-metric">Категория: ${project.category}</div>
                    <div class="project-metric">Доступно: ${availableAmount} ETH</div>
                  </div>
                </div>
                <button class="btn btn-primary select-project-btn" data-project-id="${project.id}">Выбрать</button>
              </div>
            `;
          });
          
          projectsHTML += '</div>';
          projectsList.innerHTML = projectsHTML;
          
          console.log('Projects list updated with available projects');
          
          // Прикрепляем обработчики событий к кнопкам выбора проекта
          const selectButtons = document.querySelectorAll('.select-project-btn');
          selectButtons.forEach(button => {
            button.addEventListener('click', (event) => {
              const projectId = event.target.getAttribute('data-project-id');
              console.log(`Project selected: ${projectId}`);
              this.loadProjectById(projectId, demoProjects);
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
      
      // Check if project is ReadyToPayout (status 4)
      if (project.status !== '4') {
        this.showError('Project is not in ReadyToPayout status');
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
    const projectsList = document.getElementById('projects-list');
    if (projectsList) {
      projectsList.innerHTML = `
        <div class="project-card selected">
          <div class="project-header">
            <div class="project-title">${this.currentProject.name}</div>
            <div class="project-status">
              <span class="badge badge-info">${this.currentProject.status}</span>
            </div>
          </div>
          <div class="project-details">
            <div>${this.currentProject.description}</div>
            <div class="project-metrics">
              <div class="project-metric">Target: ${this.currentProject.target}</div>
              <div class="project-metric">Category: ${this.currentProject.category}</div>
              <div class="project-metric">Priority: ${this.currentProject.priority}</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  updateWorkflowStep(step) {
    console.log(`Updating workflow step from ${this.workflowStep} to ${step}`);
    this.workflowStep = step;
    
    // Update step indicators
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
    
    // Show/hide step content
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
    
    // Update step-specific content
    switch (step) {
      case 2:
        console.log('Setting up step 2');
        this.setupStep2();
        break;
      case 3:
        console.log('Setting up step 3');
        this.setupStep3();
        break;
      case 4:
        console.log('Setting up step 4');
        this.setupStep4();
        break;
      case 5:
        console.log('Setting up step 5');
        this.setupStep5();
        break;
      default:
        console.log(`No specific setup for step ${step}`);
    }
  }

  setupStep2() {
    console.log('Setting up step 2, current project:', this.currentProject);
    
    if (!this.currentProject) {
      this.showError('Проект не выбран');
      return;
    }
    
    // Отображаем информацию о проекте
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
        <div><strong>Статус:</strong> <span class="badge badge-info">${this.currentProject.status}</span></div>
      `;
    }
    
    // Заполняем адрес получателя адресом создателя проекта
    const recipientAddress = document.getElementById('recipient-address');
    if (recipientAddress) {
      recipientAddress.value = this.currentProject.creator || '';
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
    const transactionDetails = document.getElementById('transaction-details');
    if (!transactionDetails) {
      console.warn('transaction-details element not found');
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
    const txIdDisplay = document.getElementById('execute-tx-id-display');
    if (txIdDisplay) {
      txIdDisplay.textContent = `#${this.currentTransactionId}`;
      console.log('Execution transaction ID displayed:', this.currentTransactionId);
    } else {
      console.warn('Element execute-tx-id-display not found');
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
        <div><strong>Status:</strong> <span class="badge badge-info">${this.currentProject.status}</span></div>
      `;
    }
  }

  nextStep() {
    if (this.workflowStep < 5) {
      this.updateWorkflowStep(this.workflowStep + 1);
    }
  }

  previousStep() {
    if (this.workflowStep > 1) {
      this.updateWorkflowStep(this.workflowStep - 1);
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
      
      // Extract transaction ID from event logs
      let txProposedEvent = null;
      
      // Try to find the TxProposed event in different possible locations
      if (txReceipt.events && txReceipt.events.TxProposed) {
        txProposedEvent = txReceipt.events.TxProposed;
      } else if (txReceipt.events && Array.isArray(txReceipt.events)) {
        // Look through array of events
        txProposedEvent = txReceipt.events.find(event => event.event === 'TxProposed');
      } else if (txReceipt.logs && Array.isArray(txReceipt.logs)) {
        // Look through logs
        txProposedEvent = txReceipt.logs.find(log => {
          try {
            const decodedLog = this.contracts.multisig.options.jsonInterface.find(j => j.signature === log.topics[0]);
            return decodedLog && decodedLog.name === 'TxProposed';
          } catch (e) {
            return false;
          }
        });
      }
      
      console.log('Found TxProposed event:', txProposedEvent);
      
      this.currentTransactionId = txProposedEvent ? txProposedEvent.returnValues.txId : null;
      
      // If we still don't have a transaction ID, try to get it from the contract
      if (!this.currentTransactionId) {
        console.warn('Transaction ID not found in event logs, trying to get latest transaction ID from contract');
        try {
          // This is a fallback - in a real implementation, you might want to query the contract
          // for the latest transaction ID created by this account
          const transactionCount = await this.contracts.multisig.methods.getTransactionCount().call();
          if (transactionCount > 0) {
            this.currentTransactionId = (parseInt(transactionCount) - 1).toString();
            console.log('Using fallback transaction ID:', this.currentTransactionId);
          }
        } catch (fallbackError) {
          console.error('Fallback method failed:', fallbackError);
        }
      }
      
      // Save transaction ID to localStorage for persistence between page reloads
      if (this.currentTransactionId) {
        localStorage.setItem('currentTransactionId', this.currentTransactionId);
        console.log('Transaction ID saved to localStorage:', this.currentTransactionId);
        this.showSuccess(`Предложение на выплату создано с ID транзакции: ${this.currentTransactionId}`);
      } else {
        console.error('Failed to extract transaction ID from event logs');
        this.showError('Не удалось получить ID транзакции из события. Проверьте консоль для получения дополнительной информации.');
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
      const tx = await this.contracts.multisig.methods.transactions(txId).call();
      console.log('Transaction details for ID', txId, ':', tx);
      
      // If we get here without an error, the transaction ID is valid
      return true;
    } catch (error) {
      console.error('Invalid transaction ID', txId, ':', error.message);
      return false;
    }
  }

  showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML = message;
      errorContainer.style.display = 'block';
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
      console.log('Fetching transaction details from contract...');
      const tx = await this.contracts.multisig.methods.txs(this.currentTransactionId).call();
      console.log('Transaction details received:', tx);
      
      // Get multisig required confirmations
      const required = await this.contracts.multisig.methods.required().call();
      console.log('Required confirmations:', required);
      
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
      
      console.log('Formatted transaction details:', details);
      
      // Display details
      const txDetailsDisplay = document.getElementById('tx-details-display');
      if (txDetailsDisplay) {
        txDetailsDisplay.innerHTML = `
          <div><strong>Status:</strong> <span class="badge ${tx.status === '0' ? 'badge-warning' : tx.status === '1' ? 'badge-success' : 'badge-danger'}">${details.status}</span></div>
          <div><strong>To:</strong> ${details.to}</div>
          <div><strong>Amount:</strong> ${details.value}</div>
          <div><strong>Type:</strong> ${details.type}</div>
          <div><strong>Confirmations:</strong> ${details.confirmations}</div>
          <div><strong>Created:</strong> ${details.createdAt}</div>
          <div><strong>Description:</strong> ${details.description}</div>
        `;
        console.log('Transaction details displayed in UI');
      } else {
        console.warn('Element tx-details-display not found');
      }
      
      // Enable next button if confirmed
      const nextButton = document.getElementById('next-step-3');
      if (nextButton) {
        if (parseInt(tx.confirmations) >= parseInt(required)) {
          nextButton.disabled = false;
          nextButton.classList.add('btn-success');
          console.log('Next button enabled: sufficient confirmations');
        } else {
          nextButton.disabled = true;
          nextButton.classList.remove('btn-success');
          console.log('Next button disabled: insufficient confirmations');
        }
      } else {
        console.warn('Element next-step-3 not found');
      }
      
      // Enable confirm button if not yet confirmed by current user
      const confirmButton = document.getElementById('confirm-button');
      if (confirmButton) {
        // This is a simplified check - in a real implementation, you'd need to check
        // if the current user has already confirmed the transaction
        confirmButton.disabled = tx.status !== '0'; // Disable if not pending
        console.log('Confirm button ' + (confirmButton.disabled ? 'disabled' : 'enabled') + ': transaction status is ' + details.status);
      } else {
        console.warn('Element confirm-button not found');
      }
    } catch (error) {
      console.error('Error refreshing transaction status:', error);
      this.showError('Failed to refresh transaction status: ' + error.message);
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
      this.refreshTransactionStatus();
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
      const tx = await this.contracts.multisig.methods.transactions(this.currentTransactionId).call();
      console.log('Transaction details:', tx);
      
      // Get required confirmations
      const required = await this.contracts.multisig.methods.required().call();
      console.log('Required confirmations:', required);
      
      // Check if current user has confirmed
      let userConfirmed = false;
      if (this.account) {
        userConfirmed = await this.contracts.multisig.methods.confirmations(this.currentTransactionId, this.account).call();
        console.log('User confirmation status:', userConfirmed);
      }
      
      // Format transaction details
      const details = {
        to: tx.to,
        value: this.web3.utils.fromWei(tx.value, 'ether') + ' ETH',
        data: tx.data,
        executed: tx.executed,
        numConfirmations: parseInt(tx.numConfirmations),
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
        if (details.executed) {
          nextButton.disabled = false;
          nextButton.classList.add('btn-success');
        } else {
          nextButton.disabled = true;
          nextButton.classList.remove('btn-success');
        }
      }
      
      // Enable confirm button if not executed and not confirmed by user
      const confirmButton = document.getElementById('confirm-button');
      if (confirmButton) {
        if (!details.executed && !userConfirmed && this.account) {
          confirmButton.disabled = false;
        } else {
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
      const tx = await this.contracts.multisig.methods.txs(this.currentTransactionId).call();
      
      // Get multisig required confirmations
      const required = await this.contracts.multisig.methods.required().call();
      
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
        if (tx.status === '1') { // Executed
          nextButton.disabled = false;
          nextButton.classList.add('btn-success');
        } else {
          nextButton.disabled = true;
          nextButton.classList.remove('btn-success');
        }
      }
      
      // Enable execute button if confirmed but not executed
      const executeButton = document.getElementById('execute-button');
      if (executeButton) {
        if (tx.status === '0' && parseInt(tx.confirmations) >= parseInt(required)) {
          executeButton.disabled = false;
        } else {
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
      await this.contracts.multisig.methods.execute(this.currentTransactionId).send({
        from: this.account,
        gas: 300000, // Установим достаточный лимит газа
        gasPrice: await this.web3.eth.getGasPrice()
      });
      
      this.showSuccess(`Transaction #${this.currentTransactionId} executed successfully`);
      
      // Refresh execution status
      this.refreshExecutionStatus();
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
      const project = await this.contracts.projects.methods.projects(this.currentProject.id).call();
      
      // Format status
      const statusMap = ['Draft', 'Active', 'FundingReady', 'Voting', 'ReadyToPayout', 'Paid', 'Cancelled', 'Archived'];
      const status = statusMap[project.status] || 'Unknown';
      
      // Update current project status
      this.currentProject.status = status;
      
      // Enable finish button if project is Paid
      const finishButton = document.getElementById('finish-workflow');
      if (project.status === '5') { // Paid
        finishButton.disabled = false;
        finishButton.classList.add('btn-success');
      } else {
        finishButton.disabled = true;
        finishButton.classList.remove('btn-success');
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
      await this.contracts.projects.methods.setStatus(this.currentProject.id, 5, reason).send({
        from: this.account,
        gas: 200000, // Установим достаточный лимит газа
        gasPrice: await this.web3.eth.getGasPrice()
      });
      
      this.showSuccess(`Project marked as Paid successfully`);
      
      // Refresh project status
      this.refreshProjectStatus();
    } catch (error) {
      console.error('Project completion error:', error);
      this.showError(`Failed to complete project: ${error.message}`);
    }
  }

  finishWorkflow() {
    this.showSuccess('Project payout workflow completed successfully!');
    this.showModal('Workflow Completed', '<p>The project payout workflow has been completed successfully.</p><p>You can start a new workflow or disconnect from Web3.</p>');
  }

  // Method to manually clear transaction ID from localStorage (for debugging)
  clearTransactionId() {
    this.currentTransactionId = null;
    localStorage.removeItem('currentTransactionId');
    console.log('Transaction ID manually cleared from localStorage');
    this.showSuccess('Transaction ID cleared from localStorage');
  }

  // Method to check current state (for debugging)
  checkState() {
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
      </div>
    `);
  }

  showError(message) {
    console.error(message);
    this.showModal('Error', `<div class="alert alert-danger">${message}</div>`);
  }

  showSuccess(message) {
    console.log(message);
    // For success messages, we'll just show them in the console for now
    // In a production app, you might want to show a toast notification
  }

  showWarning(message) {
    console.warn(message);
    this.showModal('Warning', `<div class="alert alert-warning">${message}</div>`);
  }

  showModal(title, content) {
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
    }
  }

  closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
}

// Initialize the interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.projectPayout = new ProjectPayoutInterface();
});