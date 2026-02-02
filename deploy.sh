#!/bin/bash
# CRM Production Deployment Script
# Run this script on your EC2 server

set -e  # Exit on error

echo "🚀 CRM Production Deployment Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running in CRM directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the CRM directory."
    exit 1
fi

print_info "Starting deployment process..."
echo ""

# Step 1: Pull latest code
print_info "Step 1/7: Pulling latest code from GitHub..."
if git pull origin main; then
    print_success "Code pulled successfully"
else
    print_error "Failed to pull code. Check your git configuration."
    exit 1
fi
echo ""

# Step 2: Check Docker services
print_info "Step 2/7: Checking Docker services..."
if docker-compose ps | grep -q "Up"; then
    print_success "Docker services are running"
else
    print_warning "Docker services not running. Starting them..."
    docker-compose up -d
    sleep 10
fi
echo ""

# Step 3: Apply database migrations
print_info "Step 3/7: Applying database migrations..."

# Migration 1: Customer sector
print_info "  → Applying customer sector migration..."
if [ -f "database/add_customer_sector.sql" ]; then
    if docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_sector.sql 2>&1 | grep -q "ERROR"; then
        print_warning "  Some errors in sector migration (might be already applied)"
    else
        print_success "  Customer sector migration applied"
    fi
else
    print_warning "  Customer sector migration file not found (skipping)"
fi

# Migration 2: Customer additional fields
print_info "  → Applying customer fields migration..."
if [ -f "database/add_customer_fields_v2.sql" ]; then
    if docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_fields_v2.sql 2>&1 | grep -q "ERROR"; then
        print_warning "  Some errors in fields migration (might be already applied)"
    else
        print_success "  Customer fields migration applied"
    fi
else
    print_warning "  Customer fields migration file not found (skipping)"
fi

# Migration 3: Opportunity workflow
print_info "  → Applying opportunity workflow migration..."
if [ -f "database/add_opportunity_workflow.sql" ]; then
    if docker-compose exec -T database psql -U crm_user -d crm_database < database/add_opportunity_workflow.sql 2>&1 | grep -q "ERROR"; then
        print_warning "  Some errors in workflow migration (might be already applied)"
    else
        print_success "  Opportunity workflow migration applied"
    fi
else
    print_warning "  Opportunity workflow migration file not found (skipping)"
fi
echo ""

# Step 4: Restart backend
print_info "Step 4/7: Restarting backend service..."
docker-compose restart backend
sleep 10
print_success "Backend restarted"
echo ""

# Step 5: Restart frontend
print_info "Step 5/7: Restarting frontend service..."
docker-compose restart frontend
sleep 10
print_success "Frontend restarted"
echo ""

# Step 6: Verify services
print_info "Step 6/7: Verifying services..."

# Check database
if docker-compose exec database psql -U crm_user -d crm_database -c "SELECT 1" > /dev/null 2>&1; then
    print_success "  Database: Connected"
else
    print_error "  Database: Connection failed"
fi

# Check backend
if curl -s http://localhost:5000/health | grep -q "OK"; then
    print_success "  Backend: Running"
else
    print_error "  Backend: Not responding"
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    print_success "  Frontend: Running"
else
    print_error "  Frontend: Not responding"
fi
echo ""

# Step 7: Display summary
print_info "Step 7/7: Deployment Summary"
echo ""
echo "======================================"
echo "Deployment Status:"
echo "======================================"

# Get container status
docker-compose ps

echo ""
echo "======================================"
echo "Access Points:"
echo "======================================"
echo "Frontend: http://$(hostname -I | awk '{print $1}'):5173"
echo "Backend:  http://$(hostname -I | awk '{print $1}'):5000"
echo ""
print_success "Deployment completed!"
echo ""
print_info "Next steps:"
echo "  1. Open frontend URL in your browser"
echo "  2. Login with your credentials"
echo "  3. Test new features"
echo "  4. Check logs if any issues: docker-compose logs -f"
echo ""
print_warning "Important: Update your security settings!"
echo "  - Change default passwords"
echo "  - Configure firewall"
echo "  - Setup SSL if using a domain"
echo ""
