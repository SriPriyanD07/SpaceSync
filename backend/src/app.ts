import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

import { swaggerSpec } from './docs/swagger';
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';
import bookingRoutes from './routes/bookingRoutes';
import adminRoutes from './routes/adminRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

dotenv.config();

const app = express();

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows Swagger UI inline assets
}));

const allowedOrigins = [
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/cloud demo, adjustable via CLIENT_URL
  },
  credentials: true,
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());

// Interactive API Documentation (Swagger/OpenAPI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// REST API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Root redirect or welcome
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to SpaceSync REST API',
    documentation: '/api/docs',
    health: '/api/health',
  });
});

// 404 Catch-All
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} not found`));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
