import { Server } from "socket.io";

let io = null;

export function initSocketIO(httpServer) {
  const allowedOrigins = [
    process.env.CORS_ORIGIN || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id);
    socket.join("global");

    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Client disconnected:", socket.id, reason);
      socket.leave("global");
    });
  });

  console.log("[Socket.IO] Server initialized on path /socket.io");
  return io;
}

export function getIO() {
  return io;
}

export function emitSlotUpdated(data) {
  if (!io) {
    console.warn("[Socket.IO] emitSlotUpdated called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting slot:updated ->", data.slotId, "version:", data.version);
  io.to("global").emit("slot:updated", data);
}

export function emitSlotCreated(data) {
  if (!io) {
    console.warn("[Socket.IO] emitSlotCreated called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting slot:created ->", data.slotId);
  io.to("global").emit("slot:created", data);
}

export function emitBookingCreated(data) {
  if (!io) {
    console.warn("[Socket.IO] emitBookingCreated called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting booking:created ->", data.bookingId);
  io.to("global").emit("booking:created", data);
}

export function emitBookingCancelled(data) {
  if (!io) {
    console.warn("[Socket.IO] emitBookingCancelled called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting booking:cancelled ->", data.bookingId);
  io.to("global").emit("booking:cancelled", data);
}

export function emitBookingPromoted(data) {
  if (!io) {
    console.warn("[Socket.IO] emitBookingPromoted called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting booking:promoted ->", data.bookingId);
  io.to("global").emit("booking:promoted", data);
}

export function emitBookingOutcomeSet(data) {
  if (!io) {
    console.warn("[Socket.IO] emitBookingOutcomeSet called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting booking:outcome ->", data.bookingId);
  io.to("global").emit("booking:outcome", data);
}

export function emitWaitlistJoined(data) {
  if (!io) {
    console.warn("[Socket.IO] emitWaitlistJoined called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting waitlist:joined ->", data.entryId);
  io.to("global").emit("waitlist:joined", data);
}

export function emitWaitlistLeft(data) {
  if (!io) {
    console.warn("[Socket.IO] emitWaitlistLeft called but io is null");
    return;
  }
  console.log("[Socket.IO] Emitting waitlist:left ->", data.entryId);
  io.to("global").emit("waitlist:left", data);
}
