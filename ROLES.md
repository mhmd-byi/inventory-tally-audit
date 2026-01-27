# User Roles System

## 🎭 Three User Roles

Your inventory tally audit system now supports three distinct user roles:

### 1. 👨‍💼 **Admin**
- **Full system access**
- Can manage all users
- Access to all features and settings
- Can view and manage all stores and audits

### 2. 🏪 **Store Manager**
- **Store-level management**
- Manage inventory in their assigned store(s)
- Create and manage tally records
- View store-specific reports
- Cannot access system-wide settings

### 3. 📋 **Auditor**
- **Audit-focused role**
- Conduct inventory audits
- Record discrepancies
- Generate audit reports
- Read-only access to inventory data

---

## 🔐 Test Credentials

### Admin User
```
Email: admin@inventory.com
Password: Admin@123
Role: admin
```

### Store Manager (Create via API or Admin Panel)
```
Email: manager@inventory.com
Password: Manager@123
Role: store_manager
```

### Auditor (Create via API or Admin Panel)
```
Email: auditor@inventory.com
Password: Auditor@123
Role: auditor
```

---

## 📝 Creating New Users

### Method 1: Using the Create User API

While the dev server is running, you can create users via API:

```javascript
// Example: Create a Store Manager
fetch('http://localhost:3000/api/users/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Store Manager Name',
    email: 'manager@example.com',
    password: 'SecurePassword123',
    role: 'store_manager',
    secretKey: 'your-super-secret-key-change-this-in-prod'
  })
});
```

### Method 2: Admin Panel (To Be Built)

You can build an admin panel where admins can:
- Create new users
- Assign roles
- Manage user permissions
- Reset passwords

---

## 🛠️ Role-Based Features to Implement

### For Admin Dashboard:
- User management interface
- System-wide analytics
- All stores overview
- Settings management

### For Store Manager Dashboard:
- Store inventory management
- Tally sheet creation
- Store-specific reports
- Team management

### For Auditor Dashboard:
- Audit checklists
- Discrepancy reporting
- Audit history
- Export audit reports

---

## 🔒 Role Validation Example

In your API routes or components, you can check user roles:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Check if user is admin
  if (session?.user?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Admin-only logic here
}
```

---

## 📊 Next Steps

1. **Build Role-Specific Dashboards**
   - Different layouts based on user role
   - Redirect to appropriate dashboard after login

2. **Implement Permissions System**
   - Define what each role can access
   - Add middleware for protected routes

3. **Create Admin User Management**
   - UI to create/edit/delete users
   - Assign roles and permissions

4. **Add Store Assignment**
   - Extend User model with store references
   - Implement store-manager relationships

5. **Build Audit Workflows**
   - Audit creation and assignment
   - Status tracking
   - Approval workflows

---

## 🚀 Current Status

✅ User model updated with 3 roles  
✅ Admin user created  
✅ Authentication working  
✅ Role-based type definitions  
✅ User management interface implemented
⏳ Role-specific dashboards (to be built)  
⏳ Permission system (to be built)
