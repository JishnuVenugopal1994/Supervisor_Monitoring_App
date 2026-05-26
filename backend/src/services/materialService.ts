import prisma from '../lib/prisma';

export const materialService = {
  async list() {
    return prisma.material.findMany({ orderBy: { name: 'asc' } });
  },

  async getById(id: string) {
    return prisma.material.findUniqueOrThrow({ where: { id } });
  },

  async create(data: { sku: string; name: string; unitOfMeasure: string; quantityOnHand: number }) {
    return prisma.material.create({ data });
  },

  async update(id: string, data: Partial<{ sku: string; name: string; unitOfMeasure: string }>) {
    return prisma.material.update({ where: { id }, data });
  },

  async setQuantity(id: string, quantityOnHand: number) {
    if (quantityOnHand < 0) throw new Error('quantityOnHand cannot be negative');
    return prisma.material.update({ where: { id }, data: { quantityOnHand } });
  },

  async remove(id: string) {
    return prisma.material.delete({ where: { id } });
  },
};
