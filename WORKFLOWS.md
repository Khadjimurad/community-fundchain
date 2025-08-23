# FundChain Workflow Examples

This document provides step-by-step examples for all major workflows in the FundChain system, using the demo data for realistic scenarios.

## Prerequisites

Ensure the development environment is running:

```bash
# If not already set up
./setup.sh

# Or start manually
docker-compose up -d
```

## 1. Donation and Allocation Workflow

### Scenario: Community Member Making a Donation

**Goal**: Alice wants to donate 5 ETH and split it between healthcare and education projects.

#### Step 1: View Available Projects

```bash
# Get all active projects
curl -X GET "http://localhost:8000/projects?status=active" | jq '.[].name'

# Get projects by category
curl -X GET "http://localhost:8000/projects/category/healthcare" | jq
```

#### Step 2: Make a Donation with Allocation

```bash
# Alice donates 5 ETH, allocating to specific projects
curl -X POST "http://localhost:8000/donations" \
  -H "Content-Type: application/json" \
  -d '{
    "donor_address": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    "amount": "5.0",
    "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "allocations": [
      {
        "project_id": "demo_project_001_community_health_clinic",
        "amount": "3.0"
      },
      {
        "project_id": "demo_project_002_digital_learning_center",
        "amount": "2.0"
      }
    ]
  }'
```

#### Step 3: Verify Donation and Check Project Progress

```bash
# Check the donation was recorded
curl -X GET "http://localhost:8000/donations?donor_address=0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b"

# Check project funding progress
curl -X GET "http://localhost:8000/projects/demo_project_001_community_health_clinic/progress"
```

#### Step 4: View Personal Statistics

```bash
# Alice checks her personal stats
curl -X GET "http://localhost:8000/me/stats?user_address=0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b"
```

## 2. Voting Participation Workflow

### Scenario: Participating in Priority Voting

**Goal**: Bob wants to participate in the current voting round to prioritize projects.

#### Step 1: Check Current Voting Round

```bash
# Get current voting round information
curl -X GET "http://localhost:8000/votes/current-round" | jq
```

#### Step 2: Commit Phase - Submit Vote Commitment

```bash
# Bob commits his votes (during commit phase)
curl -X POST "http://localhost:8000/votes/2/commit" \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
    "commit_hash": "0x1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrst"
  }'
```

#### Step 3: Reveal Phase - Reveal Vote Choices

```bash
# Bob reveals his votes (during reveal phase)
curl -X POST "http://localhost:8000/votes/2/reveal" \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
    "project_votes": [
      {
        "project_id": "demo_project_003_renewable_energy_grid",
        "choice": "for"
      },
      {
        "project_id": "demo_project_004_homeless_shelter_support_services",
        "choice": "for"
      },
      {
        "project_id": "demo_project_005_urban_farming_initiative",
        "choice": "abstain"
      },
      {
        "project_id": "demo_project_006_emergency_response_system",
        "choice": "against"
      }
    ],
    "salt": "my_secret_salt_bob_123"
  }'
```

#### Step 4: Check Voting Results

```bash
# Check Bob's voting status
curl -X GET "http://localhost:8000/votes/2/status?user_address=0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c"

# View overall voting results for the round
curl -X GET "http://localhost:8000/votes/priority/summary?round_id=2"
```

## 3. Project Management Workflow (Admin)

### Scenario: Administrator Managing Projects

**Goal**: Admin wants to create a new project and manage existing ones.

#### Step 1: Create a New Project

```bash
# Admin creates a new community project
curl -X POST "http://localhost:8000/admin/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Community WiFi Network",
    "description": "Free high-speed internet access points throughout the community to bridge the digital divide and support remote work and education.",
    "category": "infrastructure",
    "target": "30.0",
    "soft_cap": "18.0",
    "hard_cap": "45.0",
    "deadline": "2024-12-31T23:59:59Z",
    "is_flexible": true
  }'
```

#### Step 2: Update Project Status

```bash
# Update project status
curl -X PUT "http://localhost:8000/admin/projects/demo_project_001_community_health_clinic" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "funded",
    "notes": "Project has reached funding target and is ready for implementation"
  }'
```

#### Step 3: Mint SBT Tokens for New Members

