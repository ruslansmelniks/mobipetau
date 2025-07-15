# MobiPet Local Development Setup Guide

## 🚀 Quick Start for Local Development

This guide will help you set up MobiPet locally with Supabase for development and testing.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Supabase CLI** (for local development)

## 🔧 Step 1: Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Using yarn
yarn global add supabase

# Using Homebrew (macOS)
brew install supabase/tap/supabase
```

## 🗄️ Step 2: Set Up Local Supabase

### 2.1 Initialize Supabase (if not already done)
```bash
# Navigate to your project directory
cd "mobipet australia"

# Initialize Supabase (if not already initialized)
supabase init
```

### 2.2 Start Local Supabase
```bash
# Start the local Supabase instance
supabase start
```

This will:
- Start a local PostgreSQL database
- Start the Supabase API
- Start the Supabase Dashboard
- Provide you with local credentials

**Note:** The first time you run this, it may take a few minutes to download the Docker images.

### 2.3 Get Your Local Credentials

After starting Supabase, you'll see output like this:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these credentials!** You'll need them for the next steps.

## 🗃️ Step 3: Apply Database Schema

### 3.1 Apply the Complete Schema Migration

```bash
# Apply the complete MobiPet schema
supabase db reset
```

This will:
- Drop all existing tables
- Apply all migrations in the `supabase/migrations/` folder
- Set up the complete database schema

### 3.2 Verify Schema Application

You can verify the schema was applied correctly by:

1. **Check the Supabase Dashboard:**
   - Open http://localhost:54323
   - Go to the "Table Editor" section
   - You should see all the tables listed

2. **Or check via SQL:**
   ```bash
   supabase db diff --schema public
   ```

## 🔑 Step 4: Set Up Environment Variables

### 4.1 Create Local Environment File

Create a `.env.local` file in your project root:

```bash
# Copy the example environment file
cp .env.example .env.local
```

### 4.2 Update Environment Variables

Edit `.env.local` with your local Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_here

# Database URL (for direct database access if needed)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# JWT Secret (from supabase start output)
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Other configurations
NODE_ENV=development
```

## 🚀 Step 5: Install Dependencies and Start the App

### 5.1 Install Dependencies
```bash
# Install Node.js dependencies
npm install
# or
yarn install
```

### 5.2 Start the Development Server
```bash
# Start the Next.js development server
npm run dev
# or
yarn dev
```

Your MobiPet application should now be running at `http://localhost:3000`

## 🧪 Step 6: Test the Setup

### 6.1 Create a Test User

1. Go to http://localhost:3000
2. Click "Sign Up" or "Login"
3. Create a test account
4. Verify you can access the dashboard

### 6.2 Test Database Operations

1. **Add a Pet:**
   - Go to the pets section
   - Add a test pet
   - Verify it appears in the database

2. **Create an Appointment:**
   - Go to the booking section
   - Create a test appointment
   - Verify it appears in the database

### 6.3 Check Database Tables

Visit the Supabase Dashboard at http://localhost:54323 and verify these tables exist:

**Core Tables:**
- `users` - User accounts
- `pets` - Pet information
- `appointments` - Booking records
- `notifications` - System notifications

**Supporting Tables:**
- `pet_types` - Pet categories
- `pet_breeds` - Pet breeds
- `vet_specializations` - Vet expertise areas
- `vet_services` - Vet services
- `reviews` - Customer reviews
- `payment_methods` - Payment information

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Supabase Won't Start
```bash
# Stop any existing containers
supabase stop

# Remove old containers
docker system prune -a

# Start fresh
supabase start
```

#### 2. Database Connection Issues
```bash
# Reset the database
supabase db reset

# Or restart Supabase completely
supabase stop
supabase start
```

#### 3. Migration Errors
```bash
# Check migration status
supabase migration list

# Reset and reapply migrations
supabase db reset
```

#### 4. Environment Variables Not Loading
- Ensure `.env.local` is in the project root
- Restart the development server after changing environment variables
- Check that the file is not gitignored

#### 5. Port Conflicts
If you get port conflicts, you can specify different ports:
```bash
supabase start --port 54321
```

## 📊 Database Schema Overview

The complete schema includes:

### **User Management**
- `users` - Main user accounts
- `user_profiles` - Extended user information

### **Pet Management**
- `pet_types` - Pet categories (Dog, Cat, etc.)
- `pet_breeds` - Specific breeds
- `pets` - Individual pet records

### **Vet Management**
- `vet_specializations` - Vet expertise areas
- `vet_services` - Services offered
- `vet_availability` - Vet scheduling

### **Booking System**
- `appointments` - Main booking table
- `declined_jobs` - Track rejected appointments

### **Reviews & Payments**
- `reviews` - Customer reviews
- `payment_methods` - Payment information

### **Communication**
- `conversations` - Chat conversations
- `messages` - Individual messages
- `notifications` - System notifications

## 🛠️ Development Workflow

### Making Database Changes

1. **Create a new migration:**
   ```bash
   supabase migration new your_migration_name
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Apply the migration:**
   ```bash
   supabase db reset
   ```

### Viewing Database

- **Supabase Dashboard:** http://localhost:54323
- **Direct SQL:** Use the SQL editor in the dashboard
- **Table Editor:** View and edit data directly

### Stopping Local Supabase

```bash
# Stop Supabase services
supabase stop

# To completely remove local data
supabase stop --no-backup
```

## 📞 Support

If you encounter issues:

1. **Check the logs:**
   ```bash
   supabase logs
   ```

2. **Restart everything:**
   ```bash
   supabase stop
   supabase start
   npm run dev
   ```

3. **Reset everything:**
   ```bash
   supabase db reset
   ```

## 🎉 You're Ready!

Your local MobiPet development environment is now set up and ready for development and testing. You can:

- ✅ Create and manage users
- ✅ Add pets and appointments
- ✅ Test all application features
- ✅ Make database changes
- ✅ Develop new features

Happy coding! 🚀 