import { workOrderService } from './workOrderService';
import prismaMock from '../__mocks__/prisma';
import { BadRequestError } from '../errors/BadRequestError';
import { WorkOrderStatus } from '@prisma/client';

const baseWorkOrder = {
  id: 'wo1',
  orderNumber: 'WO-001',
  title: 'Test WO',
  status: 'PENDING' as WorkOrderStatus,
  scheduledStart: new Date('2026-06-01T08:00:00Z'),
  scheduledEnd: new Date('2026-06-01T16:00:00Z'),
  targetQty: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('workOrderService.transition', () => {
  it('allows PENDING → IN_PROGRESS', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'PENDING' });
    prismaMock.workOrder.update.mockResolvedValue({ ...baseWorkOrder, status: 'IN_PROGRESS' });

    const result = await workOrderService.transition('wo1', 'IN_PROGRESS');

    expect(result.status).toBe('IN_PROGRESS');
    expect(prismaMock.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { status: 'IN_PROGRESS' },
    });
  });

  it('allows IN_PROGRESS → COMPLETED', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'IN_PROGRESS' });
    prismaMock.workOrder.update.mockResolvedValue({ ...baseWorkOrder, status: 'COMPLETED' });

    const result = await workOrderService.transition('wo1', 'COMPLETED');
    expect(result.status).toBe('COMPLETED');
  });

  it('allows IN_PROGRESS → ON_HOLD', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'IN_PROGRESS' });
    prismaMock.workOrder.update.mockResolvedValue({ ...baseWorkOrder, status: 'ON_HOLD' });

    const result = await workOrderService.transition('wo1', 'ON_HOLD');
    expect(result.status).toBe('ON_HOLD');
  });

  it('allows ON_HOLD → IN_PROGRESS', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'ON_HOLD' });
    prismaMock.workOrder.update.mockResolvedValue({ ...baseWorkOrder, status: 'IN_PROGRESS' });

    const result = await workOrderService.transition('wo1', 'IN_PROGRESS');
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('rejects PENDING → COMPLETED (invalid transition)', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'PENDING' });

    await expect(workOrderService.transition('wo1', 'COMPLETED')).rejects.toThrow(BadRequestError);
    await expect(workOrderService.transition('wo1', 'COMPLETED')).rejects.toThrow(
      'Cannot transition from PENDING to COMPLETED'
    );
  });

  it('rejects PENDING → ON_HOLD (invalid transition)', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'PENDING' });

    await expect(workOrderService.transition('wo1', 'ON_HOLD')).rejects.toThrow(BadRequestError);
  });

  it('rejects COMPLETED → IN_PROGRESS (terminal state)', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'COMPLETED' });

    await expect(workOrderService.transition('wo1', 'IN_PROGRESS')).rejects.toThrow(BadRequestError);
  });

  it('rejects COMPLETED → PENDING (terminal state)', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'COMPLETED' });

    await expect(workOrderService.transition('wo1', 'PENDING')).rejects.toThrow(BadRequestError);
  });

  it('does not call workOrder.update on invalid transition', async () => {
    prismaMock.workOrder.findUniqueOrThrow.mockResolvedValue({ ...baseWorkOrder, status: 'COMPLETED' });

    await workOrderService.transition('wo1', 'IN_PROGRESS').catch(() => {});
    expect(prismaMock.workOrder.update).not.toHaveBeenCalled();
  });
});

describe('workOrderService.create', () => {
  it('creates a work order with converted dates', async () => {
    const created = { ...baseWorkOrder };
    prismaMock.workOrder.create.mockResolvedValue(created);

    const result = await workOrderService.create({
      orderNumber: 'WO-001',
      title: 'Test WO',
      scheduledStart: '2026-06-01T08:00:00Z',
      scheduledEnd: '2026-06-01T16:00:00Z',
      targetQty: 100,
    });

    expect(result.orderNumber).toBe('WO-001');
    const callArg = prismaMock.workOrder.create.mock.calls[0][0];
    expect(callArg.data.scheduledStart).toBeInstanceOf(Date);
    expect(callArg.data.scheduledEnd).toBeInstanceOf(Date);
  });
});
