import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const [supervisor, viewer] = await Promise.all([
    prisma.user.upsert({
      where: { username: 'supervisor' },
      update: {},
      create: { username: 'supervisor', passwordHash: await bcrypt.hash('password123', 10), role: 'SUPERVISOR' },
    }),
    prisma.user.upsert({
      where: { username: 'viewer' },
      update: {},
      create: { username: 'viewer', passwordHash: await bcrypt.hash('viewer123', 10), role: 'VIEWER' },
    }),
  ]);

  console.log(`Users: ${supervisor.username}, ${viewer.username}`);

  // Work Orders
  const now = new Date();
  const workOrders = await Promise.all([
    prisma.workOrder.upsert({
      where: { orderNumber: 'WO-001' },
      update: {},
      create: { orderNumber: 'WO-001', title: 'Assemble Drive Unit A', status: 'PENDING', scheduledStart: new Date(now.getTime() + 1 * 3600000), scheduledEnd: new Date(now.getTime() + 5 * 3600000), targetQty: 50 },
    }),
    prisma.workOrder.upsert({
      where: { orderNumber: 'WO-002' },
      update: {},
      create: { orderNumber: 'WO-002', title: 'Weld Frame Section B', status: 'IN_PROGRESS', scheduledStart: new Date(now.getTime() - 2 * 3600000), scheduledEnd: new Date(now.getTime() + 3 * 3600000), targetQty: 20 },
    }),
    prisma.workOrder.upsert({
      where: { orderNumber: 'WO-003' },
      update: {},
      create: { orderNumber: 'WO-003', title: 'Quality Inspection Line 1', status: 'PENDING', scheduledStart: new Date(now.getTime() + 6 * 3600000), scheduledEnd: new Date(now.getTime() + 8 * 3600000), targetQty: 100 },
    }),
    prisma.workOrder.upsert({
      where: { orderNumber: 'WO-004' },
      update: {},
      create: { orderNumber: 'WO-004', title: 'Paint Booth Run C', status: 'ON_HOLD', scheduledStart: new Date(now.getTime() + 8 * 3600000), scheduledEnd: new Date(now.getTime() + 12 * 3600000), targetQty: 30 },
    }),
    prisma.workOrder.upsert({
      where: { orderNumber: 'WO-005' },
      update: {},
      create: { orderNumber: 'WO-005', title: 'Pack & Ship Order #4421', status: 'PENDING', scheduledStart: new Date(now.getTime() + 9 * 3600000), scheduledEnd: new Date(now.getTime() + 10 * 3600000), targetQty: 15 },
    }),
  ]);
  console.log(`Work orders: ${workOrders.length}`);

  // Operators
  const operators = await Promise.all([
    prisma.operator.upsert({ where: { employeeId: 'EMP-001' }, update: {}, create: { employeeId: 'EMP-001', name: 'Alice Nguyen', skills: ['welding', 'assembly'], status: 'AVAILABLE' } }),
    prisma.operator.upsert({ where: { employeeId: 'EMP-002' }, update: {}, create: { employeeId: 'EMP-002', name: 'Bob Carter', skills: ['painting', 'quality'], status: 'AVAILABLE' } }),
    prisma.operator.upsert({ where: { employeeId: 'EMP-003' }, update: {}, create: { employeeId: 'EMP-003', name: 'Carmen Silva', skills: ['assembly', 'packing'], status: 'AVAILABLE' } }),
    prisma.operator.upsert({ where: { employeeId: 'EMP-004' }, update: {}, create: { employeeId: 'EMP-004', name: 'David Osei', skills: ['welding'], status: 'ABSENT' } }),
    prisma.operator.upsert({ where: { employeeId: 'EMP-005' }, update: {}, create: { employeeId: 'EMP-005', name: 'Elena Petrova', skills: ['quality', 'inspection'], status: 'AVAILABLE' } }),
    prisma.operator.upsert({ where: { employeeId: 'EMP-006' }, update: {}, create: { employeeId: 'EMP-006', name: 'Frank Müller', skills: ['machining', 'assembly'], status: 'AVAILABLE' } }),
  ]);
  console.log(`Operators: ${operators.length}`);

  // Machines
  const machines = await Promise.all([
    prisma.machine.upsert({ where: { machineCode: 'MCH-001' }, update: {}, create: { machineCode: 'MCH-001', name: 'Welding Robot Arm 1', type: 'Welding', status: 'AVAILABLE' } }),
    prisma.machine.upsert({ where: { machineCode: 'MCH-002' }, update: {}, create: { machineCode: 'MCH-002', name: 'CNC Mill Alpha', type: 'Machining', status: 'MAINTENANCE' } }),
    prisma.machine.upsert({ where: { machineCode: 'MCH-003' }, update: {}, create: { machineCode: 'MCH-003', name: 'Paint Booth 1', type: 'Painting', status: 'AVAILABLE' } }),
    prisma.machine.upsert({ where: { machineCode: 'MCH-004' }, update: {}, create: { machineCode: 'MCH-004', name: 'Assembly Line A', type: 'Assembly', status: 'AVAILABLE' } }),
    prisma.machine.upsert({ where: { machineCode: 'MCH-005' }, update: {}, create: { machineCode: 'MCH-005', name: 'Conveyor Pack 1', type: 'Packing', status: 'AVAILABLE' } }),
  ]);
  console.log(`Machines: ${machines.length}`);

  // Materials
  const materials = await Promise.all([
    prisma.material.upsert({ where: { sku: 'MAT-001' }, update: {}, create: { sku: 'MAT-001', name: 'Steel Rod 10mm', unitOfMeasure: 'pcs', quantityOnHand: 500 } }),
    prisma.material.upsert({ where: { sku: 'MAT-002' }, update: {}, create: { sku: 'MAT-002', name: 'Welding Wire ER70S', unitOfMeasure: 'kg', quantityOnHand: 120 } }),
    prisma.material.upsert({ where: { sku: 'MAT-003' }, update: {}, create: { sku: 'MAT-003', name: 'Primer Coat Gray', unitOfMeasure: 'liters', quantityOnHand: 80 } }),
    prisma.material.upsert({ where: { sku: 'MAT-004' }, update: {}, create: { sku: 'MAT-004', name: 'Drive Shaft Assembly', unitOfMeasure: 'pcs', quantityOnHand: 40 } }),
    prisma.material.upsert({ where: { sku: 'MAT-005' }, update: {}, create: { sku: 'MAT-005', name: 'M8 Hex Bolt', unitOfMeasure: 'pcs', quantityOnHand: 2000 } }),
    prisma.material.upsert({ where: { sku: 'MAT-006' }, update: {}, create: { sku: 'MAT-006', name: 'Cardboard Box L', unitOfMeasure: 'pcs', quantityOnHand: 150 } }),
    prisma.material.upsert({ where: { sku: 'MAT-007' }, update: {}, create: { sku: 'MAT-007', name: 'Hydraulic Seal Kit', unitOfMeasure: 'set', quantityOnHand: 25 } }),
    prisma.material.upsert({ where: { sku: 'MAT-008' }, update: {}, create: { sku: 'MAT-008', name: 'Bearing 6205-2RS', unitOfMeasure: 'pcs', quantityOnHand: 200 } }),
  ]);
  console.log(`Materials: ${materials.length}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
