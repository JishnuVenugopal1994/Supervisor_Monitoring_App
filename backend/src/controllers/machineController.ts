import { Request, Response } from 'express';
import { z } from 'zod';
import { machineService } from '../services/machineService';
import { io } from '../socket';

const CreateSchema = z.object({
  machineCode: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
});

const UpdateSchema = z.object({
  machineCode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
});

const StatusSchema = z.object({ status: z.literal('MAINTENANCE') });

export const list = async (req: Request, res: Response): Promise<void> => {
  const { available, from, to } = req.query as Record<string, string | undefined>;
  const machines = await machineService.list(
    available === 'true' ? { available: true, from, to } : undefined
  );
  res.json(machines);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const machine = await machineService.getById(req.params.id);
  res.json(machine);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = CreateSchema.parse(req.body);
  const machine = await machineService.create(body);
  res.status(201).json(machine);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const statusBody = StatusSchema.safeParse(req.body);
  if (statusBody.success) {
    const machine = await machineService.setStatus(req.params.id, statusBody.data.status);
    io.to('shop-floor').emit('resource:statusChanged', { type: 'machine', id: machine.id, status: machine.status });
    res.json(machine);
    return;
  }
  const body = UpdateSchema.parse(req.body);
  const machine = await machineService.update(req.params.id, body);
  res.json(machine);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await machineService.remove(req.params.id);
  res.status(204).send();
};
