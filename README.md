# Inventory Tally Audit Management System

A modern inventory management and audit tracking system built with Next.js, MongoDB, and NextAuth.

## Features

- 🔐 **User Authentication** - Secure login with NextAuth and JWT
- 👥 **Role-Based Access** - Admin, Organization Admin, and User roles
- 📊 **Beautiful Dashboard** - Modern, responsive dashboard with real-time stats
- 🎨 **Premium UI** - Glassmorphic design with gradient accents
- 📱 **Responsive** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or MongoDB Atlas)

### Installation

1. **Clone and Install**

   ```bash
   npm install
   ```

2. **Environment Setup**

   The `.env.local` file is already configured with:

   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-super-secret-key-change-this-in-prod
   ```

3. **Create Admin User**

   Run the seed script to create the initial admin user:

   ```bash
   npm run seed-admin
   ```

   This will create an admin user with:
   - **Email**: `admin@inventory.com`
   - **Password**: `Admin@123`
   - **Role**: `admin`

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Open Application**

   Navigate to [http://localhost:3000](http://localhost:3000)

   You'll be redirected to the login page. Use the admin credentials above to sign in.

## Project Structure

```
inventory-tally-audit/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth configuration
│   │   └── users/                   # User management APIs
│   ├── dashboard/                   # Dashboard page
│   ├── login/                       # Login page
│   ├── layout.tsx                   # Root layout with SessionProvider
│   └── page.tsx                     # Home page (redirects to login)
├── components/
│   └── SessionProvider.tsx          # NextAuth session provider
├── lib/
│   └── db.ts                        # MongoDB connection utility
├── models/
│   └── User.ts                      # User model
├── scripts/
│   └── seed-admin.js                # Admin user seed script
└── .env.local                       # Environment variables
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run seed-admin` - Create initial admin user
- `npm run lint` - Run ESLint

## User Roles

1. **Admin** - Full system access
2. **Organization Admin** - Manage organization and users
3. **User** - Standard access to inventory features

## Features Roadmap

- [ ] Inventory management
- [ ] Audit tracking
- [ ] Report generation
- [ ] Real-time notifications
- [ ] Export functionality
- [ ] Advanced analytics

## Security Notes

⚠️ **Important**: Before deploying to production:

1. Change the `JWT_SECRET` and `NEXTAUTH_SECRET` in `.env.local`
2. Use strong, unique passwords for all users
3. Enable HTTPS in production
4. Review and update CORS settings if needed

## Troubleshooting

### Database Connection Issues

- Verify your `MONGODB_URI` is correct
- Check if your IP is whitelisted (MongoDB Atlas)
- Ensure MongoDB service is running (local setup)

### Login Issues

- Ensure admin user was created successfully
- Check browser console for errors
- Verify NextAuth configuration

## License

This project is proprietary software.

## Support

For issues or questions, please contact the development team.
