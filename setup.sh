#!/bin/bash

# FundChain Development Environment Setup Script
# This script automates the setup process for local development

set -e

echo "🚀 FundChain Development Environment Setup"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if required tools are available
check_requirements() {
    print_status "Checking requirements..."
    
    # Check for git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git and try again."
        exit 1
    fi
    
    # Check for curl
    if ! command -v curl &> /dev/null; then
        print_warning "curl is not installed. Some features may not work properly."
    fi
    
    print_success "Requirements check completed"
}

# Setup environment configuration
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from template"
    else
        print_warning ".env file already exists, skipping..."
    fi
}

# Build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Stop any existing containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Build and start services
    docker-compose up --build -d
    
    print_success "Services started successfully"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Function to wait with timeout (cross-platform)
    wait_with_timeout() {
        local timeout=$1
        local command="$2"
        local counter=0
        
        while [ $counter -lt $timeout ]; do
            if eval "$command" &>/dev/null; then
                return 0
            fi
            sleep 1
            counter=$((counter + 1))
        done
        return 1
    }
    
    # Wait for Anvil (blockchain) - but continue if it takes too long
    print_status "Waiting for Anvil blockchain..."
    if wait_with_timeout 30 "curl -s http://localhost:8545"; then
        print_success "Anvil is ready"
    else
        print_warning "Anvil seems to be taking longer to start, but continuing setup..."
        # Give it a bit more time
        sleep 5
    fi
    
    # Wait for backend
    print_status "Waiting for backend API..."
    if ! wait_with_timeout 60 "curl -s http://localhost:8000/health"; then
        print_warning "Backend health check failed, but continuing..."
    fi
    
    print_success "Setup continuing with available services"
}

# Deploy contracts
deploy_contracts() {
    print_status "Deploying smart contracts..."
    
    # Deploy contracts using the contracts service
    docker-compose run --rm contracts sh -c "
        sleep 5 &&
        forge script script/Deploy.s.sol --rpc-url http://anvil:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
    " || {
        print_warning "Contract deployment failed, continuing with setup..."
    }
    
    print_success "Contract deployment completed"
}

# Seed demo data
seed_demo_data() {
    print_status "Seeding demo data..."
    
    docker-compose exec -T backend python app/seed_demo_data.py || {
        print_warning "Demo data seeding failed, you can run it manually later"
        return
    }
    
    print_success "Demo data seeded successfully"
}

# Run tests
run_tests() {
    if [ "$1" = "--skip-tests" ]; then
        print_warning "Skipping tests as requested"
        return
    fi
    
    print_status "Running tests to verify setup..."
    
    # Run backend tests
    print_status "Running backend tests..."
    docker-compose exec -T backend pytest tests/ -v --tb=short || {
        print_warning "Some backend tests failed, but setup continues..."
    }
    
    # Run contract tests
    print_status "Running contract tests..."
    docker-compose exec -T contracts forge test -vv || {
        print_warning "Some contract tests failed, but setup continues..."
    }
    
    print_success "Tests completed"
}

# Display information
show_info() {
    echo ""
    echo "🎉 FundChain Development Environment is Ready!"
    echo "=============================================="
    echo ""
    echo "📊 Access Points:"
    echo "  Frontend:        http://localhost:3000"
    echo "  Backend API:     http://localhost:8000"
    echo "  API Docs:        http://localhost:8000/docs"
    echo "  Blockchain RPC:  http://localhost:8545"
    echo ""
    echo "📋 Quick Commands:"
    echo "  View logs:       docker-compose logs -f"
    echo "  Stop services:   docker-compose down"
    echo "  Restart:         docker-compose restart"
    echo "  Seed more data:  docker-compose exec backend python app/seed_demo_data.py"
    echo ""
    echo "🔧 Development:"
    echo "  - Edit files in backend/app/ for API changes"
    echo "  - Edit files in web/ for frontend changes"
    echo "  - Edit files in contracts/src/ for smart contract changes"
    echo "  - Run 'docker-compose restart backend' after backend changes"
    echo ""
    echo "📚 Documentation:"
    echo "  - See DEVELOPMENT.md for detailed guide"
    echo "  - See README.md for project overview"
    echo ""
    echo "🧪 Demo Data Includes:"
    echo "  - 8 sample projects across different categories"
    echo "  - 10 community members with SBT tokens"
    echo "  - Realistic donation and allocation history"
    echo "  - 3 voting rounds (past, current, future)"
    echo "  - Complete financial transaction history"
    echo ""
    echo "Happy coding! 🚀"
}

# Main execution
main() {
    echo "Starting setup process..."
    echo ""
    
    # Parse command line arguments
    SKIP_TESTS=false
    FORCE_REBUILD=false
    
    for arg in "$@"; do
        case $arg in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force-rebuild)
                FORCE_REBUILD=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-tests      Skip running tests after setup"
                echo "  --force-rebuild   Force rebuild of all containers"
                echo "  --help           Show this help message"
                exit 0
                ;;
        esac
    done
    
    # Run setup steps
    check_requirements
    check_docker
    setup_environment
    
    if [ "$FORCE_REBUILD" = true ]; then
        print_status "Force rebuilding all containers..."
        docker-compose down --volumes --remove-orphans
        docker-compose build --no-cache
    fi
    
    start_services
    wait_for_services
    deploy_contracts
    seed_demo_data
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    show_info
}

# Trap to ensure cleanup on script exit
trap 'print_error "Setup interrupted. You may need to run \"docker-compose down\" to clean up."' INT TERM

# Run main function with all arguments
main "$@"