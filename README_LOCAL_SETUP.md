# 🚀 MobiPet Local Setup - Quick Start

## For Stakeholders & Developers

This guide will get MobiPet running locally on your machine in under 10 minutes.

## ⚡ Quick Setup (Recommended)

### Option 1: Automated Setup (Easiest)

1. **Run the setup script:**
   ```bash
   ./setup-local.sh
   ```

2. **Update your environment file** with the credentials shown in the output:
   ```bash
   # Edit .env.local and replace the placeholder values with your actual credentials
   nano .env.local
   ```

3. **Start the app:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - App: http://localhost:3000
   - Database Dashboard: http://localhost:54323

### Option 2: Manual Setup

If the automated script doesn't work, follow the detailed guide in `LOCAL_SETUP_GUIDE.md`.

## 🔧 What You Need

- **Node.js** (v18+) - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** (usually pre-installed)

## 📋 What Gets Set Up

✅ **Local Database** - PostgreSQL with Supabase  
✅ **Complete Schema** - All tables for the vet booking app  
✅ **Authentication** - User signup/login system  
✅ **Development Server** - Next.js app running locally  
✅ **Database Dashboard** - Web interface to view/edit data  

## 🧪 Testing Your Setup

1. **Create an account** at http://localhost:3000
2. **Add a test pet** in the pets section
3. **Create a test appointment** in the booking section
4. **Check the database** at http://localhost:54323

## 🛠️ Common Commands

```bash
# Start the app
npm run dev

# Stop Supabase
supabase stop

# Restart database
supabase db reset

# View logs
supabase logs
```

## 🆘 Troubleshooting

**Supabase won't start?**
```bash
supabase stop
docker system prune -a
supabase start
```

**App won't connect to database?**
```bash
supabase db reset
npm run dev
```

**Environment variables not working?**
- Make sure `.env.local` exists and has the correct credentials
- Restart the development server after changing environment variables

## 📞 Need Help?

1. Check the detailed guide: `LOCAL_SETUP_GUIDE.md`
2. Look at the troubleshooting section
3. Check the logs: `supabase logs`

## 🎯 What You Can Do Now

- ✅ Create and manage user accounts
- ✅ Add pets and appointments
- ✅ Test all booking features
- ✅ View and edit database data
- ✅ Develop new features
- ✅ Test the complete application flow

---

**Happy testing! 🐕🐱** 