# Expiration Tracker - Deployment Guide

This guide covers deploying both the web application (Vercel) and mobile application (App Stores).

## 🌐 Web Application Deployment (Vercel)

### Prerequisites
- Vercel account (free tier available)
- GitHub repository with your code
- Node.js 18+ for local testing

### Automatic Deployment (Recommended)

1. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy from project directory
   vercel
   ```

2. **GitHub Integration**
   - Push code to GitHub repository
   - Connect repository to Vercel dashboard
   - Automatic deployments on every push to main branch

### Manual Deployment

1. **Build the application**
   ```bash
   cd web
   pnpm install
   pnpm run build
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

### Environment Configuration

Create `vercel.json` in project root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

### Custom Domain (Optional)

1. **Add domain in Vercel dashboard**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate**
   - Automatically provided by Vercel
   - No additional configuration needed

### Performance Optimization

1. **Enable compression**
   ```javascript
   // next.config.js
   module.exports = {
     compress: true,
     poweredByHeader: false,
     generateEtags: false,
   }
   ```

2. **Image optimization**
   - Next.js automatic image optimization
   - WebP format support
   - Responsive images

## 📱 Mobile Application Deployment

### iOS App Store

#### Prerequisites
- Apple Developer Account ($99/year)
- Xcode (macOS required)
- iOS device for testing

#### Build Process

1. **Configure app.json**
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourcompany.expirationtracker",
         "buildNumber": "1.0.0"
       }
     }
   }
   ```

2. **Build with EAS Build**
   ```bash
   # Install EAS CLI
   npm install -g @expo/eas-cli
   
   # Login to Expo
   eas login
   
   # Configure build
   eas build:configure
   
   # Build for iOS
   eas build --platform ios
   ```

3. **Submit to App Store**
   ```bash
   eas submit --platform ios
   ```

#### App Store Connect

1. **Create app listing**
   - App name: "Expiration Tracker"
   - Category: "Productivity" or "Food & Drink"
   - Age rating: 4+ (no objectionable content)

2. **Required assets**
   - App icon (1024x1024px)
   - Screenshots for different device sizes
   - App description and keywords

3. **Review process**
   - Typically 24-48 hours
   - Ensure compliance with App Store guidelines

### Android Google Play Store

#### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Android Studio (optional, for testing)

#### Build Process

1. **Configure app.json**
   ```json
   {
     "expo": {
       "android": {
         "package": "com.yourcompany.expirationtracker",
         "versionCode": 1
       }
     }
   }
   ```

2. **Build with EAS Build**
   ```bash
   # Build for Android
   eas build --platform android
   ```

3. **Submit to Google Play**
   ```bash
   eas submit --platform android
   ```

#### Google Play Console

1. **Create app listing**
   - App name: "Expiration Tracker"
   - Category: "Productivity"
   - Content rating: Everyone

2. **Required assets**
   - App icon (512x512px)
   - Feature graphic (1024x500px)
   - Screenshots for phones and tablets
   - App description

3. **Review process**
   - Typically 1-3 days
   - Faster than iOS App Store

## 🔧 Configuration Files

### Web Application (next.config.js)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['placehold.co'],
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
}

module.exports = nextConfig
```

### Mobile Application (eas.json)
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## 🚀 CI/CD Pipeline

### GitHub Actions for Web Deployment

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build application
        run: pnpm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Mobile App CI/CD

Create `.github/workflows/mobile.yml`:
```yaml
name: Build Mobile App

on:
  push:
    branches: [main]
    paths: ['mobile/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Setup Expo
        uses: expo/expo-github-action@v7
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Install dependencies
        run: |
          cd mobile
          npm install
          
      - name: Build app
        run: |
          cd mobile
          eas build --platform all --non-interactive
```

## 📊 Monitoring & Analytics

### Web Application

1. **Vercel Analytics**
   - Built-in performance monitoring
   - Real user metrics
   - Core Web Vitals tracking

2. **Error Tracking**
   ```bash
   # Add Sentry for error tracking
   npm install @sentry/nextjs
   ```

### Mobile Application

1. **Expo Analytics**
   - Built-in crash reporting
   - Performance monitoring
   - User engagement metrics

2. **App Store Analytics**
   - Download statistics
   - User reviews and ratings
   - Revenue tracking (if applicable)

## 🔒 Security Considerations

### Web Application
- HTTPS enforced by Vercel
- Content Security Policy headers
- No sensitive data in client-side code
- IndexedDB for local storage only

### Mobile Application
- App Store security review
- Local SQLite database encryption
- Secure camera permissions
- No network data transmission

## 📝 Post-Deployment Checklist

### Web Application
- [ ] Test all features in production
- [ ] Verify PWA functionality
- [ ] Check mobile responsiveness
- [ ] Test offline capabilities
- [ ] Validate Excel import/export
- [ ] Confirm notifications work

### Mobile Application
- [ ] Test on multiple devices
- [ ] Verify barcode scanning
- [ ] Test push notifications
- [ ] Check file system permissions
- [ ] Validate Excel functionality
- [ ] Test offline mode

## 🆘 Troubleshooting

### Common Web Issues
- **Build failures**: Check Node.js version compatibility
- **Runtime errors**: Verify all dependencies are installed
- **Performance issues**: Optimize images and reduce bundle size

### Common Mobile Issues
- **Build failures**: Check Expo SDK compatibility
- **Permission issues**: Verify app.json permissions configuration
- **Store rejection**: Review platform-specific guidelines

## 📞 Support

For deployment issues:
1. Check platform documentation (Vercel, Expo, App Stores)
2. Review error logs and build outputs
3. Test locally before deploying
4. Use staging environments for testing

## 🔄 Updates and Maintenance

### Web Application
- Automatic deployments via Vercel
- Monitor performance metrics
- Regular dependency updates
- Security patch management

### Mobile Application
- Over-the-air updates via Expo
- App store update process
- Version management
- User feedback monitoring