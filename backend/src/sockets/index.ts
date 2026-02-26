import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

let io: Server;

export function initSocketIO(httpServer: ReturnType<typeof createServer>): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 用戶端連線: ${socket.id}`);

    socket.on('join:event', (eventId: string) => {
      socket.join(eventId);
      console.log(`[Socket] ${socket.id} 加入賽事房間: ${eventId}`);
    });

    socket.on('leave:event', (eventId: string) => {
      socket.leave(eventId);
      console.log(`[Socket] ${socket.id} 離開賽事房間: ${eventId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] 用戶端斷線: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO 尚未初始化');
  return io;
}

// 廣播方法
export const broadcast = {
  actionOpened(eventId: string, data: object) {
    getIO().to(eventId).emit('action:opened', data);
  },
  scoreSubmitted(eventId: string, data: object) {
    getIO().to(eventId).emit('score:submitted', data);
  },
  scoreCalculated(eventId: string, data: object) {
    getIO().to(eventId).emit('score:calculated', data);
  },
  vrSubmitted(eventId: string, data: object) {
    getIO().to(eventId).emit('vr:submitted', data);
  },
  groupChanged(eventId: string, data: object) {
    getIO().to(eventId).emit('group:changed', data);
  },
  roundChanged(eventId: string, data: object) {
    getIO().to(eventId).emit('round:changed', data);
  },
  teamAbstained(eventId: string, data: object) {
    getIO().to(eventId).emit('team:abstained', data);
  },
  teamAbstainCancelled(eventId: string, data: object) {
    getIO().to(eventId).emit('team:abstain-cancelled', data);
  },
};
