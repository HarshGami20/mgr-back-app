import { Prisma, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** All roles from `schema.prisma` + extra accounts for multi-user flows (orders, assignments). */
const SEED_USERS: Array<{
  email: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
}> = [
  // —— super_admin (single account; can register others via API) ——
  {
    email: 'superadmin@example.com',
    name: 'Super Admin',
    phone: '9000000001',
    password: '123456',
    role: Role.super_admin,
  },

  // —— admin ——
  {
    email: 'admin@example.com',
    name: 'Alex Admin',
    phone: '9000000002',
    password: '123456',
    role: Role.admin,
  },
  {
    email: 'admin2@example.com',
    name: 'Jordan Admin',
    phone: '9000000003',
    password: '123456',
    role: Role.admin,
  },

  // —— sales_person ——
  {
    email: 'salesperson@example.com',
    name: 'Sam Sales',
    phone: '9000000010',
    password: '123456',
    role: Role.sales_person,
  },
  {
    email: 'sales2@example.com',
    name: 'Riley Sales',
    phone: '9000000011',
    password: '123456',

    role: Role.sales_person,
  },

  // —— worker ——
  {
    email: 'worker@example.com',
    name: 'Wren Worker',
    phone: '9000000020',
    password: '123456',

    role: Role.worker,
  },
  {
    email: 'worker2@example.com',
    name: 'Casey Worker',
    phone: '9000000021',
    password: '123456',

    role: Role.worker,
  },

  // —— supplier ——
  {
    email: 'supplier@example.com',
    name: 'Sydney Supplier',
    phone: '9000000030',
    password: '123456',

    role: Role.supplier,
  },
  {
    email: 'supplier2@example.com',
    name: 'Pat Supplier',
    phone: '9000000031',
    password: '123456',

    role: Role.supplier,
  },

  // —— manufacturer ——
  {
    email: 'manufacturer@example.com',
    name: 'Morgan Manufacturer',
    phone: '9000000040',
    password: '123456',

    role: Role.manufacturer,
  },
  {
    email: 'manufacturer2@example.com',
    name: 'Taylor Manufacturer',
    phone: '9000000041',
    password: '123456',

    role: Role.manufacturer,
  },
];

async function main() {
  console.log('🌱 Seeding branches + users (all roles + extras)…');
  console.log('   Default password for every account: password123\n');

  const mainBranch = await prisma.branch.upsert({
    where: { code: 'MAIN' },
    create: { name: 'Main showroom', code: 'MAIN' },
    update: { name: 'Main showroom' },
  });
  const warehouseBranch = await prisma.branch.upsert({
    where: { code: 'WH' },
    create: { name: 'Central warehouse', code: 'WH' },
    update: { name: 'Central warehouse' },
  });
  const seedBranches = [mainBranch, warehouseBranch];
  console.log(`✅ Branches: ${seedBranches.map((b) => b.name).join(', ')}\n`);

  const defaultPassword = await bcrypt.hash('password123', 10);

  for (const u of SEED_USERS) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        password: defaultPassword,
        branches: { connect: seedBranches.map((b) => ({ id: b.id })) },
      },
      update: {
        name: u.name,
        phone: u.phone,
        role: u.role,
        password: defaultPassword,
        branches: { set: seedBranches.map((b) => ({ id: b.id })) },
      },
    });
    console.log(`✅ ${row.email} → ${row.role}`);
  }

  const catalogItems: Array<{
    sku: string;
    name: string;
    description: string;
    category: string;
    subcategory: string;
    variant: {
      size: string;
      material: string;
      color: string;
      model: string;
      unitPrice: number;
      stockQuantity: number;
      imageUris: Prisma.JsonValue;
      isDefault: boolean;
      sortOrder: number;
    };
  }> = [
    {
      sku: 'SEED-SOFA-01',
      name: 'Linen 3-seat sofa',
      description: 'Comfortable three-seat sofa for living room.',
      category: 'living_room',
      subcategory: 'Sofas & sectionals',
      variant: {
        size: 'large',
        material: 'fabric',
        color: 'Sand',
        model: 'MGR-SF-3',
        unitPrice: 45999,
        stockQuantity: 5,
        imageUris: [],
        isDefault: true,
        sortOrder: 0,
      },
    },
    {
      sku: 'SEED-DESK-01',
      name: 'Oak writing desk',
      description: 'Solid wood desk for office.',
      category: 'office',
      subcategory: 'Desks',
      variant: {
        size: 'medium',
        material: 'wood',
        color: 'Natural oak',
        model: 'MGR-DSK-1',
        unitPrice: 12999,
        stockQuantity: 5,
        imageUris: [],
        isDefault: true,
        sortOrder: 0,
      },
    },
  ];

  for (const item of catalogItems) {
    const existingVar = await prisma.productVariant.findUnique({ where: { sku: item.sku } });
    if (existingVar) {
      await prisma.product.update({
        where: { id: existingVar.productId },
        data: {
          name: item.name,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
        },
      });
      await prisma.productVariant.update({
        where: { sku: item.sku },
        data: {
          size: item.variant.size,
          material: item.variant.material,
          color: item.variant.color,
          model: item.variant.model,
          unitPrice: item.variant.unitPrice,
          stockQuantity: item.variant.stockQuantity,
          imageUris: item.variant.imageUris as Prisma.InputJsonValue,
          isDefault: item.variant.isDefault,
          sortOrder: item.variant.sortOrder,
        },
      });
    } else {
      await prisma.product.create({
        data: {
          name: item.name,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          variants: {
            create: {
              sku: item.sku,
              size: item.variant.size,
              material: item.variant.material,
              color: item.variant.color,
              model: item.variant.model,
              unitPrice: item.variant.unitPrice,
              stockQuantity: item.variant.stockQuantity,
              imageUris: item.variant.imageUris as Prisma.InputJsonValue,
              isDefault: item.variant.isDefault,
              sortOrder: item.variant.sortOrder,
            },
          },
        },
      });
    }
    console.log(`✅ Product + variant ${item.sku}`);
  }

  console.log(
    `\n✨ Done: ${SEED_USERS.length} users, ${seedBranches.length} branches, ${catalogItems.length} sample products (variants).`
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
