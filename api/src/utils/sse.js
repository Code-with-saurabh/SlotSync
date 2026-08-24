/*
 * SSE client manager.
 *
 * Supports two modes:
 *   1. Per-slot clients (legacy) – stored in `clients` Map
 *   2. Global broadcast clients – stored in `globalClients` Set
 *
 * Global clients receive every slot update.
 * The frontend uses ONE global connection instead of
 * N per-slot connections, avoiding browser connection-pool
 * exhaustion (HTTP/1.1 limits to 6 per origin).
 */

const clients = new Map();
const globalClients = new Set();

/* ---- per-slot (kept for backwards compat) ---- */

export function addClient(slotId, req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(":\n\n");

  if (!clients.has(slotId)) {
    clients.set(slotId, new Set());
  }

  clients.get(slotId).add(res);

  req.on("close", () => {
    const set = clients.get(slotId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        clients.delete(slotId);
      }
    }
  });
}

export function broadcastToSlot(slotId, data) {
  const set = clients.get(slotId);
  if (!set) return;

  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of set) {
    client.write(payload);
  }
}

/* ---- global broadcast ---- */

export function addGlobalClient(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(":\n\n");

  globalClients.add(res);

  req.on("close", () => {
    globalClients.delete(res);
  });
}

export function broadcastAll(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const client of globalClients) {
    client.write(payload);
  }

  for (const set of clients.values()) {
    for (const client of set) {
      client.write(payload);
    }
  }
}
