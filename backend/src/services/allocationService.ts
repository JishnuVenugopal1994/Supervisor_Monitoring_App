import prisma, { TxClient } from '../lib/prisma';
import { ConflictError } from '../errors/ConflictError';

interface MaterialInput {
  materialId: string;
  quantityRequired: number;
}

interface CreateAllocationInput {
  workOrderId: string;
  operatorId?: string;
  machineId?: string;
  startTime: string;
  endTime: string;
  materials: MaterialInput[];
}

interface UpdateAllocationInput {
  workOrderId?: string;
  operatorId?: string | null;
  machineId?: string | null;
  startTime?: string;
  endTime?: string;
  materials?: MaterialInput[];
}

const allocationInclude = {
  operator: true,
  machine: true,
  materials: { include: { material: true } },
  workOrder: true,
};

async function checkResourceOverlap(
  tx: TxClient,
  field: 'operatorId' | 'machineId',
  resourceId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string
) {
  const conflict = await tx.allocation.findFirst({
    where: {
      [field]: resourceId,
      id: excludeId ? { not: excludeId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });
  if (conflict) {
    const code = field === 'operatorId' ? 'OPERATOR_CONFLICT' : 'MACHINE_CONFLICT';
    throw new ConflictError(code, [
      { allocationId: conflict.id, startTime: conflict.startTime, endTime: conflict.endTime },
    ]);
  }
}

async function checkMaterialStock(tx: TxClient, materials: MaterialInput[]) {
  await Promise.all(
    materials.map(async (m) => {
      const material = await tx.material.findUniqueOrThrow({ where: { id: m.materialId } });
      if (material.quantityOnHand < m.quantityRequired) {
        throw new ConflictError('INSUFFICIENT_STOCK', [
          { materialId: m.materialId, name: material.name, available: material.quantityOnHand, required: m.quantityRequired },
        ]);
      }
    })
  );
}

export const allocationService = {
  async list(filters?: { workOrderId?: string; from?: string; to?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.workOrderId) where.workOrderId = filters.workOrderId;
    if (filters?.from && filters?.to) {
      where.startTime = { lt: new Date(filters.to) };
      where.endTime = { gt: new Date(filters.from) };
    }
    return prisma.allocation.findMany({ where, include: allocationInclude, orderBy: { startTime: 'asc' } });
  },

  async getById(id: string) {
    return prisma.allocation.findUniqueOrThrow({ where: { id }, include: allocationInclude });
  },

  async create(data: CreateAllocationInput, createdById: string) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    return prisma.$transaction(async (tx: TxClient) => {
      if (data.operatorId) {
        await checkResourceOverlap(tx, 'operatorId', data.operatorId, startTime, endTime);
      }
      if (data.machineId) {
        await checkResourceOverlap(tx, 'machineId', data.machineId, startTime, endTime);
      }
      if (data.materials.length > 0) {
        await checkMaterialStock(tx, data.materials);
      }

      // Decrement material stock in parallel
      await Promise.all(
        data.materials.map((m) =>
          tx.material.update({
            where: { id: m.materialId },
            data: { quantityOnHand: { decrement: m.quantityRequired } },
          })
        )
      );

      // Update resource statuses
      if (data.operatorId) {
        await tx.operator.update({ where: { id: data.operatorId }, data: { status: 'ASSIGNED' } });
      }
      if (data.machineId) {
        await tx.machine.update({ where: { id: data.machineId }, data: { status: 'RUNNING' } });
      }

      const allocation = await tx.allocation.create({
        data: {
          workOrderId: data.workOrderId,
          operatorId: data.operatorId,
          machineId: data.machineId,
          startTime,
          endTime,
          createdById,
          materials: {
            create: data.materials.map((m) => ({
              materialId: m.materialId,
              quantityRequired: m.quantityRequired,
            })),
          },
        },
        include: allocationInclude,
      });

      return allocation;
    });
  },

  async update(id: string, data: UpdateAllocationInput) {
    const existing = await prisma.allocation.findUniqueOrThrow({
      where: { id },
      include: { materials: true },
    });

    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
    const operatorId = 'operatorId' in data ? data.operatorId : existing.operatorId;
    const machineId = 'machineId' in data ? data.machineId : existing.machineId;

    return prisma.$transaction(async (tx: TxClient) => {
      if (operatorId) {
        await checkResourceOverlap(tx, 'operatorId', operatorId, startTime, endTime, id);
      }
      if (machineId) {
        await checkResourceOverlap(tx, 'machineId', machineId, startTime, endTime, id);
      }

      // Handle material changes
      if (data.materials !== undefined) {
        // Restore old material stock in parallel
        await Promise.all(
          existing.materials.map((m) =>
            tx.material.update({
              where: { id: m.materialId },
              data: { quantityOnHand: { increment: m.quantityRequired } },
            })
          )
        );
        // Check and decrement new material stock in parallel
        await checkMaterialStock(tx, data.materials);
        await Promise.all(
          data.materials.map((m) =>
            tx.material.update({
              where: { id: m.materialId },
              data: { quantityOnHand: { decrement: m.quantityRequired } },
            })
          )
        );
        await tx.allocationMaterial.deleteMany({ where: { allocationId: id } });
      }

      // Handle operator status transitions
      if ('operatorId' in data && data.operatorId !== existing.operatorId) {
        if (existing.operatorId) {
          const remaining = await tx.allocation.count({
            where: { operatorId: existing.operatorId, id: { not: id } },
          });
          if (remaining === 0) {
            await tx.operator.update({ where: { id: existing.operatorId }, data: { status: 'AVAILABLE' } });
          }
        }
        if (data.operatorId) {
          await tx.operator.update({ where: { id: data.operatorId }, data: { status: 'ASSIGNED' } });
        }
      }

      // Handle machine status transitions
      if ('machineId' in data && data.machineId !== existing.machineId) {
        if (existing.machineId) {
          const remaining = await tx.allocation.count({
            where: { machineId: existing.machineId, id: { not: id } },
          });
          if (remaining === 0) {
            await tx.machine.update({ where: { id: existing.machineId }, data: { status: 'AVAILABLE' } });
          }
        }
        if (data.machineId) {
          await tx.machine.update({ where: { id: data.machineId }, data: { status: 'RUNNING' } });
        }
      }

      const allocation = await tx.allocation.update({
        where: { id },
        data: {
          workOrderId: data.workOrderId,
          operatorId,
          machineId,
          startTime,
          endTime,
          ...(data.materials !== undefined && {
            materials: {
              create: data.materials.map((m) => ({
                materialId: m.materialId,
                quantityRequired: m.quantityRequired,
              })),
            },
          }),
        },
        include: allocationInclude,
      });

      return allocation;
    });
  },

  async remove(id: string) {
    const existing = await prisma.allocation.findUniqueOrThrow({
      where: { id },
      include: { materials: true },
    });

    return prisma.$transaction(async (tx: TxClient) => {
      // Restore material stock in parallel
      await Promise.all(
        existing.materials.map((m) =>
          tx.material.update({
            where: { id: m.materialId },
            data: { quantityOnHand: { increment: m.quantityRequired } },
          })
        )
      );

      // Restore operator status if no other active allocations remain
      if (existing.operatorId) {
        const remaining = await tx.allocation.count({
          where: { operatorId: existing.operatorId, id: { not: id } },
        });
        if (remaining === 0) {
          await tx.operator.update({ where: { id: existing.operatorId }, data: { status: 'AVAILABLE' } });
        }
      }

      // Restore machine status if no other active allocations remain
      if (existing.machineId) {
        const remaining = await tx.allocation.count({
          where: { machineId: existing.machineId, id: { not: id } },
        });
        if (remaining === 0) {
          await tx.machine.update({ where: { id: existing.machineId }, data: { status: 'AVAILABLE' } });
        }
      }

      await tx.allocation.delete({ where: { id } });

      return {
        operatorId: existing.operatorId,
        machineId: existing.machineId,
      };
    });
  },
};
