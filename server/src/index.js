import 'dotenv/config';
import http from 'node:http';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { commerceRouter } from './routes/commerce.js';
import { adminRouter } from './routes/admin.js';

const app = express();
const clientBuildPath = path.resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../client/dist'
);
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET});
const server = http.createServer(app);
 const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

export const io = new Server(server, {
  cors: process.env.NODE_ENV === 'production'
    ? { origin: false }
    : {
        origin: allowedOrigin,
        credentials: true
      }
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "https://checkout.razorpay.com"
      ],
      "img-src": [
        "'self'",
        "data:",
        "https://images.unsplash.com",
        "https://res.cloudinary.com"
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'"
      ],
      "connect-src": [
        "'self'",
        "wss:"
      ]
    }
  }
}));
if (process.env.NODE_ENV === 'production') {
  // Same-origin requests do not require CORS headers.
  // Do not enable cross-origin credentialed requests.
} else {
  app.use(cors({
    origin: allowedOrigin,
    credentials: true
  }));
}
app.use(express.json({ limit: '8mb' })); app.use(cookieParser());
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/auth', authRouter); app.use('/api', catalogRouter); app.use('/api', commerceRouter); app.use('/api/admin', adminRouter);
app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  res.sendFile(
    path.join(clientBuildPath, 'index.html'),
    err => {
      if (err) next(err);
    }
  );
});
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' }); });
const port = process.env.PORT || 5000;
if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing!");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        server.listen(port, () => {
            console.log(`Quicktronics API listening on ${port}`);
        });
    })
    .catch(err => {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    });