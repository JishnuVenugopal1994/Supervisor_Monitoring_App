import { MachineStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export const machineService = {
  async list(filters?: { available?: boolean; from?: string; to?: string }) {
    if (filters?.available && filters.from && filters.to) {
      const from = new Date(filters.from);
      const to = new Date(filters.to);
      return prisma.machine.findMany({
        where: {
          status: { not: 'MAINTENANCE' },
          NOT: {
            allocations: {
              some: { startTime: { lt: to }, endTime: { gt: from } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }
    return prisma.machine.findMany({ orderBy: { name: 'asc' } });
  },

  async getById(id: string) {
    return prisma.machine.findUniqueOrThrow({ where: { id } });
  },

  async create(data: { machineCode: string; name: string; type: string }) {
    return prisma.machine.create({ data });
  },

  async update(id: string, data: Partial<{ machineCode: string; name: string; type: string }>) {
    return prisma.machine.update({ where: { id }, data });
  },

  async setStatus(id: string, status: 'MAINTENANCE') {
    return prisma.machine.update({ where: { id }, data: { status } });
  },

  async remove(id: string) {
    return prisma.machine.delete({ where: { id } });
  },
};
