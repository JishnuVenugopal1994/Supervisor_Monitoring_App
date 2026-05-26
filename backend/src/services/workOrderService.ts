import { Prisma, WorkOrderStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { BadRequestError } from '../errors/BadRequestError';

const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'ON_HOLD'],
  ON_HOLD: ['IN_PROGRESS'],
  COMPLETED: [],
};

export const workOrderService = {
  async list() {
    return prisma.workOrder.findMany({ orderBy: { scheduledStart: 'asc' } });
  },

  async getById(id: string) {
    const workOrder = await prisma.workOrder.findUniqueOrThrow({ where: { id } });
    return workOrder;
  },

  async create(data: {
    orderNumber: string;
    title: string;
    scheduledStart: string;
    scheduledEnd: string;
    targetQty: number;
  }) {
    return prisma.workOrder.create({ data: { ...data, scheduledStart: new Date(data.scheduledStart), scheduledEnd: new Date(data.scheduledEnd) } });
  },

  async update(id: string, data: Partial<{ orderNumber: string; title: string; scheduledStart: string; scheduledEnd: string; targetQty: number }>) {
    const updates: Prisma.WorkOrderUpdateInput = {
      ...data,
      scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
      scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
    };
    return prisma.workOrder.update({ where: { id }, data: updates });
  },

  async transition(id: string, newStatus: WorkOrderStatus) {
    const workOrder = await prisma.workOrder.findUniqueOrThrow({ where: { id } });
    const allowed = ALLOWED_TRANSITIONS[workOrder.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(`Cannot transition from ${workOrder.status} to ${newStatus}`);
    }
    return prisma.workOrder.update({ where: { id }, data: { status: newStatus } });
  },

  async remove(id: string) {
    return prisma.workOrder.delete({ where: { id } });
  },
};
