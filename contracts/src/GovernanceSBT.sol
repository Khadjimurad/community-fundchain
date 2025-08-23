// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract GovernanceSBT {
    address public admin;
    mapping(address => bool) public hasToken;
    mapping(address => uint256) public weight;

    event Minted(address indexed to, uint256 weight);
    event Burned(address indexed from);
    event WeightUpdated(address indexed who, uint256 weight);

    constructor() { admin = msg.sender; }

    function mint(address to, uint256 w) external {
        require(msg.sender == admin, "only admin");
        require(!hasToken[to], "already has");
        hasToken[to] = true;
        weight[to] = w;
        emit Minted(to, w);
    }

    function setWeight(address who, uint256 w) external {
        require(msg.sender == admin, "only admin");
        require(hasToken[who], "no token");
        weight[who] = w;
        emit WeightUpdated(who, w);
    }

    function burn(address from) external {
        require(msg.sender == admin, "only admin");
        hasToken[from] = false;
        weight[from] = 0;
        emit Burned(from);
    }

    function weightOf(address who) external view returns (uint256) {
        if (!hasToken[who]) return 0;
        return weight[who];
    }
}
