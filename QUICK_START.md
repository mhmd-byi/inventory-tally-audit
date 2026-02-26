# Quick Start Guide - Inventory Tally Audit System

## What's Been Set Up

✅ **Database Connection**: MongoDB connected via your `.env.local` file  
✅ **User Authentication**: NextAuth with secure password hashing  
✅ **Login Page**: Beautiful glassmorphic design at `/login`  
✅ **Dashboard Page**: Modern, responsive dashboard at `/dashboard`  
✅ **User Model**: With roles (admin, organization_admin, user)

## Next Steps

### 1. Create Admin User

Before you can login, you need to create the admin user. Run:

```bash
npm run seed-admin
```

**If this fails**, you can create a user manually through the API:

```bash
# Using PowerShell
$body = @{
    name = "Admin"
    email = "admin@inventory.com"
    password = "Admin@123"
    role = "admin"
    secretKey = "your-super-secret-key-change-this-in-prod"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users/create" -Method POST -Body $body -ContentType "application/json"
```

### 2. Login

1. Navigate to http://localhost:3000 (will redirect to `/login`)
2. Use credentials:
   - **Email**: `admin@inventory.com`
   - **Password**: `Admin@123`

3. You'll be redirected to the dashboard!

## Default Credentials

- **Email**: admin@inventory.com
- **Password**: Admin@123
- **Role**: admin

## Pages Available

- `/` - Home (redirects to login)
- `/login` - Login page
- `/dashboard` - Main dashboard (protected, requires authentication)

## API Routes

- `POST /api/auth/[...nextauth]` - NextAuth authentication
  - Handles login/logout
  - Returns JWT tokens

- `POST /api/users/create` - Create new user
  - Requires `secretKey` matching `NEXTAUTH_SECRET`
  - Body: `{ name, email, password, role, secretKey }`

## User Roles

1. **admin** - Full system access
2. **organization_admin** - Organization management
3. **user** - Standard user access

## Troubleshooting

### Can't Connect to Database

- Check your MongoDB URI in `.env.local`
- Ensure MongoDB is running
- If using MongoDB Atlas, whitelist your IP

### Login Not Working

- Make sure admin user was created
- Check browser console for errors
- Verify NEXTAUTH_SECRET is set in `.env.local`

### Server Won't Start

- Make sure port 3000 is free
- Run `npm install` again if needed
- Check for TypeScript errors

## What to Build Next

Now that authentication is working, you can:

1. **Add Inventory Management**
   - Create inventory items model
   - Build inventory CRUD pages
   - Add search and filters

2. **Implement Audit System**
   - Create audit model
   - Build audit forms
   - Track audit history

3. **Generate Reports**
   - Build report templates
   - Add export functionality (PDF, Excel)
   - Create analytics dashboard

4. **User Management**
   - Admin page to create users
   - Edit user roles
   - View user activity

## Need Help?

Check the main `README.md` for more detailed documentation and project structure information.
