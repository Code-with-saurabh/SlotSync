import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

/*
 * Socket.IO singleton — one connection for the
 * entire app, shared across all components.
 */
const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "");

let socket = null;
let refCount = 0;

function getSocket() {
  if (socket) return socket;

  console.log("[Socket.IO] Creating connection to:", SOCKET_URL);

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    path: "/socket.io",
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("[Socket.IO] Connected! id:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket.IO] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket.IO] Connection error:", err.message);
  });

  return socket;
}

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    refCount += 1;
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    if (s.connected) setIsConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      refCount -= 1;
      if (refCount <= 0) {
        refCount = 0;
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        setIsConnected(false);
      }
    };
  }, []);

  const on = useCallback((event, handler) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, []);

  return { socket: socketRef.current, on, isConnected };
}
