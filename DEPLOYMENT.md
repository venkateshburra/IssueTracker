# Deployment & Setup Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables Setup

Create `.env.local` in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Get these from:
- Supabase Dashboard → Settings → API

### 2. Database Configuration

#### Run these SQL commands in Supabase:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create sections table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Todo',
  priority TEXT DEFAULT 'P2',
  label TEXT DEFAULT 'Task',
  due_date DATE,
  section_id UUID REFERENCES sections(id),
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  visibility_role TEXT,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id),
  user_id UUID REFERENCES profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Supabase Configuration

#### Auth Settings:
1. Go to Authentication → Providers
2. Ensure Email provider is enabled
3. (Optional) Add Google OAuth:
   - Enable Google provider
   - Add OAuth credentials from Google Cloud Console

#### Database Policies:
1. Go to Authentication → Policies
2. For now, policies are disabled (note: Enable RLS in production)

## 📦 Building for Production

### Build the application:
```bash
npm run build
```

This generates a `dist` folder ready for deployment.

### Preview build locally:
```bash
npm run preview
```

## 🌐 Deploy to Vercel (Recommended)

### Option 1: Using GitHub
1. Push your code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Option 2: Using Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

### Configuration
In `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## 🌍 Deploy to Netlify

### Option 1: Git Integration
1. Connect your GitHub repo to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard

### Option 2: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## 📤 Deploy to GitHub Pages

### Update vite.config.js:
```javascript
export default {
  base: '/repository-name/',
  // ... other config
}
```

### Deploy script in package.json:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### Run deployment:
```bash
npm install --save-dev gh-pages
npm run deploy
```

## 🔧 Post-Deployment Setup

### 1. Configure Supabase Redirects
In Supabase Dashboard → Authentication → URL Configuration:

Add these URLs:
```
Site URL: https://yourdomain.com
Redirect URLs:
- https://yourdomain.com
- https://yourdomain.com/dashboard
```

### 2. Configure Google OAuth (Optional)

#### Get OAuth Credentials:
1. Go to Google Cloud Console
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   ```
   https://yourdomain.com/auth/callback
   https://yourproject.supabase.co/auth/v1/callback?provider=google
   ```

#### Add to Supabase:
1. Supabase → Authentication → Providers → Google
2. Add Client ID and Client Secret
3. Enable Google provider

#### Update Login Component:
```javascript
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
}
```

### 3. Enable HTTPS
- Vercel: Automatic
- Netlify: Automatic
- GitHub Pages: Automatic
- Custom Domain: Use Let's Encrypt (free)

## ⚙️ Production Optimizations

### 1. Enable Row Level Security (RLS)

In Supabase SQL:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### 2. Create Security Policies

```sql
-- Users can view their own profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Similar policies for other tables...
```

### 3. Enable Backups
Supabase → Database → Backups → Enable automatic backups

### 4. Monitor Performance
- Vercel Analytics
- Netlify Analytics
- Supabase Logs

## 🐛 Debugging Production Issues

### Check Supabase Logs
Supabase → Logs → Edge Functions / Realtime

### Monitor Application
1. Browser console (F12)
2. Network tab for API calls
3. Application tab for local storage

### Common Issues & Solutions

**Issue:** Cannot connect to Supabase
- Check API keys in `.env.local`
- Verify CORS settings in Supabase

**Issue:** Auth not persisting
- Check browser storage
- Clear cache and refresh
- Check session configuration

**Issue:** Slow performance
- Check database queries
- Enable caching
- Optimize images

## 📊 Monitoring & Maintenance

### Weekly Tasks
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Review user feedback

### Monthly Tasks
- [ ] Database optimization
- [ ] Backup verification
- [ ] Security updates

### Quarterly Tasks
- [ ] Load testing
- [ ] Security audit
- [ ] Feature planning

## 🔐 Security Checklist

- [ ] Enable HTTPS
- [ ] Set up RLS policies
- [ ] Configure CORS properly
- [ ] Use environment variables
- [ ] Validate all inputs
- [ ] Implement rate limiting
- [ ] Set up monitoring/alerts
- [ ] Regular security audits

## 📞 Support

For issues:
1. Check logs in Supabase
2. Check browser console
3. Verify environment variables
4. Check network connectivity
5. Review Supabase documentation

---

**Ready to Deploy!** 🚀

Choose your hosting platform above and follow the steps.
