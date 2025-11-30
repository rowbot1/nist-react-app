import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { prisma } from './prisma';
import winston from 'winston';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import systemRoutes from './routes/systems';
import csfRoutes from './routes/csf';
import nist80053Routes from './routes/nist80053';
import assessmentRoutes from './routes/assessments';
import exportRoutes from './routes/export';
import analyticsRoutes from './routes/analytics';
import evidenceRoutes from './routes/evidence';
import frameworkRoutes from './routes/frameworks';
import capabilityCentreRoutes from './routes/capabilityCentres';
import baselineRoutes from './routes/baselines';
import auditRoutes from './routes/audit';
import remediationRoutes from './routes/remediation';
import commentsRoutes from './routes/comments';
import assignmentsRoutes from './routes/assignments';
import templatesRoutes from './routes/templates';
import reportsRoutes from './routes/reports';
import riskRoutes from './routes/risk';
import complianceRoutes from './routes/compliance';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware, requireRole } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'posture' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN || 'http://107.173.250.161']
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, requireRole(['USER', 'ADMIN']), productRoutes);
app.use('/api/systems', authMiddleware, requireRole(['USER', 'ADMIN']), systemRoutes);
app.use('/api/csf', authMiddleware, requireRole(['USER', 'ADMIN', 'AUDITOR']), csfRoutes);
app.use('/api/nist80053', authMiddleware, requireRole(['USER', 'ADMIN', 'AUDITOR']), nist80053Routes);
app.use('/api/assessments', authMiddleware, requireRole(['USER', 'ADMIN']), assessmentRoutes);
app.use('/api/export', authMiddleware, requireRole(['USER', 'ADMIN', 'AUDITOR']), exportRoutes);
app.use('/api/analytics', authMiddleware, requireRole(['ADMIN', 'AUDITOR']), analyticsRoutes);
app.use('/api/evidence', authMiddleware, requireRole(['USER', 'ADMIN']), evidenceRoutes);
app.use('/api/frameworks', authMiddleware, requireRole(['USER', 'ADMIN']), frameworkRoutes);
app.use('/api/capability-centres', authMiddleware, requireRole(['USER', 'ADMIN']), capabilityCentreRoutes);
app.use('/api/baselines', authMiddleware, requireRole(['USER', 'ADMIN']), baselineRoutes);
app.use('/api/audit', authMiddleware, requireRole(['ADMIN', 'AUDITOR']), auditRoutes);
app.use('/api/remediation', authMiddleware, requireRole(['USER', 'ADMIN']), remediationRoutes);
app.use('/api/comments', authMiddleware, requireRole(['USER', 'ADMIN']), commentsRoutes);
app.use('/api/assignments', authMiddleware, requireRole(['USER', 'ADMIN']), assignmentsRoutes);
app.use('/api/templates', authMiddleware, requireRole(['USER', 'ADMIN']), templatesRoutes);
app.use('/api/reports', authMiddleware, requireRole(['ADMIN', 'AUDITOR']), reportsRoutes);
app.use('/api/risk', authMiddleware, requireRole(['ADMIN', 'USER']), riskRoutes);
app.use('/api/compliance', authMiddleware, requireRole(['USER', 'ADMIN', 'AUDITOR']), complianceRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/build');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
