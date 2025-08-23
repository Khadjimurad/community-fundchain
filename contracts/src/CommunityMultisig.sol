// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract CommunityMultisig {
    address[] public owners;
    uint256 public required;
    
    enum TxType { GeneralPayout, ProjectPayout, ConfigChange, OwnershipChange }
    enum TxStatus { Pending, Executed, Cancelled }
    
    struct Tx {
        uint256 id;
        address payable to;
        uint256 value;
        bytes data;
        TxType txType;
        TxStatus status;
        uint256 confirmations;
        uint256 createdAt;
        uint256 executedAt;
        bytes32 projectId; // For project payouts
        string description;
        address proposer;
        mapping(address => bool) confirmedBy;
        mapping(address => uint256) confirmationTime;
    }
    
    uint256 public txCount;
    mapping(uint256 => Tx) public txs;
    mapping(address => bool) public isOwner;
    
    // Project payout tracking
    mapping(bytes32 => uint256[]) public projectPayouts;
    mapping(bytes32 => uint256) public totalPaidToProject;
    
    // Configuration
    uint256 public proposalExpiry = 30 days;
    bool public requireAllOwnersForOwnershipChanges = true;
    
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequiredChanged(uint256 oldRequired, uint256 newRequired);
    
    event TxProposed(
        uint256 indexed txId, 
        address indexed proposer,
        address indexed to, 
        uint256 value, 
        TxType txType,
        bytes32 projectId,
        string description
    );
    event TxConfirmed(uint256 indexed txId, address indexed owner, uint256 confirmationTime);
    event TxRevoked(uint256 indexed txId, address indexed owner);
    event TxExecuted(uint256 indexed txId, address indexed executor);
    event TxCancelled(uint256 indexed txId, string reason);
    
    event ProjectPayoutCompleted(bytes32 indexed projectId, uint256 amount, address to, uint256 txId);
    
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "owners required");
        require(_required > 0 && _required <= _owners.length, "invalid required count");
        
        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "duplicate owner");
            
            owners.push(owner);
            isOwner[owner] = true;
            emit OwnerAdded(owner);
        }
        
        required = _required;
    }

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }
    
    modifier txExists(uint256 txId) {
        require(txId < txCount, "transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 txId) {
        require(txs[txId].status == TxStatus.Pending, "transaction not pending");
        _;
    }
    
    modifier notExpired(uint256 txId) {
        require(block.timestamp <= txs[txId].createdAt + proposalExpiry, "transaction expired");
        _;
    }

    // General transaction proposal
    function propose(
        address payable to, 
        uint256 value, 
        bytes calldata data,
        string calldata description
    ) external onlyOwner returns (uint256) {
        return _propose(to, value, data, TxType.GeneralPayout, bytes32(0), description);
    }
    
    // Project-specific payout proposal
    function proposeProjectPayout(
        address payable to,
        uint256 value,
        bytes32 projectId,
        string calldata description
    ) external onlyOwner returns (uint256) {
        require(projectId != bytes32(0), "invalid project ID");
        return _propose(to, value, "", TxType.ProjectPayout, projectId, description);
    }
    
    // Owner management proposals
    function proposeAddOwner(
        address newOwner,
        string calldata description
    ) external onlyOwner returns (uint256) {
        require(newOwner != address(0), "invalid owner");
        require(!isOwner[newOwner], "already owner");
        
        bytes memory data = abi.encodeWithSignature("addOwner(address)", newOwner);
        return _propose(payable(address(this)), 0, data, TxType.OwnershipChange, bytes32(0), description);
    }
    
    function proposeRemoveOwner(
        address ownerToRemove,
        string calldata description
    ) external onlyOwner returns (uint256) {
        require(isOwner[ownerToRemove], "not an owner");
        require(owners.length > 1, "cannot remove last owner");
        
        bytes memory data = abi.encodeWithSignature("removeOwner(address)", ownerToRemove);
        return _propose(payable(address(this)), 0, data, TxType.OwnershipChange, bytes32(0), description);
    }
    
    function proposeChangeRequired(
        uint256 newRequired,
        string calldata description
    ) external onlyOwner returns (uint256) {
        require(newRequired > 0 && newRequired <= owners.length, "invalid required count");
        
        bytes memory data = abi.encodeWithSignature("changeRequired(uint256)", newRequired);
        return _propose(payable(address(this)), 0, data, TxType.ConfigChange, bytes32(0), description);
    }

    function _propose(
        address payable to,
        uint256 value,
        bytes memory data,
        TxType txType,
        bytes32 projectId,
        string memory description
    ) internal returns (uint256) {
        txCount++;
        
        Tx storage t = txs[txCount];
        t.id = txCount;
        t.to = to;
        t.value = value;
        t.data = data;
        t.txType = txType;
        t.status = TxStatus.Pending;
        t.createdAt = block.timestamp;
        t.projectId = projectId;
        t.description = description;
        t.proposer = msg.sender;
        
        emit TxProposed(txCount, msg.sender, to, value, txType, projectId, description);
        return txCount;
    }

    function confirm(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) notExpired(txId) {
        Tx storage t = txs[txId];
        require(!t.confirmedBy[msg.sender], "already confirmed");
        
        t.confirmedBy[msg.sender] = true;
        t.confirmationTime[msg.sender] = block.timestamp;
        t.confirmations++;
        
        emit TxConfirmed(txId, msg.sender, block.timestamp);
    }
    
    function revoke(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) {
        Tx storage t = txs[txId];
        require(t.confirmedBy[msg.sender], "not confirmed");
        
        t.confirmedBy[msg.sender] = false;
        t.confirmationTime[msg.sender] = 0;
        t.confirmations--;
        
        emit TxRevoked(txId, msg.sender);
    }

    function execute(uint256 txId) external onlyOwner txExists(txId) notExecuted(txId) {
        Tx storage t = txs[txId];
        
        // Check required confirmations based on transaction type
        uint256 requiredConfirmations = required;
        if (t.txType == TxType.OwnershipChange && requireAllOwnersForOwnershipChanges) {
            requiredConfirmations = owners.length;
        }
        
        require(t.confirmations >= requiredConfirmations, "insufficient confirmations");
        
        t.status = TxStatus.Executed;
        t.executedAt = block.timestamp;
        
        // Execute the transaction
        bool success;
        if (t.data.length > 0) {
            // Contract call
            (success, ) = t.to.call{value: t.value}(t.data);
        } else {
            // Simple transfer
            (success, ) = t.to.call{value: t.value}("");
        }
        
        require(success, "transaction execution failed");
        
        // Track project payouts
        if (t.txType == TxType.ProjectPayout) {
            projectPayouts[t.projectId].push(txId);
            totalPaidToProject[t.projectId] += t.value;
            emit ProjectPayoutCompleted(t.projectId, t.value, t.to, txId);
        }
        
        emit TxExecuted(txId, msg.sender);
    }
    
    function cancel(uint256 txId, string calldata reason) external onlyOwner txExists(txId) notExecuted(txId) {
        Tx storage t = txs[txId];
        t.status = TxStatus.Cancelled;
        emit TxCancelled(txId, reason);
    }
}
