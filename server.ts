import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

import apiRouter from './src/server/api';
import { sitemapHandler, robotsHandler } from './src/server/sitemap';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // High-performance gzip/deflate compression
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      if (req.headers['upgrade'] === 'websocket') return false;
      // In dev mode, let Vite middleware stream modules directly without compression overhead
      if (process.env.NODE_ENV !== 'production' && (req.path.startsWith('/@') || req.path.startsWith('/node_modules') || req.path.startsWith('/src/'))) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Enable CORS for all domains (Cross-origin frontends, Vercel, Custom Domains, etc.)
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }));

  app.use(cookieParser());

  // Body parser middlewares
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API routes go here FIRST
  app.get("/api/health", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({ status: "ok", time: new Date() });
  });

  // Mount SMM API Router
  app.use('/api', apiRouter);

  // Catch-all for undefined /api/* routes so they NEVER fall through to HTML/Vite
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
  });

  // Global Error Handler for /api/* requests
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('[API Handler Error]', err);
      res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
      return;
    }
    next(err);
  });

  // SEO Dynamic Sitemap & Robots.txt Routes
  app.get('/sitemap.xml', sitemapHandler);
  app.get('/robots.txt', robotsHandler);

  // Static assets serving with explicit favicon & PWA icon caching
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.ico')) {
        res.setHeader('Content-Type', 'image/x-icon');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else if (filePath.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // Vite middleware setup for assets/front-end rendering
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack SMM Panel Server running on port ${PORT}`);
  });
}

startServer();
