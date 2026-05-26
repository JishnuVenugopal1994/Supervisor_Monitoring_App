import { OperatorStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export const operatorService = {
  async list(filters?: { available?: boolean; from?: string; to?: string }) {
    if (filters?.available && filters.from && filters.to) {
      const from = new Date(filters.from);
      const to = new Date(filters.to);
      return prisma.operator.findMany({
        where: {
          status: { not: 'ABSENT' },
          NOT: {
            allocations: {
              some: { startTime: { lt: to }, endTime: { gt: from } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }
    return prisma.operator.findMany({ orderBy: { name: 'asc' } });
  },

  async getById(id: string) {
    return prisma.operator.findUniqueOrThrow({ where: { id } });
  },

  async create(data: { employeeId: string; name: string; skills: string[] }) {
    return prisma.operator.create({ data });
  },

  async update(id: string, data: Partial<{ employeeId: string; name: string; skills: string[] }>) {
    return prisma.operator.update({ where: { id }, data });
  },

  async setStatus(id: string, status: 'ABSENT') {
    return prisma.operator.update({ where: { id }, data: { status } });
  },

  async remove(id: string) {
    return prisma.operator.delete({ where: { id } });
  },
};
