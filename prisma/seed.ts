import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password for all users (default password: "password123")
  const defaultPassword = await bcrypt.hash('password123', 10);

  // Seed users with different roles
  const users = [
    {
      email: 'superadmin@example.com',
      name: 'Super Admin',
      phone: '1234567890',
      password: defaultPassword,
      role: 'super_admin' as const,
    },
    {
      email: 'admin@example.com',
      name: 'Admin User',
      phone: '1234567891',
      password: defaultPassword,
      role: 'admin' as const,
    },
    {
      email: 'salesperson@example.com',
      name: 'Sales Person',
      phone: '1234567892',
      password: defaultPassword,
      role: 'sales_person' as const,
    },
    {
      email: 'worker@example.com',
      name: 'Worker',
      phone: '1234567893',
      password: defaultPassword,
      role: 'worker' as const,
    },
  ];

  for (const userData of users) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`⏭️  User ${userData.email} already exists, skipping...`);
    } else {
      const user = await prisma.user.create({
        data: userData,
      });
      console.log(`✅ Created user: ${user.email} with role: ${user.role}`);
    }
  }

  console.log('✨ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

