import { Request, Response } from 'express';
import { z } from 'zod';
import { workOrderService } from '../services/workOrderService';
import { io } from '../socket';

const CreateSchema = z.object({
  orderNumber: z.string().min(1),
  title: z.string().min(1),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  targetQty: z.number().int().positive(),
});

const UpdateSchema = CreateSchema.partial();

const TransitionSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']),
});

export const list = async (_req: Request, res: Response): Promise<void> => {
  const workOrders = await workOrderService.list();
  res.json(workOrders);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const workOrder = await workOrderService.getById(req.params.id);
  res.json(workOrder);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = CreateSchema.parse(req.body);
  const workOrder = await workOrderService.create(body);
  res.status(201).json(workOrder);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const body = UpdateSchema.parse(req.body);
  const workOrder = await workOrderService.update(req.params.id, body);
  res.json(workOrder);
};

export const transition = async (req: Request, res: Response): Promise<void> => {
  const { status } = TransitionSchema.parse(req.body);
  const workOrder = await workOrderService.transition(req.params.id, status);
  io.to('shop-floor').emit('workOrder:statusChanged', { id: workOrder.id, status: workOrder.status });
  res.json(workOrder);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await workOrderService.remove(req.params.id);
  res.status(204).send();
};
