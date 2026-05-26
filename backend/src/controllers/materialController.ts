import { Request, Response } from 'express';
import { z } from 'zod';
import { materialService } from '../services/materialService';

const CreateSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unitOfMeasure: z.string().min(1),
  quantityOnHand: z.number().nonnegative(),
});

const UpdateSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  unitOfMeasure: z.string().min(1).optional(),
});

const QuantitySchema = z.object({ quantityOnHand: z.number().nonnegative() });

export const list = async (_req: Request, res: Response): Promise<void> => {
  const materials = await materialService.list();
  res.json(materials);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const material = await materialService.getById(req.params.id);
  res.json(material);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = CreateSchema.parse(req.body);
  const material = await materialService.create(body);
  res.status(201).json(material);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const quantityBody = QuantitySchema.safeParse(req.body);
  if (quantityBody.success) {
    const material = await materialService.setQuantity(req.params.id, quantityBody.data.quantityOnHand);
    res.json(material);
    return;
  }
  const body = UpdateSchema.parse(req.body);
  const material = await materialService.update(req.params.id, body);
  res.json(material);
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await materialService.remove(req.params.id);
  res.status(204).send();
};
