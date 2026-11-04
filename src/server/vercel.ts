import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

dotenv.config();

import apiRouter from './api';

const app = express();

// Enable CORS for all domains (Cross-origin frontends, Vercel, Custom Domains, etc.)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get("/api/health", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: "ok", time: new Date() });
});

// Mount router under /api
app.use('/api', apiRouter);

// Fallback mount under / for relative serverless routing
app.use('/', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  next();
}, apiRouter);

// Catch-all for undefined /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Vercel Serverless Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
