// Simple script to create admin user via API
// Make sure dev server is running first (npm run dev)

const createAdmin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Admin',
        email: 'admin@inventory.com',
        password: 'Admin@123',
        role: 'admin',
        secretKey: 'your-super-secret-key-change-this-in-prod', // Must match NEXTAUTH_SECRET
      }),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('\n✅ Admin user created successfully!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📧 Email: admin@inventory.com')
      console.log('🔑 Password: Admin@123')
      console.log('👤 Role: admin')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    } else {
      console.error('❌ Error:', data.error)

      if (data.error.includes('already exists')) {
        console.log('\n⚠️  Admin user already exists!')
        console.log('You can login with:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📧 Email: admin@inventory.com')
        console.log('🔑 Password: Admin@123')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }
    }
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message)
    console.log('\n💡 Tips:')
    console.log('1. Make sure the dev server is running (npm run dev)')
    console.log('2. Check that MongoDB is connected')
    console.log('3. Verify your .env.local file is set up correctly\n')
  }
}

createAdmin()
