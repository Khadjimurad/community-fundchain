// SPDX-License-Identifier: MIT
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract GovernanceSBT {
    address public admin;
    
    // Weight calculation modes
    enum WeightMode { Manual, Linear, Quadratic, Logarithmic }
    WeightMode public weightMode = WeightMode.Linear;
    
    // Member data
    mapping(address => bool) public hasToken;
    mapping(address => uint256) public manualWeight;
    mapping(address => uint256) public totalDonated;
    mapping(address => uint256) public memberSince;
    
    // Configuration
    uint256 public weightCap = 100; // Maximum weight any member can have
    uint256 public baseDonationUnit = 1 ether; // Base unit for weight calculation
    uint256 public minimumDonation = 0.1 ether; // Minimum donation to get SBT
    bool public autoWeightUpdates = true;
    
    // Statistics
    uint256 public totalMembers;
    address[] public memberAddresses;
    mapping(address => uint256) public memberIndex;
    
    event Minted(address indexed to, uint256 weight, uint256 totalDonated);
    event Burned(address indexed from);
    event WeightUpdated(address indexed who, uint256 oldWeight, uint256 newWeight, uint256 totalDonated);
    event WeightModeChanged(WeightMode oldMode, WeightMode newMode);
    event ConfigurationUpdated(uint256 weightCap, uint256 baseDonationUnit, uint256 minimumDonation);
    event AutoWeightToggled(bool enabled);
    
    constructor() { 
        admin = msg.sender; 
    }

    function mint(address to, uint256 donationAmount) external {
        require(msg.sender == admin, "only admin");
        require(!hasToken[to], "already has token");
        require(donationAmount >= minimumDonation, "donation too low");
        
        hasToken[to] = true;
        totalDonated[to] = donationAmount;
        memberSince[to] = block.timestamp;
        
        // Add to member list
        memberIndex[to] = memberAddresses.length;
        memberAddresses.push(to);
        totalMembers++;
        
        uint256 calculatedWeight = _calculateWeight(donationAmount);
        
        emit Minted(to, calculatedWeight, donationAmount);
    }

    function updateWeight(address who, uint256 newTotalDonated) external {
        require(msg.sender == admin, "only admin");
        require(hasToken[who], "no token");
        
        uint256 oldWeight = weightOf(who);
        totalDonated[who] = newTotalDonated;
        uint256 newWeight = _calculateWeight(newTotalDonated);
        
        emit WeightUpdated(who, oldWeight, newWeight, newTotalDonated);
    }

    function setManualWeight(address who, uint256 w) external {
        require(msg.sender == admin, "only admin");
        require(hasToken[who], "no token");
        require(w <= weightCap, "weight exceeds cap");
        
        uint256 oldWeight = weightOf(who);
        manualWeight[who] = w;
        
        emit WeightUpdated(who, oldWeight, w, totalDonated[who]);
    }

    function burn(address from) external {
        require(msg.sender == admin, "only admin");
        require(hasToken[from], "no token to burn");
        
        hasToken[from] = false;
        manualWeight[from] = 0;
        totalDonated[from] = 0;
        memberSince[from] = 0;
        
        // Remove from member list
        uint256 index = memberIndex[from];
        address lastMember = memberAddresses[memberAddresses.length - 1];
        
        memberAddresses[index] = lastMember;
        memberIndex[lastMember] = index;
        memberAddresses.pop();
        
        delete memberIndex[from];
        totalMembers--;
        
        emit Burned(from);
    }
    
    function weightOf(address who) external view returns (uint256) {
        if (!hasToken[who]) return 0;
        
        if (weightMode == WeightMode.Manual || manualWeight[who] > 0) {
            return manualWeight[who];
        }
        
        return _calculateWeight(totalDonated[who]);
    }
    
    // Internal weight calculation
    function _calculateWeight(uint256 donationAmount) internal view returns (uint256) {
        if (donationAmount == 0) return 0;
        
        uint256 baseWeight;
        
        if (weightMode == WeightMode.Linear) {
            baseWeight = donationAmount / baseDonationUnit;
        } else if (weightMode == WeightMode.Quadratic) {
            // Square root for quadratic voting
            baseWeight = _sqrt(donationAmount / baseDonationUnit);
        } else if (weightMode == WeightMode.Logarithmic) {
            // Logarithmic scaling
            baseWeight = _log2(donationAmount / baseDonationUnit + 1);
        } else {
            return 1; // Manual mode default
        }
        
        // Apply cap
        return baseWeight > weightCap ? weightCap : baseWeight;
    }
    
    // Math utilities
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    function _log2(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 result = 0;
        while (x > 1) {
            x >>= 1;
            result++;
        }
        return result;
    }
    
    // Configuration functions
    function setWeightMode(WeightMode newMode) external {
        require(msg.sender == admin, "only admin");
        WeightMode oldMode = weightMode;
        weightMode = newMode;
        emit WeightModeChanged(oldMode, newMode);
    }
    
    function setConfiguration(
        uint256 newWeightCap,
        uint256 newBaseDonationUnit,
        uint256 newMinimumDonation
    ) external {
        require(msg.sender == admin, "only admin");
        require(newWeightCap > 0, "weight cap must be > 0");
        require(newBaseDonationUnit > 0, "base unit must be > 0");
        
        weightCap = newWeightCap;
        baseDonationUnit = newBaseDonationUnit;
        minimumDonation = newMinimumDonation;
        
        emit ConfigurationUpdated(newWeightCap, newBaseDonationUnit, newMinimumDonation);
    }
    
    function setAutoWeightUpdates(bool enabled) external {
        require(msg.sender == admin, "only admin");
        autoWeightUpdates = enabled;
        emit AutoWeightToggled(enabled);
    }
    
    // View functions
    function totalActiveMembers() external view returns (uint256) {
        return totalMembers;
    }
    
    function getMemberInfo(address member) external view returns (
        bool hasTokenInfo,
        uint256 weight,
        uint256 totalDonatedAmount,
        uint256 memberSinceTimestamp,
        uint256 manualWeightOverride
    ) {
        return (
            hasToken[member],
            this.weightOf(member),
            totalDonated[member],
            memberSince[member],
            manualWeight[member]
        );
    }
    
    function getAllMembers() external view returns (address[] memory) {
        return memberAddresses;
    }
    
    function getMembersPaginated(uint256 offset, uint256 limit) external view returns (
        address[] memory members,
        uint256[] memory weights,
        uint256[] memory donations
    ) {
        uint256 end = offset + limit;
        if (end > memberAddresses.length) {
            end = memberAddresses.length;
        }
        
        uint256 length = end > offset ? end - offset : 0;
        members = new address[](length);
        weights = new uint256[](length);
        donations = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            address member = memberAddresses[offset + i];
            members[i] = member;
            weights[i] = this.weightOf(member);
            donations[i] = totalDonated[member];
        }
    }
    
    function getWeightDistribution() external view returns (
        uint256[] memory weightBuckets,
        uint256[] memory memberCounts
    ) {
        // Returns distribution of weights in buckets [1, 2-5, 6-10, 11-25, 26-50, 51+]
        weightBuckets = new uint256[](6);
        memberCounts = new uint256[](6);
        
        weightBuckets[0] = 1;
        weightBuckets[1] = 5;
        weightBuckets[2] = 10;
        weightBuckets[3] = 25;
        weightBuckets[4] = 50;
        weightBuckets[5] = type(uint256).max;
        
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            uint256 weight = this.weightOf(memberAddresses[i]);
            
            if (weight == 1) memberCounts[0]++;
            else if (weight <= 5) memberCounts[1]++;
            else if (weight <= 10) memberCounts[2]++;
            else if (weight <= 25) memberCounts[3]++;
            else if (weight <= 50) memberCounts[4]++;
            else memberCounts[5]++;
        }
    }
}
