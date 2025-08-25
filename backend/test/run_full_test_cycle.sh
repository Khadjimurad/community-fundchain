#!/bin/bash
# Full Test Cycle Runner for FundChain
# Запускает полный цикл тестирования: заполнение данных → голосование → блокчейн-проверки

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
    local test_files=("01_seed_real_data.py" "02_voting_cycle.py" "04_blockchain_only.py")
    
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
    echo -e "${GREEN}🎯 Progress: $current/$total phases completed${NC}"
    echo -e "${BLUE}📊 Current phase: $phase_name${NC}"
    echo ""
}

# Function to show final summary
show_summary() {
    echo ""
    echo -e "${BLUE}🎉 FULL TEST CYCLE COMPLETED!${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
    echo -e "${GREEN}✅ What was accomplished:${NC}"
    echo "   1. 🌱 Real data seeded with Anvil addresses"
    echo "   2. 🗳️ Complete on-chain voting cycle executed"
    echo "   3. 🔗 Blockchain-only checks completed"
    echo ""
    echo -e "${GREEN}🚀 Next steps:${NC}"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Check the dashboard for updated data"
    echo "   3. Verify contracts and voting state in the UI"
    echo ""
    echo -e "${BLUE}📁 Test reports saved in: test/ directory${NC}"
    echo -e "${BLUE}📊 Check individual test outputs for detailed results${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}🔍 Checking system status...${NC}"
    check_container
    
    echo -e "${BLUE}⏳ Waiting for container to be ready...${NC}"
    if ! wait_for_container; then
        echo -e "${RED}❌ Container is not ready. Exiting.${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}📁 Preparing test environment...${NC}"
    copy_test_files
    
    echo ""
    echo -e "${BLUE}🚀 Starting full test cycle...${NC}"
    echo -e "${BLUE}===============================${NC}"
    
    local phase=1
    local total_phases=3
    local all_tests_passed=true
    
    # Phase 1: Seed real data
    show_progress $phase $total_phases "Data Seeding"
    if ! run_test "01_seed_real_data" "01_seed_real_data.py" $phase; then
        all_tests_passed=false
    fi
    ((phase++))
    
    # Phase 2: Voting cycle
    show_progress $phase $total_phases "Voting Cycle"
    if ! run_test "02_voting_cycle" "02_voting_cycle.py" $phase; then
        all_tests_passed=false
    fi
    ((phase++))
    
    # Phase 3: Blockchain-only checks
    show_progress $phase $total_phases "Blockchain-only Checks"
    if ! run_test "04_blockchain_only" "04_blockchain_only.py" $phase; then
        all_tests_passed=false
    fi
    
    # Final summary
    if $all_tests_passed; then
        show_summary
        echo -e "${GREEN}🎯 All tests passed! System is ready for production use.${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}⚠️ Some tests failed. Check the logs above for details.${NC}"
        echo -e "${YELLOW}💡 You may need to fix issues before proceeding.${NC}"
        exit 1
    fi
}

# Error handling
trap 'echo -e "\n${RED}❌ Script interrupted by user${NC}"; exit 1' INT
trap 'echo -e "\n${RED}❌ Script failed with error${NC}"; exit 1' ERR

# Run main function
main "$@"
