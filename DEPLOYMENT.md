# Deployment Guide for Mobipet Australia

## Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI** (optional but helpful):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   
   # Email Configuration
   EMAIL_HOST=smtp.resend.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=resend
   EMAIL_PASSWORD=your_resend_api_key
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM=MobiPet <onboarding@resend.dev>
   
   # App Configuration
   NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # NextAuth (if using)
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Deploy**: Click "Deploy" and wait ~2-3 minutes

### Option 2: Netlify

1. **Build Command**: `npm run build`
2. **Publish Directory**: `.next`
3. **Node Version**: 18.x or higher
4. **Environment Variables**: Same as Vercel above

### Option 3: Railway

1. **Connect GitHub repo**
2. **Set environment variables**
3. **Auto-deploys on push**

## Pre-Deployment Checklist

### ✅ Database Setup
- Ensure Supabase project is live
- Run all migrations: `supabase db push`
- Test database connections

### ✅ Environment Variables
- Copy all variables from your local `.env.local`
- Update URLs to production domains
- Ensure Stripe keys are production keys

### ✅ Domain & SSL
- Vercel provides free SSL
- Custom domain can be added later

### ✅ Testing
- Test booking flow
- Test payment integration
- Test email notifications
- Test vet appointment acceptance/decline

## Post-Deployment

### 1. Update Stripe Webhooks
- Go to Stripe Dashboard → Webhooks
- Add your production URL: `https://your-domain.vercel.app/api/webhooks/stripe`

### 2. Test Critical Features
- [ ] User registration/login
- [ ] Pet profile creation
- [ ] Appointment booking
- [ ] Payment processing
- [ ] Vet notifications
- [ ] Email confirmations

### 3. Monitor Performance
- Check Vercel Analytics
- Monitor Supabase usage
- Watch for errors in logs

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check TypeScript errors
2. **Environment Variables**: Ensure all required vars are set
3. **Database Connection**: Verify Supabase URL/keys
4. **Stripe Issues**: Check webhook endpoints and keys

### Support:
- Vercel: Excellent Next.js support
- Supabase: Great documentation and Discord
- Stripe: Comprehensive docs and support

## Cost Estimates (Monthly)

### Vercel:
- Hobby: $0 (100GB bandwidth, 100GB storage)
- Pro: $20 (1TB bandwidth, 1TB storage)

### Supabase:
- Free: $0 (500MB database, 50MB file storage)
- Pro: $25 (8GB database, 100GB file storage)

### Stripe:
- No monthly fees, only transaction fees
- 2.9% + 30¢ per successful card charge

## Security Notes

1. **Never commit `.env` files**
2. **Use production API keys only**
3. **Enable Supabase Row Level Security**
4. **Set up proper CORS policies**
5. **Regular security updates**

## Stakeholder Access

Once deployed, share the live URL with stakeholders:
- **Demo URL**: `https://your-app.vercel.app`
- **Admin Access**: Create admin accounts for stakeholders
- **Test Data**: Consider adding sample appointments/pets for testing 