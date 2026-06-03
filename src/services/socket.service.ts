import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const origin = process.env.APP_URL || "http://localhost:5173";
  io = new SocketIOServer(httpServer, {
    cors: {
      origin,
      methods: ["GET", "POST", "PUT", "DELETE"]
    },
    transports: ["websocket", "polling"]
  });

  io.on("connection", (socket) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Socket.io] client connected: ${socket.id}`);
    }
    socket.on("disconnect", () => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Socket.io] client disconnected: ${socket.id}`);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
