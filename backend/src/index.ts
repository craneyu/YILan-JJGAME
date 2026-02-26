import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { initSocketIO } from './sockets/index';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import teamRoutes from './routes/teams';
import scoreRoutes from './routes/scores';
import vrScoreRoutes from './routes/vrScores';
import flowRoutes from './routes/flow';

const app = express();
const httpServer = createServer(app);

// 初始化 Socket.IO
initSocketIO(httpServer);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/events/:id/teams', teamRoutes);
app.use('/api/v1/scores', scoreRoutes);
app.use('/api/v1/vr-scores', vrScoreRoutes);
app.use('/api/v1/flow', flowRoutes);

// 健康檢查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 全域錯誤處理
app.use(errorHandler);

// MongoDB 連線
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jju';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB] 已連線');

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] 已啟動，監聽 http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[MongoDB] 連線失敗：', err);
    process.exit(1);
  }
}

bootstrap();