```bash
# Mint SBT tokens for a new community member
curl -X POST "http://localhost:8000/admin/sbt/mint" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xnewmemberaddress1234567890123456789012345678",
    "weight": "5.0",
    "reason": "New active community member"
  }'
```

#### Step 4: Start a New Voting Round

```bash
# Admin starts a new voting round
curl -X POST "http://localhost:8000/admin/voting/start-round" \
  -H "Content-Type: application/json" \
  -d '{
    "project_ids": [
      "demo_project_007_youth_arts_culture_center",
      "demo_project_008_senior_care_facility_renovation",
      "community_wifi_network"
    ],
    "commit_duration_days": 7,
    "reveal_duration_days": 3,
    "counting_method": "weighted",
    "auto_cancellation": true,
    "cancellation_threshold": 60.0
  }'
```

## 4. Data Export and Reporting Workflow

### Scenario: Generating Reports for Transparency

**Goal**: Generate comprehensive reports for public transparency and internal analysis.

#### Step 1: Export Voting Results

```bash
# Export voting results as CSV
curl -X GET "http://localhost:8000/export/voting-results?round_id=1&format=csv&privacy_level=public" \
  -o voting_results_round1.csv

# Export as JSON for analysis
curl -X GET "http://localhost:8000/export/voting-results?round_id=1&format=json&privacy_level=public" \
  -o voting_results_round1.json
```

#### Step 2: Generate Comprehensive Financial Report

```bash
# Export comprehensive report with privacy protection
curl -X GET "http://localhost:8000/export/comprehensive-report?format=json&privacy_level=public&include_personal=false" \
  -o public_financial_report.json

# Export detailed report for internal use
curl -X GET "http://localhost:8000/export/comprehensive-report?format=csv&privacy_level=admin&include_personal=true" \
  -o internal_comprehensive_report.csv
```

#### Step 3: Generate Analytics Reports

```bash
# Project analytics
curl -X GET "http://localhost:8000/reports/project-analytics?period=last_90_days" | jq

# Voting analytics
curl -X GET "http://localhost:8000/reports/voting-analytics?include_turnout=true" | jq

# Treasury analytics
curl -X GET "http://localhost:8000/reports/treasury-analytics?breakdown_by_category=true" | jq
```

## 5. Allocation Management Workflow

### Scenario: Reallocating Funds Between Projects

**Goal**: Carol wants to move some of her allocation from a completed project to a new priority.

#### Step 1: Check Current Allocations

```bash
# Carol checks her current allocations
curl -X GET "http://localhost:8000/allocations?donor_address=0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"
```

#### Step 2: Reassign Allocation

```bash
# Reassign 2 ETH from completed health clinic to emergency response
curl -X POST "http://localhost:8000/allocations/reassign" \
  -H "Content-Type: application/json" \
  -d '{
    "donor_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "from_project_id": "demo_project_001_community_health_clinic",
    "to_project_id": "demo_project_006_emergency_response_system",
    "amount": "2.0",
    "reason": "Health clinic completed, prioritizing emergency response"
  }'
```

#### Step 3: Top Up Project with New Donation

```bash
# Carol makes additional donation directly to emergency response
curl -X POST "http://localhost:8000/donations/topup" \
  -H "Content-Type: application/json" \
  -d '{
    "donor_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "project_id": "demo_project_006_emergency_response_system",
    "amount": "3.0",
    "transaction_hash": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
  }'
```

## 6. Monitoring and Analytics Workflow

### Scenario: Community Health Check

**Goal**: Monitor the overall health and activity of the community fund.

#### Step 1: Check Treasury Status

```bash
# Get overall treasury statistics
curl -X GET "http://localhost:8000/treasury/stats" | jq
```

#### Step 2: Monitor Project Progress

```bash
# Get progress for all active projects
for project in $(curl -s "http://localhost:8000/projects?status=active" | jq -r '.[].id'); do
  echo "Project: $project"
  curl -s "http://localhost:8000/projects/$project/progress" | jq '.funding_percentage'
done
```

#### Step 3: Check Voting Participation

```bash
# Check participation in recent voting rounds
curl -X GET "http://localhost:8000/votes/rounds/2" | jq '.turnout_percentage'

# Get detailed voting breakdown
curl -X GET "http://localhost:8000/votes/priority/summary?round_id=2" | jq '.[] | {project_id, for_weight, against_weight, turnout_percentage}'
```

