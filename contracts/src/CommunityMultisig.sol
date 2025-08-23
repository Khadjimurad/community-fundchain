// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract CommunityMultisig {
    address[] public owners;
    uint256 public required;

    struct Tx {
        address payable to;
        uint256 value;
        bool executed;
        uint256 confirmations;
        mapping(address => bool) confirmedBy;
    }

    uint256 public txCount;
    mapping(uint256 => Tx) public txs;

    event OwnerAdded(address owner);
    event TxProposed(uint256 indexed txId, address to, uint256 value);
    event TxConfirmed(uint256 indexed txId, address owner);
    event TxExecuted(uint256 indexed txId);

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "owners required");
        require(_required > 0 && _required <= _owners.length, "bad required");
        owners = _owners;
        required = _required;
        for (uint i = 0; i < _owners.length; i++) { emit OwnerAdded(_owners[i]); }
    }

    modifier onlyOwner() {
        bool isOwner = false;
        for (uint i = 0; i < owners.length; i++) {
            if (msg.sender == owners[i]) { isOwner = true; break; }
        }
        require(isOwner, "not owner");
        _;
    }

    function propose(address payable to, uint256 value) external onlyOwner returns (uint256) {
        txCount += 1;
        Tx storage t = txs[txCount];
        t.to = to;
        t.value = value;
        emit TxProposed(txCount, to, value);
        return txCount;
    }

    function confirm(uint256 txId) external onlyOwner {
        Tx storage t = txs[txId];
        require(!t.executed, "already executed");
        require(!t.confirmedBy[msg.sender], "already confirmed");
        t.confirmedBy[msg.sender] = true;
        t.confirmations += 1;
        emit TxConfirmed(txId, msg.sender);
    }

    function execute(uint256 txId) external onlyOwner {
        Tx storage t = txs[txId];
        require(!t.executed, "already executed");
        require(t.confirmations >= required, "not enough confirmations");
        t.executed = true;
        (bool ok, ) = t.to.call{value: t.value}("");
        require(ok, "transfer failed");
        emit TxExecuted(txId);
    }

    receive() external payable {}
}
