import { Request, Response } from 'express';
import { z } from 'zod';
import { operatorService } from '../services/operatorService';
import { io } from '../socket';

const CreateSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  skills: z.array(z.string()).default([]),
});

const UpdateSchema = z.object({
  employeeId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  skills: z.array(z.string()).optional(),
});

const StatusSchema = z.object({ status: z.literal('ABSENT') });

export const list = async (req: Request, res: Response): Promise<void> => {
  const { available, from, to } = req.query as Record<string, string | undefined>;
  const operators = await operatorService.list(
    available === 'true' ? { available: true, from, to } : undefined
  );
  res.json(operators);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const operator = await operatorService.getById(req.params.id);
  res.json(operator);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = CreateSchema.parse(req.body);
  const operator = await operatorService.create(body);
  res.status(201).json(operator);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const statusBody = StatusSchema.safeParse(req.body);
  if (statusBody.success) {
    const operator = await operatorService.setStatus(req.params.id, statusBody.data.status);
    io.to('shop-floor').emit('resource:statusChanged', { type: 'operator', id: operator.id, status: operator.status });
    res.json(operator);
    return;
  }
  const body = UpdateSchema.parse(req.body);
  const operator = await operatorService.update(req.params.id, body);
  res.json(operator);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await operatorService.remove(req.params.id);
  res.status(204).send();
};