#### Step 4: Generate Community Activity Report

```bash
# Get community activity metrics
curl -X GET "http://localhost:8000/reports/community-activity" | jq '{
  total_members: .total_members,
  active_members_30d: .active_members_30d,
  average_donation: .average_donation,
  projects_funded_this_month: .projects_funded_this_month
}'
```

## 7. Privacy-Protected Data Access

### Scenario: Accessing Data with Privacy Protection

**Goal**: Researchers want to analyze community funding patterns while protecting individual privacy.

#### Step 1: Request Public Dataset

```bash
# Get aggregated donation data with k-anonymity protection
curl -X GET "http://localhost:8000/export/donations-aggregate?k_threshold=5&privacy_level=public" \
  -o public_donations_aggregate.json
```

#### Step 2: Analyze Category Funding Patterns

```bash
# Get category-wise funding with privacy protection
curl -X GET "http://localhost:8000/analytics/category-trends?privacy_level=public&min_group_size=5" | jq
```

#### Step 3: Export Anonymous Voting Patterns

```bash
# Get voting patterns without personal identifiers
curl -X GET "http://localhost:8000/export/voting-patterns?anonymize=true&min_voters=5" \
  -o anonymous_voting_patterns.csv
```

## 8. Frontend Workflows

### Using the Web Interface

#### Step 1: Access the Dashboard

1. Open http://localhost:3000 in your browser
2. Enter a demo wallet address (e.g., `0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b`)
3. Click "Load Personal Stats"

#### Step 2: Explore Projects

1. Navigate to the "Projects" section
2. Filter by category or status
3. Click "Support" to simulate a donation
4. Click "Details" to see project information

#### Step 3: Participate in Voting

1. Go to the "Voting" section
2. Check the current voting round status
3. If in commit phase, submit vote commitments
4. If in reveal phase, reveal your votes
5. View real-time voting results

#### Step 4: Admin Functions (if enabled)

1. Access the "Admin" section
2. Create new projects using the modal forms
3. Mint SBT tokens for community members
4. Export reports and data
5. Monitor system health

## 9. Testing and Validation Workflows

### Scenario: Validating System Functionality

#### Step 1: Run Backend Tests

```bash
# Run all backend tests
docker-compose exec backend pytest tests/ -v

# Run specific test categories
docker-compose exec backend pytest tests/test_privacy.py -v
docker-compose exec backend pytest tests/test_api.py::TestProjectsAPI -v
```

#### Step 2: Run Smart Contract Tests

```bash
# Run all contract tests
docker-compose exec contracts forge test -vv

# Run specific contract tests
docker-compose exec contracts forge test --match-contract TreasuryTest -vv
docker-compose exec contracts forge test --match-test testCommitReveal -vv
```

#### Step 3: Integration Testing

```bash
# Test full workflow: donation -> allocation -> voting
./scripts/integration_test.sh

# Test privacy protection
curl -X GET "http://localhost:8000/export/comprehensive-report?format=json&privacy_level=public" | \
  jq '.donations | length'  # Should respect k-anonymity
```

## 10. Troubleshooting Workflows

### Common Issues and Solutions

#### Issue: Services Not Starting

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs anvil

# Restart services
docker-compose restart
```

#### Issue: Database Issues

```bash
# Reset database and reseed
docker-compose down
rm backend/fundchain.db
docker-compose up -d
docker-compose exec backend python app/seed_demo_data.py
```

#### Issue: Contract Deployment Failed

```bash
# Redeploy contracts
docker-compose run --rm contracts forge script script/Deploy.s.sol \
  --rpc-url http://anvil:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

## Summary

These workflows demonstrate the complete functionality of the FundChain system:

1. **Financial Operations**: Donations, allocations, reassignments
2. **Governance**: Commit-reveal voting, priority setting
3. **Administration**: Project management, SBT minting, system configuration
4. **Transparency**: Data export, reporting, analytics
5. **Privacy**: K-anonymity protection, data sanitization
6. **Monitoring**: Health checks, activity tracking

Each workflow includes realistic examples using the demo data, making it easy to understand and test the system's capabilities.

For additional examples and advanced use cases, see the DEVELOPMENT.md documentation.