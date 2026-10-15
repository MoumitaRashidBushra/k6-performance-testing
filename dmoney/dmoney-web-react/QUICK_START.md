# Quick Start Guide - D-Money Next.js

## ✅ What's Ready to Test

The following features have been fully migrated and are ready to test:

### 1. Authentication System
- ✅ Login page with validation
- ✅ Token management
- ✅ Automatic token expiration handling
- ✅ Logout functionality (via clearing localStorage)

### 2. User Profile
- ✅ View user profile
- ✅ Display user information
- ✅ Protected route

### 3. API Integration
- ✅ Centralized API service with interceptors
- ✅ Automatic token attachment
- ✅ 401 error handling
- ✅ Redirect on token expiration

## 🚀 Running the Application

### Step 1: Navigate to Project
```bash
cd dmoney-nextjs
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Access the Application
Open your browser and go to: http://localhost:3000

## 🧪 Testing Workflow

### Test 1: Initial Load
1. Open http://localhost:3000
2. **Expected**: Should redirect to `/login`

### Test 2: Login
1. Enter valid credentials
2. Click "Login"
3. **Expected**: 
   - Should see "Please wait...verifying your credentials"
   - Should redirect to `/profile`
   - Should see user information

### Test 3: Profile Page
1. After login, you should be on `/profile`
2. **Expected**:
   - User name, email, phone, role, balance displayed
   - Data loaded from API

### Test 4: Token Expiration (Important!)
1. Log in successfully
2. Open Browser DevTools → Application → Local Storage
3. Delete the `token` entry
4. Try to navigate or refresh the page
5. **Expected**: Should automatically redirect to `/login`

### Test 5: Direct Access Protection
1. Logout (clear localStorage)
2. Try to access http://localhost:3000/profile directly
3. **Expected**: Should redirect to `/login`

### Test 6: Re-login After Logout
1. Clear localStorage to logout
2. Go to `/login`
3. Enter credentials and login again
4. **Expected**: Should work and redirect to `/profile`

## 🔧 Troubleshooting

### Issue: Port Already in Use
If port 3000 is already in use:
```bash
# Edit .env.local and change PORT
PORT=3007

# Or run with specific port
npm run dev -- -p 3007
```

### Issue: API Connection Failed
1. Check if backend API is running
2. Verify `.env.local` has correct API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```
3. Check browser console for errors

### Issue: Module Not Found
```bash
# Reinstall dependencies
npm install
```

### Issue: TypeScript Errors
```bash
# Rebuild TypeScript
npm run build
```

## 📱 Testing Different Scenarios

### Scenario 1: Valid Login
- Email: (use valid test email)
- Password: (use valid test password)
- **Expected**: Success, redirect to profile

### Scenario 2: Invalid Login
- Email: wrong@example.com
- Password: wrongpassword
- **Expected**: Error message displayed

### Scenario 3: Empty Fields
- Leave email or password empty
- **Expected**: Validation error message

### Scenario 4: API Down
- Stop backend API
- Try to login
- **Expected**: Connection error message

## 📊 What's Working

| Feature | Status | Notes |
|---------|--------|-------|
| Home Redirect | ✅ | Redirects based on token |
| Login Page | ✅ | Full functionality |
| Login Validation | ✅ | Client-side checks |
| API Authentication | ✅ | Token storage |
| Profile Page | ✅ | Displays user data |
| Token Expiration | ✅ | Auto-redirect on 401 |
| Protected Routes | ✅ | Middleware protection |
| Route Protection | ✅ | Cannot access without token |

## 🔄 What's Not Yet Migrated

The following components still need to be migrated from the React app:

### Admin Features
- [ ] User List (view all users)
- [ ] Create User (admin form)
- [ ] User Profile (edit/delete)
- [ ] Transaction List (admin view)
- [ ] Admin Dashboard

### Transaction Features
- [ ] Send Money
- [ ] Deposit/Cash-in
- [ ] Withdraw/Cash-out
- [ ] Payment
- [ ] Self Statement (transaction history)

### Layout Components
- [ ] Dashboard Layout
- [ ] Left Menu
- [ ] Pagination

## 📝 Migration Progress

**Completed**: 3 pages (Home, Login, Profile)  
**Remaining**: ~15 components  
**Progress**: ~20% complete

## 🎯 Next Steps for Full Migration

1. Migrate Admin components
2. Migrate Transaction components
3. Migrate Layout components
4. Add role-based routing
5. Test all features end-to-end
6. Production deployment

## 🆘 Need Help?

1. Check `NEXTJS_MIGRATION.md` for detailed migration guide
2. Review Next.js docs: https://nextjs.org/docs
3. Check Material-UI integration: https://mui.com/material-ui/integrations/nextjs/

## ⚡ Quick Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run lint
```

## 🔐 Default Test Credentials

Use the same credentials from your React app:
- Backend API should be running on `http://localhost:3000`
- Use valid test user credentials from your backend

## ✨ Key Improvements Over React App

1. **Better Performance**: Automatic code splitting
2. **Type Safety**: Full TypeScript support
3. **SEO Ready**: Server-side rendering capable
4. **Modern Stack**: Next.js 15 with App Router
5. **Edge Middleware**: Route protection at CDN level
6. **Optimized Images**: Automatic image optimization
7. **Fast Refresh**: Better development experience

## 📞 Support

For issues specific to this migration, refer to the `NEXTJS_MIGRATION.md` file.
