#!/bin/bash

echo "🔧 Testing contract compilation..."

# Test if we can access the forge command in the container
echo "Testing forge access..."
docker-compose run --rm contracts forge --version 2>/dev/null || echo "Forge access failed"

echo "Testing forge build..."
docker-compose run --rm contracts forge build 2>/dev/null || echo "Build failed"

echo "Testing deployment script..."
docker-compose run --rm contracts sh -c "forge script script/Deploy.s.sol --rpc-url http://anvil:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast" 2>/dev/null || echo "Deployment failed"

echo "✅ Contract testing completed"