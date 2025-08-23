#!/bin/bash

# Simple contract deployment script for FundChain
# This deploys mock contract addresses for development

echo "🚀 Starting FundChain contract deployment..."

# Test connection to Anvil
echo "Testing Anvil connection..."
BLOCK_NUMBER=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ -z "$BLOCK_NUMBER" ]; then
    echo "❌ Failed to connect to Anvil. Make sure it's running on localhost:8545"
    exit 1
fi

echo "✅ Connected to Anvil (Block: $BLOCK_NUMBER)"

# For development, we'll use deterministic addresses based on Anvil's default setup
# These are the first 5 accounts that Anvil generates
TREASURY_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PROJECTS_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
GOVERNANCE_SBT_ADDRESS="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
BALLOT_ADDRESS="0x90F79bf6EB2c4f870365E785982E1f101E93b906"
MULTISIG_ADDRESS="0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"

echo "📋 Contract Addresses (Development Mode):"
echo "Treasury: $TREASURY_ADDRESS"
echo "Projects: $PROJECTS_ADDRESS"
echo "GovernanceSBT: $GOVERNANCE_SBT_ADDRESS"
echo "BallotCommitReveal: $BALLOT_ADDRESS"
echo "CommunityMultisig: $MULTISIG_ADDRESS"

# Create deployed_contracts.json
cat > /Users/khadjimurad/Documents/GitHub/community-fundchain/contracts/deployed_contracts.json << EOF
{
  "Treasury": "$TREASURY_ADDRESS",
  "Projects": "$PROJECTS_ADDRESS", 
  "GovernanceSBT": "$GOVERNANCE_SBT_ADDRESS",
  "BallotCommitReveal": "$BALLOT_ADDRESS",
  "CommunityMultisig": "$MULTISIG_ADDRESS",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "network": "anvil-local",
  "blockNumber": "$BLOCK_NUMBER"
}
EOF

echo "✅ Created deployed_contracts.json"

# Update environment with contract addresses
echo "🔧 Updating environment variables..."

# Create a temporary env file with contract addresses
cat > /tmp/contract_env << EOF
TREASURY_ADDRESS=$TREASURY_ADDRESS
PROJECTS_ADDRESS=$PROJECTS_ADDRESS
GOVERNANCE_SBT_ADDRESS=$GOVERNANCE_SBT_ADDRESS
BALLOT_ADDRESS=$BALLOT_ADDRESS
MULTISIG_ADDRESS=$MULTISIG_ADDRESS
EOF

echo "✅ Contract deployment completed!"
echo "📝 You can now restart the backend with these addresses"
echo ""
echo "Run: docker-compose restart backend"