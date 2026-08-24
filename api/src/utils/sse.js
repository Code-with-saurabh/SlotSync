const clients = new Map();

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

export function broadcastAll(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  for (const set of clients.values()) {
    for (const client of set) {
      client.write(payload);
    }
  }
}
