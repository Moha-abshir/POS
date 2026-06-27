import * as dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit';
import authRoutes from './modules/auth/auth.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import usersRoutes from './modules/users/users.routes';
import suppliersRoutes from './modules/suppliers/suppliers.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import purchasingRoutes from './modules/purchasing/purchasing.routes';
import customersRoutes from './modules/customers/customers.routes';
import salesRoutes from './modules/sales/sales.routes';
import mpesaRoutes from './modules/mpesa/mpesa.routes';
import reportsRoutes from './modules/reports/reports.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import cashSessionsRoutes from './modules/cash-sessions/cash-sessions.routes';
import importRoutes from './modules/import/import.routes';
import exportRoutes from './modules/export/export.routes';
import uploadRoutes from './modules/upload/upload.routes';
import adminRoutes from './modules/admin/admin.routes';
import { errorHandler } from './core/middleware/errorHandler';
import { authenticate, requireActiveBusiness } from './core/middleware/auth';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  PORT: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
});

envSchema.parse(process.env);

const app = express();
app.set('trust proxy', 1); // Trust the first proxy (Railway's load balancer)
const PORT = process.env.PORT || 5000;

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // limit each IP to 3000 requests per windowMs
});
app.use(limiter);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://pos-abshir.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/catalog', authenticate, requireActiveBusiness, catalogRoutes);
app.use('/users', authenticate, requireActiveBusiness, usersRoutes);
app.use('/suppliers', authenticate, requireActiveBusiness, suppliersRoutes);
app.use('/inventory', authenticate, requireActiveBusiness, inventoryRoutes);
app.use('/purchases', authenticate, requireActiveBusiness, purchasingRoutes);
app.use('/customers', authenticate, requireActiveBusiness, customersRoutes);
app.use('/sales', authenticate, requireActiveBusiness, salesRoutes);
app.use('/mpesa', mpesaRoutes);
app.use('/reports', authenticate, requireActiveBusiness, reportsRoutes);
app.use('/dashboard', authenticate, requireActiveBusiness, dashboardRoutes);
app.use('/notifications', authenticate, requireActiveBusiness, notificationsRoutes);
app.use('/cash-sessions', authenticate, requireActiveBusiness, cashSessionsRoutes);
app.use('/import', authenticate, requireActiveBusiness, importRoutes);
app.use('/export', authenticate, requireActiveBusiness, exportRoutes);
app.use('/upload', authenticate, requireActiveBusiness, uploadRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
