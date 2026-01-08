# Login Instructions for Admin Dashboard

## 🎯 Current Status
The admin dashboard is now configured to work with your credentials. You have two options:

## Option 1: Use Mock Authentication (Recommended for Testing)
The frontend is currently using mock authentication. Your credentials have been added to the mock service.

**Login with:**
- **Email**: ghodeabhijeet18@gmail.com
- **Password**: ShreeSwamiSamarth@28
- **Tenant ID**: (leave empty)

## Option 2: Use Real Backend API
To use the real backend API, you need to:

1. **Restart the backend services** to pick up the JWT_SECRET:
   ```bash
   # Stop current services (Ctrl+C)
   # Then restart:
   npm run start:services
   ```

2. **Change the environment variable** in `apps/admin-dashboard/.env.local`:
   ```
   NEXT_PUBLIC_USE_MOCK_AUTH=false
   ```

3. **Restart the admin dashboard**:
   ```bash
   cd apps/admin-dashboard
   npm run dev
   ```

4. **Login with:**
   - **Email**: ghodeabhijeet18@gmail.com
   - **Password**: ShreeSwamiSamarth@28
   - **Tenant ID**: 4a10f69e-bd5a-47ea-b7eb-6fd5aabba5aa (or leave empty for auto-detection)

## 🔧 Troubleshooting

### If login still fails:
1. Check browser console for errors
2. Verify backend services are running: `node check-status.js`
3. Test API directly: `node test-api-login.js`

### Mock Authentication Users:
- admin@restaurant.com / admin123 (Admin)
- manager@restaurant.com / manager123 (Manager)  
- ghodeabhijeet18@gmail.com / ShreeSwamiSamarth@28 (Your Account)

## 📋 Next Steps After Login:
Once logged in successfully, you can:
1. Explore the dashboard features
2. Test the menu management system
3. Continue with the next task: **3.4 Integrate real-time inventory status**

The dashboard includes:
- ✅ Real-time metrics dashboard
- ✅ Role-based access control
- ✅ Menu management with drag-and-drop
- ✅ Bulk operations and pricing
- 🔄 Ready for inventory integration