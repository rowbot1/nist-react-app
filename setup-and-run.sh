#!/bin/bash

set -e  # Exit on any error

echo "🚀 Setting up NIST Control Mapper React Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version 18 or higher is recommended. You have version $(node -v)"
fi

echo "✅ Node.js $(node -v) and npm $(npm -v) are available"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup server
echo "🔧 Setting up server..."
cd server

# Create logs directory
mkdir -p logs

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "🌱 Seeding database with sample data..."
npm run seed

echo "✅ Server setup complete"

# Setup client
cd ../client
echo "🎨 Setting up client..."

# Install client dependencies
echo "📦 Installing client dependencies..."
npm install

echo "✅ Client setup complete"

# Return to root
cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  npm run dev          - Start both client and server in development mode"
echo "  npm run client:dev   - Start only the client (React)"
echo "  npm run server:dev   - Start only the server (Node.js/Express)"
echo "  npm run build        - Build for production"
echo "  npm start            - Start production server"
echo ""
echo "🔐 Demo login credentials:"
echo "  Email: demo@nistmapper.com"
echo "  Password: demo123"
echo ""
echo "🌐 Starting the application..."
echo "   Client will be available at: http://localhost:3000"
echo "   Server will be available at: http://localhost:3001"
echo ""

# Start the application
npm run dev