import { allocationService } from './allocationService';
import prismaMock from '../__mocks__/prisma';
import { ConflictError } from '../errors/ConflictError';

const START = new Date('2026-06-01T08:00:00Z');
const END = new Date('2026-06-01T16:00:00Z');

const baseAllocation = {
  id: 'alloc1',
  workOrderId: 'wo1',
  operatorId: 'op1',
  machineId: null,
  startTime: START,
  endTime: END,
  createdById: 'user1',
  createdAt: new Date(),
  updatedAt: new Date(),
  operator: { id: 'op1', name: 'Alice', employeeId: 'E001', skills: [], status: 'ASSIGNED' as const, createdAt: new Date(), updatedAt: new Date() },
  machine: null,
  materials: [],
  workOrder: { id: 'wo1', orderNumber: 'WO-001', title: 'Test', status: 'PENDING' as const, scheduledStart: START, scheduledEnd: END, targetQty: 10, createdAt: new Date(), updatedAt: new Date() },
};

const baseMaterial = {
  id: 'mat1',
  sku: 'SKU-001',
  name: 'Steel Rod',
  unitOfMeasure: 'pcs',
  quantityOnHand: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper: configure prismaMock.$transaction to run the callback inline
function mockTransaction() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
}

describe('allocationService.create', () => {
  beforeEach(() => {
    mockTransaction();
  });

  it('throws OPERATOR_CONFLICT when operator has overlapping allocation', async () => {
    prismaMock.allocation.findFirst.mockResolvedValue(baseAllocation);

    await expect(
      allocationService.create(
        { workOrderId: 'wo2', operatorId: 'op1', startTime: START.toISOString(), endTime: END.toISOString(), materials: [] },
        'user1'
      )
    ).rejects.toMatchObject({ name: 'ConflictError', code: 'OPERATOR_CONFLICT' });
  });

  it('throws MACHINE_CONFLICT when machine has overlapping allocation', async () => {
    prismaMock.allocation.findFirst.mockResolvedValueOnce({ ...baseAllocation, operatorId: null, machineId: 'mch1' });

    await expect(
      allocationService.create(
        { workOrderId: 'wo2', machineId: 'mch1', startTime: START.toISOString(), endTime: END.toISOString(), materials: [] },
        'user1'
      )
    ).rejects.toMatchObject({ code: 'MACHINE_CONFLICT' });
  });

  it('throws INSUFFICIENT_STOCK when material quantity is too low', async () => {
    prismaMock.allocation.findFirst.mockResolvedValue(null);
    prismaMock.material.findUniqueOrThrow.mockResolvedValue({ ...baseMaterial, quantityOnHand: 5 });

    await expect(
      allocationService.create(
        { workOrderId: 'wo1', startTime: START.toISOString(), endTime: END.toISOString(), materials: [{ materialId: 'mat1', quantityRequired: 10 }] },
        'user1'
      )
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
  });

  it('creates allocation and decrements material stock when all checks pass', async () => {
    prismaMock.allocation.findFirst.mockResolvedValue(null);
    prismaMock.material.findUniqueOrThrow.mockResolvedValue({ ...baseMaterial, quantityOnHand: 100 });
    prismaMock.material.update.mockResolvedValue({ ...baseMaterial, quantityOnHand: 90 });
    prismaMock.operator.update.mockResolvedValue({ ...baseAllocation.operator! });
    prismaMock.allocation.create.mockResolvedValue(baseAllocation);

    const result = await allocationService.create(
      {
        workOrderId: 'wo1',
        operatorId: 'op1',
        startTime: START.toISOString(),
        endTime: END.toISOString(),
        materials: [{ materialId: 'mat1', quantityRequired: 10 }],
      },
      'user1'
    );

    expect(result.id).toBe('alloc1');
    expect(prismaMock.material.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantityOnHand: { decrement: 10 } } })
    );
    expect(prismaMock.operator.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ASSIGNED' } })
    );
  });

  it('creates allocation with no operator/machine/materials', async () => {
    prismaMock.allocation.create.mockResolvedValue({ ...baseAllocation, operatorId: null });

    const result = await allocationService.create(
      { workOrderId: 'wo1', startTime: START.toISOString(), endTime: END.toISOString(), materials: [] },
      'user1'
    );

    expect(result.id).toBe('alloc1');
    expect(prismaMock.allocation.findFirst).not.toHaveBeenCalled();
  });
});

describe('allocationService.remove', () => {
  beforeEach(() => {
    mockTransaction();
  });

  it('restores material quantityOnHand on delete', async () => {
    const allocationWithMaterial = {
      ...baseAllocation,
      materials: [{ allocationId: 'alloc1', materialId: 'mat1', quantityRequired: 10 }],
    };
    prismaMock.allocation.findUniqueOrThrow.mockResolvedValue(allocationWithMaterial);
    prismaMock.material.update.mockResolvedValue({ ...baseMaterial, quantityOnHand: 110 });
    prismaMock.allocation.count.mockResolvedValue(0);
    prismaMock.operator.update.mockResolvedValue(baseAllocation.operator!);
    prismaMock.allocation.delete.mockResolvedValue(baseAllocation);

    await allocationService.remove('alloc1');

    expect(prismaMock.material.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantityOnHand: { increment: 10 } } })
    );
  });

  it('restores operator status to AVAILABLE when no remaining allocations', async () => {
    prismaMock.allocation.findUniqueOrThrow.mockResolvedValue(baseAllocation);
    prismaMock.allocation.count.mockResolvedValue(0);
    prismaMock.operator.update.mockResolvedValue({ ...baseAllocation.operator!, status: 'AVAILABLE' });
    prismaMock.allocation.delete.mockResolvedValue(baseAllocation);

    await allocationService.remove('alloc1');

    expect(prismaMock.operator.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'AVAILABLE' } })
    );
  });

  it('leaves operator ASSIGNED when other allocations remain', async () => {
    prismaMock.allocation.findUniqueOrThrow.mockResolvedValue(baseAllocation);
    prismaMock.allocation.count.mockResolvedValue(2); // still has other allocations
    prismaMock.allocation.delete.mockResolvedValue(baseAllocation);

    await allocationService.remove('alloc1');

    expect(prismaMock.operator.update).not.toHaveBeenCalled();
  });
});
