#!/bin/bash

# Script to run the 10-participant test from inside the backend container
echo "Running 10-participant test from inside the backend container..."

# Run the test
docker-compose exec backend python3 /app/scripts/test_10_participants.py

# Show the test report
echo "Showing the latest test report:"
docker-compose exec backend ls -t test_report_10_participants_*.txt | head -n 1 | xargs docker-compose exec backend cat