require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const jsYaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const traceMiddleware = require('./middleware/trace');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const meetingsRoutes = require('./routes/meetings');
const actionItemsRoutes = require('./routes/actionItems');
const { getDb } = require('./db');
const { startReminderJob } = require('./jobs/reminderJob');
const { createLogger } = require('./utils/logger');

const logger = createLogger('APP');
const app = express();
const PORT = process.env.PORT || 3000;

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Trace ID on every request
app.use(traceMiddleware);

// Swagger docs
const swaggerDocument = jsYaml.load(fs.readFileSync(path.join(__dirname, '..', 'docs', 'openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hintro API Docs',
}));

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Evaluation endpoint
app.get('/api/evaluation', (req, res) => {
  res.json({
    traceId: res.locals.traceId,
    success: true,
    data: {
      candidateName: process.env.CANDIDATE_NAME || 'Candidate',
      email: process.env.CANDIDATE_EMAIL || 'candidate@example.com',
      repositoryUrl: process.env.REPO_URL || 'https://github.com/example/hintro',
      deployedUrl: process.env.DEPLOYED_URL || `http://localhost:${PORT}`,
      externalIntegration: 'Discord Webhook',
      features: [
        'JWT Authentication',
        'Meeting Management with Pagination',
        'AI Analysis with Citation Grounding (Groq llama-3.3-70b)',
        'Action Item Tracking',
        'Overdue Detection',
        'Scheduled Reminder Job (node-cron)',
        'Discord Webhook Integration',
        'Unified API Response Format',
        'Request Trace IDs',
        'Structured Logging',
        'Input Validation',
        'Global Error Handling',
        'OpenAPI/Swagger Documentation',
        'SQLite via sql.js',
      ],
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/action-items', actionItemsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    traceId: res.locals.traceId,
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

async function start() {
  await getDb(); // Initialize DB
  logger.info('Database initialized');

  startReminderJob();
  logger.info('Reminder job scheduled');

  app.listen(PORT, () => {
    logger.info(`Hintro API running`, { port: PORT, docs: `http://localhost:${PORT}/api-docs` });
  });
}

start().catch(err => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});

module.exports = app;
