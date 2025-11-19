import { getPrismaClient, disconnectPrisma } from './db';
import { hashPassword } from './utils/auth';

const prisma = getPrismaClient();

/**
 * Seed the database with initial users and products
 * This script is idempotent - it will delete and recreate seed data
 */
async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing seed data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning up existing seed data...');
  await prisma.product.deleteMany({
    where: {
      slug: {
        in: ['wireless-headphones', 'laptop-stand', 'mechanical-keyboard'],
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['admin@xawery.com', 'manager@xawery.com', 'viewer@xawery.com'],
      },
    },
  });

  // Create users with different roles
  console.log('👤 Creating users...');
  const adminPassword = await hashPassword('admin123');
  const managerPassword = await hashPassword('manager123');
  const viewerPassword = await hashPassword('viewer123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@xawery.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@xawery.com',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@xawery.com',
      password: viewerPassword,
      role: 'VIEWER',
    },
  });

  console.log(`✅ Created user: ${admin.email} (${admin.role})`);
  console.log(`✅ Created user: ${manager.email} (${manager.role})`);
  console.log(`✅ Created user: ${viewer.email} (${viewer.role})`);

  // Create sample products
  console.log('📦 Creating sample products...');

  const products = [
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium wireless headphones with noise cancellation and 30-hour battery life.',
      basePrice: 199.99,
      active: true,
    },
    {
      name: 'Laptop Stand',
      slug: 'laptop-stand',
      description: 'Ergonomic aluminum laptop stand with adjustable height and ventilation.',
      basePrice: 49.99,
      active: true,
    },
    {
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches and programmable keys.',
      basePrice: 129.99,
      active: true,
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData,
    });
    console.log(`✅ Created product: ${product.name} (${product.slug})`);
  }

  console.log('✨ Database seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin:  admin@xawery.com / admin123');
  console.log('   Manager: manager@xawery.com / manager123');
  console.log('   Viewer: viewer@xawery.com / viewer123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });

