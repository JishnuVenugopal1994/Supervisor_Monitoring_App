import { Request, Response } from 'express';
import { z } from 'zod';
import { allocationService } from '../services/allocationService';
import { io } from '../socket';

const CreateAllocationSchema = z.object({
  workOrderId: z.string().cuid(),
  operatorId: z.string().cuid().optional(),
  machineId: z.string().cuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  materials: z
    .array(
      z.object({
        materialId: z.string().cuid(),
        quantityRequired: z.number().positive(),
      })
    )
    .optional()
    .default([]),
});

const UpdateAllocationSchema = z.object({
  workOrderId: z.string().cuid().optional(),
  operatorId: z.string().cuid().nullable().optional(),
  machineId: z.string().cuid().nullable().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  materials: z
    .array(
      z.object({
        materialId: z.string().cuid(),
        quantityRequired: z.number().positive(),
      })
    )
    .optional(),
});

type AllocationWithResources = {
  operator?: { id: string; status: string } | null;
  machine?: { id: string; status: string } | null;
};

function emitResourceStatusEvents(allocation: AllocationWithResources) {
  if (allocation.operator) {
    io.to('shop-floor').emit('resource:statusChanged', {
      type: 'operator',
      id: allocation.operator.id,
      status: allocation.operator.status,
    });
  }
  if (allocation.machine) {
    io.to('shop-floor').emit('resource:statusChanged', {
      type: 'machine',
      id: allocation.machine.id,
      status: allocation.machine.status,
    });
  }
}

export const list = async (req: Request, res: Response): Promise<void> => {
  const { workOrderId, from, to } = req.query as Record<string, string | undefined>;
  const allocations = await allocationService.list({ workOrderId, from, to });
  res.json(allocations);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const allocation = await allocationService.getById(req.params.id);
  res.json(allocation);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = CreateAllocationSchema.parse(req.body);
  const allocation = await allocationService.create(body, req.user!.userId);
  io.to('shop-floor').emit('allocation:created', allocation);
  emitResourceStatusEvents(allocation);
  res.status(201).json(allocation);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const body = UpdateAllocationSchema.parse(req.body);
  const allocation = await allocationService.update(req.params.id, body);
  io.to('shop-floor').emit('allocation:updated', allocation);
  emitResourceStatusEvents(allocation);
  res.json(allocation);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const freed = await allocationService.remove(req.params.id);
  io.to('shop-floor').emit('allocation:deleted', { id: req.params.id });
  if (freed.operatorId) {
    io.to('shop-floor').emit('resource:statusChanged', { type: 'operator', id: freed.operatorId, status: 'AVAILABLE' });
  }
  if (freed.machineId) {
    io.to('shop-floor').emit('resource:statusChanged', { type: 'machine', id: freed.machineId, status: 'AVAILABLE' });
  }
  res.status(204).send();
};
