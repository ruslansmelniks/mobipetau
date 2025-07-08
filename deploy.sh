#!/bin/bash

echo "🚀 Mobipet Australia - Deployment Script"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Make sure to set environment variables in your deployment platform."
else
    echo "✅ .env.local found"
fi

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build the project
echo "🏗️  Building the project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "1. Push your code to GitHub"
    echo "2. Go to https://vercel.com"
    echo "3. Import your repository"
    echo "4. Set environment variables (see DEPLOYMENT.md)"
    echo "5. Deploy!"
    echo ""
    echo "📖 For detailed instructions, see DEPLOYMENT.md"
else
    echo "❌ Build failed. Please fix the errors above before deploying."
    exit 1
fi 