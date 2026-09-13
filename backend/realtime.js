// realtime.js - Server-Sent Events (SSE) Realtime Broadcaster for PennyWise Web Dashboard
const EventEmitter = require('events');

class RealtimeHub extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // userId -> Set(res)
  }

  // Register a Web client for realtime SSE events
  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(res);

    // Send initial connected handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ message: "Realtime stream established", userId, timestamp: new Date().toISOString() })}\n\n`);

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  // Unregister Web client
  removeClient(userId, res) {
    if (this.clients.has(userId)) {
      const userClients = this.clients.get(userId);
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  // Broadcast event to all open dashboards for a specific user
  broadcast(userId, eventName, payload) {
    if (!this.clients.has(userId)) return;

    const userClients = this.clients.get(userId);
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const res of userClients) {
      try {
        res.write(message);
      } catch (err) {
        console.error("Error sending SSE to client:", err);
      }
    }
  }
}

const realtimeHub = new RealtimeHub();

module.exports = {
  realtimeHub
};
