import { Server, Socket } from "socket.io";
import { createServer } from "http";

let io: Server;

export function initSocketIO(
  httpServer: ReturnType<typeof createServer>,
): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] 用戶端連線: ${socket.id}`);

    socket.on("join:event", (eventId: string) => {
      socket.join(eventId);
      console.log(`[Socket] ${socket.id} 加入賽事房間: ${eventId}`);
    });

    socket.on("leave:event", (eventId: string) => {
      socket.leave(eventId);
      console.log(`[Socket] ${socket.id} 離開賽事房間: ${eventId}`);
    });

    // ── 柔術場次計時器與結束（前端 emit → 後端廣播至房間）──
    socket.on(
      "match:emit-timer",
      (data: {
        eventId: string;
        matchId: string;
        remaining: number;
        paused: boolean;
      }) => {
        io.to(data.eventId).emit("match:timer-updated", {
          matchId: data.matchId,
          remaining: data.remaining,
          paused: data.paused,
        });
      },
    );

    socket.on(
      "match:emit-score",
      (data: {
        eventId: string;
        matchId: string;
        scores: object;
        advantages: object;
        warnings: object;
      }) => {
        io.to(data.eventId).emit("match:score-updated", data);
      },
    );

    socket.on(
      "match:emit-ended",
      (data: {
        eventId: string;
        matchId: string;
        winner: string;
        method: string;
      }) => {
        io.to(data.eventId).emit("match:ended", {
          matchId: data.matchId,
          winner: data.winner,
          method: data.method,
        });
      },
    );

    socket.on(
      "match:emit-started",
      (data: { eventId: string; matchId: string }) => {
        io.to(data.eventId).emit("match:started", { matchId: data.matchId });
      },
    );

    socket.on(
      "match:emit-winner-preview",
      (data: { eventId: string; matchId: string; winner: string }) => {
        io.to(data.eventId).emit("match:winner-preview", {
          matchId: data.matchId,
          winner: data.winner,
        });
      },
    );

    socket.on(
      "match:emit-winner-preview-cancel",
      (data: { eventId: string; matchId: string }) => {
        io.to(data.eventId).emit("match:winner-preview-cancelled", {
          matchId: data.matchId,
        });
      },
    );

    socket.on(
      "match:emit-injury-start",
      (data: {
        eventId: string;
        matchId: string;
        side: string;
        durationSec?: number;
      }) => {
        io.to(data.eventId).emit("injury:started", {
          eventId: data.eventId,
          matchId: data.matchId,
          side: data.side,
          durationSec: data.durationSec,
        });
      },
    );

    socket.on(
      "match:emit-injury-end",
      (data: { eventId: string; matchId: string; side: string }) => {
        io.to(data.eventId).emit("injury:ended", {
          eventId: data.eventId,
          matchId: data.matchId,
          side: data.side,
        });
      },
    );

    socket.on("disconnect", () => {
      console.log(`[Socket] 用戶端斷線: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO 尚未初始化");
  return io;
}

// 廣播方法
export const broadcast = {
  actionOpened(eventId: string, data: object) {
    getIO().to(eventId).emit("action:opened", data);
  },
  scoreSubmitted(eventId: string, data: object) {
    getIO().to(eventId).emit("score:submitted", data);
  },
  scoreCalculated(eventId: string, data: object) {
    getIO().to(eventId).emit("score:calculated", data);
  },
  vrSubmitted(eventId: string, data: object) {
    getIO().to(eventId).emit("vr:submitted", data);
  },
  groupChanged(eventId: string, data: object) {
    getIO().to(eventId).emit("group:changed", data);
  },
  roundChanged(eventId: string, data: object) {
    getIO().to(eventId).emit("round:changed", data);
  },
  teamAbstained(eventId: string, data: object) {
    getIO().to(eventId).emit("team:abstained", data);
  },
  teamAbstainCancelled(eventId: string, data: object) {
    getIO().to(eventId).emit("team:abstain-cancelled", data);
  },
  wrongAttackUpdated(eventId: string, data: object) {
    getIO().to(eventId).emit("wrongAttack:updated", data);
  },
  // 創意演武事件
  creativeScoringOpened(eventId: string, data: object) {
    getIO().to(eventId).emit("creative:scoring-opened", data);
  },
  creativeScoreSubmitted(eventId: string, data: object) {
    getIO().to(eventId).emit("creative-score:submitted", data);
  },
  creativeScoreCalculated(eventId: string, data: object) {
    getIO().to(eventId).emit("creative-score:calculated", data);
  },
  creativeTeamChanged(eventId: string, data: object) {
    getIO().to(eventId).emit("creative:team-changed", data);
  },
  creativeTeamAbstained(eventId: string, data: object) {
    getIO().to(eventId).emit("creative:team-abstained", data);
  },
  creativeTeamAbstainCancelled(eventId: string, data: object) {
    getIO().to(eventId).emit("creative:team-abstain-cancelled", data);
  },
  timerStarted(eventId: string, data: object) {
    getIO().to(eventId).emit("timer:started", data);
  },
  timerStopped(eventId: string, data: object) {
    getIO().to(eventId).emit("timer:stopped", data);
  },
  penaltyUpdated(eventId: string, data: object) {
    getIO().to(eventId).emit("penalty:updated", data);
  },
  // 柔術場次事件（match: 前綴，不與演武事件衝突）
  matchScoreUpdated(eventId: string, data: object) {
    getIO().to(eventId).emit("match:score-updated", data);
  },
  matchTimerUpdated(eventId: string, data: object) {
    getIO().to(eventId).emit("match:timer-updated", data);
  },
  matchEnded(eventId: string, data: object) {
    getIO().to(eventId).emit("match:ended", data);
  },
  matchScoresReset(eventId: string, data: object) {
    getIO().to(eventId).emit("match:scores-reset", data);
  },
  matchFoulUpdated(eventId: string, data: object) {
    getIO().to(eventId).emit("match:foul-updated", data);
  },
  matchFullIppon(eventId: string, data: object) {
    getIO().to(eventId).emit("match:full-ippon", data);
  },
  matchShidoDq(eventId: string, data: object) {
    getIO().to(eventId).emit("match:shido-dq", data);
  },
  matchTimerAdjusted(eventId: string, data: object) {
    getIO().to(eventId).emit("match:timer-adjusted", data);
  },
};
