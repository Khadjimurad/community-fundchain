# FundChain Development Environment Setup

This guide provides comprehensive instructions for setting up the FundChain development environment with demo data and complete workflow examples.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git
- Node.js 18+ (for frontend development)
- Python 3.9+ (for backend development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd community-fundchain
cp .env.example .env  # Configure your environment variables
```

### 2. Start with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 3. Seed Demo Data

```bash
# Seed the database with realistic demo data
docker-compose exec backend python app/seed_demo_data.py
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Manual Setup (Alternative)

### Backend Setup

1. **Create Virtual Environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure Environment**
```bash
# Create .env file in backend directory
cat > .env << EOF
DATABASE_URL=sqlite:///./fundchain.db
WEB3_PROVIDER_URL=http://localhost:8545
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESSES_FILE=../contracts/deployed_contracts.json
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
API_KEY_SECRET=your_secret_key_here
PRIVACY_K_THRESHOLD=5
EOF
```

4. **Initialize Database and Seed Data**
```bash
python app/seed_demo_data.py
```

5. **Start Backend Server**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

1. **Start Local Web Server**
```bash
cd web
python -m http.server 3000
# Or use Node.js serve
npx serve -s . -l 3000
```

### Smart Contracts Setup

1. **Install Foundry** (if not installed)
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Install Dependencies**
```bash
cd contracts
forge install
```

3. **Compile Contracts**
```bash
forge build
```

4. **Run Tests**
```bash
forge test -vv
```

5. **Deploy to Local Network** (optional)
```bash
# Start local Anvil node
anvil

# Deploy contracts (in another terminal)
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

## Demo Data Overview

The seeding script creates realistic demo data including:

### Projects (8 total)
- **Community Health Clinic** (Healthcare, Target: 50 ETH)
- **Digital Learning Center** (Education, Target: 35 ETH)
- **Renewable Energy Grid** (Infrastructure, Target: 80 ETH)
- **Homeless Shelter & Support Services** (Social, Target: 45 ETH)
- **Urban Farming Initiative** (Environment, Target: 25 ETH)
- **Emergency Response System** (Infrastructure, Target: 60 ETH)
- **Youth Arts & Culture Center** (Culture, Target: 30 ETH)
- **Senior Care Facility Renovation** (Healthcare, Target: 55 ETH)

### Community Members (10 total)
- Various SBT weights (3.2 to 20.0 ETH)
- Different roles (major donors, community leaders, regular members)
- Realistic donation histories

### Voting Rounds (3 total)
- **Round 1**: Completed/Finalized
- **Round 2**: Currently in reveal phase
- **Round 3**: Upcoming/Pending

### Financial Data
- 20-80 donations per member
- Realistic allocation patterns
- Payout history for funded projects

## Complete Workflow Examples

### 1. Making a Donation and Allocation

```bash
# Using the API directly
curl -X POST "http://localhost:8000/donations" \
  -H "Content-Type: application/json" \
  -d '{
    "donor_address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    "amount": "5.0",
    "allocations": [
      {"project_id": "demo_project_001_community_health_clinic", "amount": "3.0"},
      {"project_id": "demo_project_002_digital_learning_center", "amount": "2.0"}
    ]
  }'
```

### 2. Checking Project Status

```bash
# Get all projects with current funding status
curl -X GET "http://localhost:8000/projects"

# Get specific project details
curl -X GET "http://localhost:8000/projects/demo_project_001_community_health_clinic"
```

### 3. Viewing Personal Statistics

```bash
# Get user statistics
curl -X GET "http://localhost:8000/me/stats?user_address=0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b"
```

### 4. Participating in Voting

```bash
# Get current voting round info
curl -X GET "http://localhost:8000/votes/current-round"

# Submit commit vote (commit phase)
curl -X POST "http://localhost:8000/votes/2/commit" \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    "commit_hash": "0x1234567890abcdef..."
  }'

# Reveal vote (reveal phase)
curl -X POST "http://localhost:8000/votes/2/reveal" \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    "project_votes": [
      {"project_id": "demo_project_003_renewable_energy_grid", "choice": "for"},
      {"project_id": "demo_project_004_homeless_shelter", "choice": "abstain"}
    ],
    "salt": "my_secret_salt_123"
  }'
