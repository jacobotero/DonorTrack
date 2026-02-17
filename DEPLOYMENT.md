# DonorTrack Deployment Guide

This guide covers deploying DonorTrack to production.

## Production Architecture

```
Internet
    ↓
  HTTPS (SSL)
    ↓
Frontend (Vercel/Netlify)
    ↓
Backend API (Railway/Render)
    ↓
PostgreSQL Database (Neon/Supabase)
```

## Prerequisites

- Domain name (optional but recommended)
- GitHub account for deployment
- Email service for SMTP (Gmail, SendGrid, etc.)

## Option 1: Railway + Vercel (Recommended)

### Backend Deployment (Railway)

1. **Prepare the Project**
   - Ensure all code is committed to GitHub
   - Create `Procfile` if needed (Railway auto-detects Node.js)

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Select "Deploy from GitHub repo"
   - Choose your DonorTrack repository
   - Select the `backend` folder as root path

3. **Add PostgreSQL**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will auto-provision and connect it
   - Copy the `DATABASE_URL` from variables

4. **Configure Environment Variables**
   ```env
   DATABASE_URL=<from Railway PostgreSQL>
   JWT_SECRET=<generate-strong-32-char-secret>
   JWT_EXPIRES_IN=7d
   PORT=3000
   NODE_ENV=production
   FRONTEND_URL=https://your-domain.com

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password
   SMTP_FROM=noreply@yourorganization.com
   SMTP_FROM_NAME="Your Organization Name"
   ```

5. **Run Database Migrations**
   - In Railway dashboard, go to your backend service
   - Click "Settings" → "Deploy"
   - Add build command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Or run manually via Railway CLI:
     ```bash
     railway run npx prisma migrate deploy
     ```

6. **Deploy**
   - Railway auto-deploys on git push
   - Get your backend URL: `https://your-app.railway.app`

### Frontend Deployment (Vercel)

1. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Framework Preset: Vite

2. **Configure Environment Variables**
   ```env
   VITE_API_URL=https://your-backend.railway.app
   ```

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Get your URL: `https://your-app.vercel.app`

5. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

## Option 2: Render (All-in-One)

### Backend + Database

1. **Create PostgreSQL Database**
   - Go to Render Dashboard
   - Click "New" → "PostgreSQL"
   - Choose plan (free tier available)
   - Note the Internal/External Database URL

2. **Create Backend Service**
   - Click "New" → "Web Service"
   - Connect GitHub repository
   - Configure:
     - Name: donortrack-api
     - Root Directory: backend
     - Environment: Node
     - Build Command: `npm install && npx prisma generate`
     - Start Command: `npm start`

3. **Environment Variables**
   - Add all variables from above
   - Use the Render PostgreSQL URL for `DATABASE_URL`

4. **Run Migrations**
   - In Render shell (or locally with connection string):
     ```bash
     npx prisma migrate deploy
     ```

### Frontend

1. **Create Static Site**
   - Click "New" → "Static Site"
   - Connect GitHub repository
   - Configure:
     - Name: donortrack-app
     - Root Directory: frontend
     - Build Command: `npm install && npm run build`
     - Publish Directory: dist

2. **Environment Variables**
   ```env
   VITE_API_URL=https://donortrack-api.onrender.com
   ```

## Security Configuration

### SSL/HTTPS
- **Railway/Render/Vercel**: SSL is automatic
- **Custom Domain**: Configure SSL certificate (Let's Encrypt)

### CORS
The backend is configured to accept requests from your frontend URL:
```typescript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
})
```

### Rate Limiting
Already configured:
- Auth endpoints: 5 requests/15 minutes
- General API: 100 requests/15 minutes

### Database Security
- Always use SSL for database connections in production
- Restrict database access by IP if possible
- Use strong passwords
- Enable automatic backups

## Email Configuration

### Gmail
1. Enable 2-Factor Authentication
2. Generate App-Specific Password
3. Use in SMTP_PASS

### SendGrid (Recommended for Production)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Configure:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=<your-sendgrid-api-key>
   ```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
```

## Database Backups

### Railway
- Automatic backups included
- Manual backup:
  ```bash
  railway run pg_dump $DATABASE_URL > backup.sql
  ```

### Render
- Automatic daily backups on paid plans
- Manual backup:
  ```bash
  pg_dump <DATABASE_URL> > backup.sql
  ```

### Scheduled Backups (Recommended)
```bash
# Cron job (daily at 2 AM)
0 2 * * * pg_dump $DATABASE_URL | gzip > backups/db-$(date +\%Y\%m\%d).sql.gz
```

## Monitoring

### Error Tracking
Add Sentry for error monitoring:

```bash
npm install @sentry/node
```

```typescript
// backend/src/app.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Uptime Monitoring
- Use [UptimeRobot](https://uptimerobot.com) (free)
- Monitor your API health endpoint: `GET /api/health`

### Performance Monitoring
- Railway/Render provide basic metrics
- Use [New Relic](https://newrelic.com) for detailed APM

## Production Checklist

### Before First Deploy
- [ ] Change all default secrets (JWT_SECRET)
- [ ] Configure production database with SSL
- [ ] Set up email service (SMTP)
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Test all critical flows in staging
- [ ] Set up error monitoring (Sentry)
- [ ] Configure database backups
- [ ] Set up uptime monitoring

### After Deploy
- [ ] Test authentication flow
- [ ] Test donation creation
- [ ] Test tax letter generation
- [ ] Test PDF downloads
- [ ] Test email sending
- [ ] Test CSV imports/exports
- [ ] Verify all API endpoints
- [ ] Check error handling
- [ ] Test mobile responsiveness
- [ ] Verify SSL certificate

## Scaling Considerations

### Database
- Start with smallest paid tier
- Monitor connection pool usage
- Add read replicas if needed (100+ concurrent users)
- Consider connection pooling (PgBouncer)

### Backend
- Horizontal scaling: Multiple instances behind load balancer
- Use CDN for static assets
- Consider caching (Redis) for frequent queries

### Costs Estimate
| Service | Free Tier | Paid Tier (100 orgs) |
|---------|-----------|---------------------|
| Railway/Render Backend | $0 (limited) | $20-30/mo |
| PostgreSQL | $0 (limited) | $15-25/mo |
| Vercel Frontend | $0 (unlimited) | $0-20/mo |
| Email (SendGrid) | 100/day free | $15/mo (40k emails) |
| **Total** | **$0-5/mo** | **$50-90/mo** |

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL

# Check Prisma connection
npx prisma db pull
```

### Migration Failures
```bash
# Reset and reapply (development only!)
npx prisma migrate reset

# Production: Manual SQL execution
psql $DATABASE_URL < fix.sql
```

### CORS Errors
- Verify FRONTEND_URL matches exactly (no trailing slash)
- Check browser console for actual origin
- Ensure credentials:true in both CORS and axios

### Email Not Sending
- Verify SMTP credentials
- Check spam folder
- Review backend logs for errors
- Test with different email provider

## Rollback Procedure

1. **Backend Rollback**
   - Railway/Render: Redeploy previous version from dashboard
   - Or: `git revert` and push

2. **Database Rollback**
   - Restore from backup
   - Apply reverse migration if available

3. **Frontend Rollback**
   - Vercel: Instant rollback from dashboard
   - Or redeploy previous commit

## Support

For deployment issues:
1. Check service status pages (Railway, Vercel, etc.)
2. Review application logs
3. Consult platform documentation
4. Contact platform support

---

**Last Updated**: February 2026
**Deployment Tested**: Railway + Vercel, Render
