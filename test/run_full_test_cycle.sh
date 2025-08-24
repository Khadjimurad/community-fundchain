#!/bin/bash
# Full Test Cycle Runner for FundChain
# Запускает полный цикл тестирования: пополнение баланса → заполнение данных → голосование

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="community-fundchain-backend-1"
TEST_DIR="/app/test"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 FundChain Full Test Cycle Runner${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Function to check if container is running
check_container() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${RED}❌ Container $CONTAINER_NAME is not running!${NC}"
        echo -e "${YELLOW}💡 Start the container with: docker-compose up -d backend${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Container $CONTAINER_NAME is running${NC}"
}

# Function to wait for container to be ready
wait_for_container() {
    echo -e "${BLUE}⏳ Waiting for container to be ready...${NC}"
    
    # Wait for container to be fully started
    echo -e "${BLUE}⏳ Waiting 30 seconds for backend service to be ready...${NC}"
    sleep 30
    
    echo -e "${GREEN}✅ Container should be ready now${NC}"
    return 0
}

# Function to copy test files to container
copy_test_files() {
    echo -e "${BLUE}📋 Copying test files to container...${NC}"
    
    # Create test directory if it doesn't exist
    docker exec $CONTAINER_NAME mkdir -p $TEST_DIR
    
    # Copy all test files one by one with error handling
    local test_files=("00_fund_accounts.py" "01_seed_real_data.py" "02_voting_cycle.py")
    
    for file in "${test_files[@]}"; do
        if [ -f "test/$file" ]; then
            echo -e "${BLUE}📄 Copying $file...${NC}"
            if docker cp "test/$file" "$CONTAINER_NAME:$TEST_DIR/"; then
                echo -e "${GREEN}✅ $file copied successfully${NC}"
            else
                echo -e "${RED}❌ Failed to copy $file${NC}"
                return 1
            fi
        else
            echo -e "${RED}❌ Test file $file not found${NC}"
            return 1
        fi
    done
    
    echo -e "${GREEN}✅ All test files copied to container${NC}"
}

# Function to run test with logging
run_test() {
    local test_name=$1
    local test_file=$2
    local phase_number=$3
    
    echo ""
    echo -e "${BLUE}🔄 Phase $phase_number: Running $test_name...${NC}"
    echo -e "${BLUE}===============================================${NC}"
    
    # Run test and capture output
    local output_file="test/${test_name}_output_${TIMESTAMP}.log"
    
    if docker exec -it $CONTAINER_NAME python $TEST_DIR/$test_file 2>&1 | tee "$output_file"; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        echo -e "${BLUE}📄 Output saved to: $output_file${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        echo -e "${BLUE}📄 Check output in: $output_file${NC}"
        return 1
    fi
}

# Function to show progress
show_progress() {
    local current=$1
    local total=$2
    local phase_name=$3
    
    echo ""
    echo -e "${BLUE}📊 Progress: Phase $current of $total - $phase_name${NC}"
    echo -e "${BLUE}===============================================${NC}"
}

# Function to show final summary
show_final_summary() {
    echo ""
    echo -e "${GREEN}🎉 Full Test Cycle Completed!${NC}"
    echo -e "${GREEN}==============================${NC}"
    echo ""
    echo -e "${BLUE}✅ What was completed:${NC}"
    echo "   💰 Phase 1: Account funding (100 ETH per account)"
    echo "   👥 Phase 2: Data seeding (10 members, 10 projects)"
    echo "   🗳️ Phase 3: Voting cycle with smart contracts"
    echo ""
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo "   1. Check voting results in the frontend"
    echo "   2. Use project-payout.html for payout testing"
    echo "   3. Review test logs in test/ directory"
    echo ""
    echo -e "${YELLOW}📁 Test outputs saved with timestamp: ${TIMESTAMP}${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting FundChain Full Test Cycle...${NC}"
    echo ""
    
    # Check container status
    check_container
    
    # Wait for container to be ready
    wait_for_container
    
    # Copy test files
    copy_test_files
    
    echo ""
    echo -e "${GREEN}✅ Preparation completed, starting test phases...${NC}"
    echo ""
    
    # Phase 1: Fund accounts
    show_progress 1 3 "Funding Anvil Accounts"
    if ! run_test "fund_accounts" "00_fund_accounts.py" 1; then
        echo -e "${RED}❌ Phase 1 failed, stopping test cycle${NC}"
        exit 1
    fi
    
    # Phase 2: Seed data
    show_progress 2 3 "Seeding Test Data"
    if ! run_test "seed_data" "01_seed_real_data.py" 2; then
        echo -e "${RED}❌ Phase 2 failed, stopping test cycle${NC}"
        exit 1
    fi
    
    # Phase 3: Voting cycle
    show_progress 3 3 "Running Voting Cycle"
    if ! run_test "voting_cycle" "02_voting_cycle.py" 3; then
        echo -e "${RED}❌ Phase 3 failed, test cycle incomplete${NC}"
        echo -e "${YELLOW}⚠️ Check the logs to see what went wrong${NC}"
        exit 1
    fi
    
    # Show final summary
    show_final_summary
}

# Error handling
trap 'echo -e "\n${RED}❌ Script interrupted by user${NC}"; exit 1' INT
trap 'echo -e "\n${RED}❌ Script failed with error${NC}"; exit 1' ERR

# Run main function
main "$@"
