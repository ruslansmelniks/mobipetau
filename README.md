# MobiPet Australia

A modern, multi-step pet appointment booking and payment web app for pet owners and veterinarians.

## 🚀 Project Overview
MobiPet Australia is a full-stack web application that allows pet owners to:
- Register and manage their profile
- Add and manage pets
- Book appointments with mobile veterinarians
- Make secure payments via Stripe
- View and manage bookings

Veterinarians can manage their availability and appointments via a dedicated portal.

---

## ✨ Features
- Multi-step booking flow
- User authentication (Supabase Auth)
- Profile and pet management
- Stripe payment integration
- Role-based portals (pet owner & vet)
- Secure data with Supabase Row Level Security (RLS)
- Responsive, modern UI (Next.js, Tailwind CSS)

---

## 🛠️ Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Payments:** Stripe
- **State Management:** React hooks, Supabase helpers

---

## 🏗️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ruslansmelniks/mobipetau.git
cd mobipetau
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure environment variables
Create a `.env.local` file in the root directory with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

> Get your Supabase keys from your [Supabase project dashboard](https://app.supabase.com/).
> Get your Stripe keys from your [Stripe dashboard](https://dashboard.stripe.com/).

### 4. Run the app locally
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

---

## 📝 Deployment
- Deploy to [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/) for best results.
- Set all environment variables in your deployment dashboard.
- Ensure Supabase RLS policies and triggers are set up as described in `/docs` (if present).

---

## 🤝 Contributing
1. Fork the repo
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your branch and open a Pull Request

---

## 📄 License
MIT

---

**Questions?**
Open an issue or contact [ruslans@milinex.digital](mailto:ruslans@milinex.digital) 
