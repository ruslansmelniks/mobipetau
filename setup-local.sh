#!/bin/bash

# MobiPet Local Setup Script
# This script automates the local development setup process

set -e  # Exit on any error

echo "🚀 MobiPet Local Setup Script"
echo "=============================="

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

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI is not installed. Installing now..."
        npm install -g supabase
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    
    print_success "All prerequisites are satisfied!"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed successfully!"
}

# Start Supabase
start_supabase() {
    print_status "Starting local Supabase instance..."
    
    # Stop any existing Supabase instance
    supabase stop &> /dev/null || true
    
    # Start Supabase
    supabase start
    
    print_success "Supabase started successfully!"
}

# Apply database schema
apply_schema() {
    print_status "Applying database schema..."
    supabase db reset
    print_success "Database schema applied successfully!"
}

# Create environment file
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        # Create .env.local from .env.example if it exists
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            print_success "Created .env.local from .env.example"
        else
            # Create a basic .env.local
            cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_here

# Database URL
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# JWT Secret
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Other configurations
NODE_ENV=development
EOF
            print_success "Created basic .env.local file"
        fi
    else
        print_warning ".env.local already exists. Please update it with your local Supabase credentials."
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    echo "Next steps:"
    echo "1. Update .env.local with your local Supabase credentials"
    echo "2. Start the development server: npm run dev"
    echo "3. Open http://localhost:3000 in your browser"
    echo "4. Create a test account and verify everything works"
    echo ""
    echo "Useful URLs:"
    echo "- App: http://localhost:3000"
    echo "- Supabase Dashboard: http://localhost:54323"
    echo ""
    echo "To stop Supabase: supabase stop"
    echo "To restart everything: supabase db reset"
}

# Main setup function
main() {
    echo "Starting MobiPet local setup..."
    echo ""
    
    check_prerequisites
    install_dependencies
    start_supabase
    apply_schema
    setup_environment
    show_next_steps
}

# Run the setup
main "$@" 