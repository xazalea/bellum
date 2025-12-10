# Firebase Setup Guide for nacho. Platform

This guide walks you through setting up Firebase for the nacho. platform, enabling cloud storage, authentication, and cross-device game synchronization.

## 📋 Prerequisites

- Google account
- Firebase project (free tier works fine)
- Basic understanding of Firebase services

## 🔥 Step-by-Step Setup

### 1. Create Firebase Project

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Click "Add project" or "Create a project"

2. **Configure Project**
   - Enter project name: `nachooooo` (or your choice)
   - Enable Google Analytics (optional but recommended)
   - Select or create Analytics account
   - Click "Create project"

### 2. Enable Authentication

1. **Navigate to Authentication**
   - In Firebase Console, click "Authentication" in left sidebar
   - Click "Get started"

2. **Enable Sign-in Methods**
   
   **Email/Password:**
   - Click "Email/Password"
   - Toggle "Enable"
   - Click "Save"

   **Google Sign-In:**
   - Click "Google"
   - Toggle "Enable"
   - Enter project support email
   - Click "Save"

   **Anonymous (Optional):**
   - Click "Anonymous"
   - Toggle "Enable"
   - Click "Save"

### 3. Set Up Firestore Database

1. **Navigate to Firestore**
   - Click "Firestore Database" in left sidebar
   - Click "Create database"

2. **Choose Security Rules**
   - Select "Start in production mode"
   - Click "Next"

3. **Select Location**
   - Choose closest region to your users
   - Click "Enable"

4. **Configure Rules**
   - Click "Rules" tab
   - Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Optional: Game metadata collection (public read, owner write)
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
  }
}
```

   - Click "Publish"

### 4. Set Up Cloud Storage

1. **Navigate to Storage**
   - Click "Storage" in left sidebar
   - Click "Get started"

2. **Choose Security Rules**
   - Select "Start in production mode"
   - Click "Next"

3. **Select Location**
   - Should match your Firestore location
   - Click "Done"

4. **Configure Rules**
   - Click "Rules" tab
   - Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User game files - only owner can read/write
    match /users/{userId}/games/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Limit file size to 500MB
    match /{allPaths=**} {
      allow write: if request.resource.size < 500 * 1024 * 1024;
    }
  }
}
```

   - Click "Publish"

### 5. Get Firebase Configuration

1. **Navigate to Project Settings**
   - Click gear icon (⚙️) next to "Project Overview"
   - Click "Project settings"

2. **Add Web App**
   - Scroll to "Your apps" section
   - Click "</> Web" icon
   - Enter app nickname: "nacho-web"
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

3. **Copy Configuration**
   - Copy the `firebaseConfig` object
   - Should look like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-ABC123XYZ"
};
```

### 6. Update Application Configuration

#### Option A: Update Config File (Recommended)

Edit `/lib/firebase/config.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

#### Option B: Use Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Then update `lib/firebase/config.ts`:

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
```

### 7. Update Cursor Rules (Optional)

Update `.cursorrules-firebase.json`:

```json
{
  "firebase": {
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_AUTH_DOMAIN",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_STORAGE_BUCKET",
    "messagingSenderId": "YOUR_SENDER_ID",
    "appId": "YOUR_APP_ID",
    "measurementId": "YOUR_MEASUREMENT_ID"
  },
  "description": "Firebase configuration for nacho. platform"
}
```

## 🧪 Test Your Setup

### 1. Test Authentication

```typescript
// In browser console
import { authService } from '@/lib/firebase/auth-service';

// Test email sign up
await authService.signUp('test@example.com', 'password123', 'Test User');

// Test sign in
await authService.signIn('test@example.com', 'password123');

// Check current user
console.log(authService.getCurrentUser());
```

### 2. Test File Upload

1. Sign in to the application
2. Upload a small test file
3. Check Firebase Storage console - file should appear under `users/{userId}/games/`
4. Check Firestore console - user document should be created

### 3. Test Cloud Library

1. Upload a game file
2. Navigate to "Library" tab
3. Game should appear in your library
4. Click "Run Game" to test download and execution

## 🔒 Security Best Practices

### 1. Never Expose API Keys in Public Repos

- Add `.env.local` to `.gitignore`
- Use environment variables for sensitive data
- Rotate keys if accidentally exposed

### 2. Set Up App Check (Recommended)

1. In Firebase Console, go to "App Check"
2. Click "Get started"
3. Register your domain
4. Enable reCAPTCHA v3 or other provider
5. Update code to initialize App Check

### 3. Monitor Usage

1. Go to "Usage and billing" in Firebase Console
2. Set up budget alerts
3. Monitor authentication, storage, and database usage
4. Set up quotas if needed

### 4. Implement Rate Limiting

Consider adding rate limiting to prevent abuse:

```typescript
// In lib/firebase/storage-service.ts
const UPLOAD_LIMIT_PER_DAY = 10;

async checkUploadLimit(userId: string): Promise<boolean> {
  // Check Firestore for user's upload count today
  // Return false if limit exceeded
}
```

## 📊 Storage Quotas & Limits

### Free Tier (Spark Plan)
- **Authentication**: 10,000 phone verifications/month
- **Firestore**: 1 GiB storage, 50K reads/day, 20K writes/day
- **Storage**: 5 GB storage, 1 GB download/day
- **Hosting**: 10 GB storage, 360 MB/day transfer

### Paid Tier (Blaze Plan)
- **Authentication**: $0.06/verification after free tier
- **Firestore**: $0.18/GB stored, $0.06/100K reads
- **Storage**: $0.026/GB stored, $0.12/GB download
- Pay-as-you-go pricing

### Optimization Tips

1. **Compress Files**: Use compression before upload to reduce storage costs
2. **Set Lifecycle Rules**: Auto-delete old files after X days
3. **Use CDN**: Enable Firebase Hosting for better performance
4. **Monitor Costs**: Set up budget alerts in Google Cloud Console

## 🐛 Common Issues

### Issue: "Permission denied" errors

**Solution**: Check Firestore/Storage rules match examples above

### Issue: "App not authorized" 

**Solution**: Add your domain to authorized domains:
1. Go to Authentication > Settings > Authorized domains
2. Add your domain (e.g., `localhost`, `yourdomain.com`)

### Issue: Files not uploading

**Solution**: 
- Check file size (must be under 500MB)
- Verify Storage rules are published
- Check browser console for CORS errors

### Issue: "Quota exceeded"

**Solution**:
- Upgrade to Blaze plan
- Optimize file sizes
- Implement file cleanup
- Monitor usage in Firebase Console

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Storage Guide](https://firebase.google.com/docs/storage)
- [Security Rules Reference](https://firebase.google.com/docs/rules)

## 🆘 Getting Help

If you encounter issues:

1. Check Firebase Console logs
2. Review browser console errors
3. Verify all configuration steps were completed
4. Check Firebase Status page for outages
5. Open an issue on GitHub with error details

---

**Need more help?** Open an issue on GitHub or contact support!
