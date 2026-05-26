import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import authRouter from './routes/auth';
import workOrdersRouter from './routes/workOrders';
import operatorsRouter from './routes/operators';
import machinesRouter from './routes/machines';
import materialsRouter from './routes/materials';
import allocationsRouter from './routes/allocations';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/work-orders', workOrdersRouter);
app.use('/api/operators', operatorsRouter);
app.use('/api/machines', machinesRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/allocations', allocationsRouter);

app.use(errorHandler);

export { app };