```

### 5. Exporting Data

```bash
# Export voting results
curl -X GET "http://localhost:8000/export/voting-results?round_id=1&format=csv" > voting_results.csv

# Export comprehensive report
curl -X GET "http://localhost:8000/export/comprehensive-report?format=json&privacy_level=public" > report.json
```

### 6. Admin Operations

```bash
# Create new project (admin only)
curl -X POST "http://localhost:8000/admin/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Community Project",
    "description": "Description of the new project",
    "category": "infrastructure",
    "target": "40.0",
    "soft_cap": "25.0",
    "hard_cap": "55.0"
  }'

# Mint SBT tokens (admin only)
curl -X POST "http://localhost:8000/admin/sbt/mint" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    "weight": "10.0"
  }'
```

## Testing

### Backend API Tests

```bash
cd backend
pytest tests/ -v
```

### Smart Contract Tests

```bash
cd contracts
forge test -vv
```

### Frontend Testing

1. Open http://localhost:3000 in your browser
2. Use the demo wallet addresses from the seeded data
3. Explore all functionality:
   - View projects and funding status
   - Check personal statistics
   - Participate in voting (if round is active)
   - Use admin functions (if configured)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure SQLite database file has proper permissions
   - Check DATABASE_URL in .env file

2. **Frontend Not Loading**
   - Verify CORS_ORIGINS includes your frontend URL
   - Check if backend server is running on correct port

3. **No Demo Data Visible**
   - Run the seeding script: `python app/seed_demo_data.py`
   - Check database file was created: `ls -la *.db`

4. **Contract Deployment Issues**
   - Ensure Anvil local node is running
   - Verify private key and RPC URL are correct

### Logs and Debugging

```bash
# View backend logs
docker-compose logs -f backend

# View all service logs
docker-compose logs -f

# Check database contents
sqlite3 backend/fundchain.db ".tables"
sqlite3 backend/fundchain.db "SELECT COUNT(*) FROM projects;"
```

### Reset Demo Data

```bash
# Stop services
docker-compose down

# Remove database
rm backend/fundchain.db

# Restart and re-seed
docker-compose up -d
docker-compose exec backend python app/seed_demo_data.py
```

## Development Workflow

### Daily Development

1. **Start Services**
```bash
docker-compose up -d
```

2. **Make Changes**
   - Backend: Edit files in `backend/app/`
   - Frontend: Edit files in `web/`
   - Contracts: Edit files in `contracts/src/`

3. **Test Changes**
```bash
# Backend tests
docker-compose exec backend pytest tests/

# Contract tests
docker-compose exec contracts forge test
```

4. **View Changes**
   - Backend auto-reloads (uvicorn --reload)
   - Frontend: Refresh browser
   - Contracts: Re-deploy if needed

### Adding New Features

1. **Backend**: Add new endpoints in `routes.py`, update models in `models.py`
2. **Frontend**: Add new UI components in `index.html`, add logic in `app.js`
3. **Contracts**: Add new functions, update deployment script
4. **Tests**: Add corresponding tests for all new functionality

## Production Deployment

### Environment Configuration

For production deployment, update environment variables:

```bash
# Backend .env for production
DATABASE_URL=postgresql://user:pass@localhost:5432/fundchain
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/your-project-id
DEBUG=false
CORS_ORIGINS=https://yourdomain.com
API_KEY_SECRET=your-strong-secret-key
PRIVACY_K_THRESHOLD=10
```

### Security Considerations

1. **API Keys**: Use strong, unique API keys
2. **Database**: Use PostgreSQL for production
3. **HTTPS**: Enable SSL/TLS encryption
4. **Rate Limiting**: Implement API rate limiting
5. **Private Keys**: Store private keys securely (e.g., AWS KMS)

## Support

For issues or questions:

1. Check this documentation
2. Review logs for error messages
3. Verify environment configuration
4. Test with demo data to isolate issues

The development environment provides a complete, realistic FundChain ecosystem for testing all functionality including donations, allocations, voting, administration, and reporting features.