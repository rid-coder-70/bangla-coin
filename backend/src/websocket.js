// backend/src/websocket.js — WebSocket server for real-time tx status push
const { WebSocketServer } = require("ws");

// Map: walletAddress (lowercase) → Set<WebSocket>
const subscribers = new Map();

/**
 * Attach a WebSocket server to an existing HTTP server
 * @param {import('http').Server} server
 */
function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    let subscribedAddress = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "subscribe" && msg.walletAddress) {
          const addr = msg.walletAddress.toLowerCase();

          // Remove from old subscription
          if (subscribedAddress && subscribers.has(subscribedAddress)) {
            subscribers.get(subscribedAddress).delete(ws);
          }

          subscribedAddress = addr;

          if (!subscribers.has(addr)) {
            subscribers.set(addr, new Set());
          }
          subscribers.get(addr).add(ws);

          ws.send(JSON.stringify({ type: "subscribed", address: addr }));
        }

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      if (subscribedAddress && subscribers.has(subscribedAddress)) {
        subscribers.get(subscribedAddress).delete(ws);
        if (subscribers.get(subscribedAddress).size === 0) {
          subscribers.delete(subscribedAddress);
        }
      }
    });

    ws.on("error", () => ws.terminate());
  });

  console.log("✅ WebSocket server ready");
  return wss;
}

/**
 * Push a tx status update to all subscribers of a wallet address
 * @param {string} walletAddress
 * @param {object} payload
 */
function notifyTxUpdate(walletAddress, payload) {
  const addr = walletAddress.toLowerCase();
  const subs = subscribers.get(addr);
  if (!subs || subs.size === 0) return;

  const message = JSON.stringify({ type: "txUpdate", ...payload });
  for (const ws of subs) {
    if (ws.readyState === 1) {
      // OPEN
      ws.send(message);
    }
  }
}

/**
 * Broadcast a DAO proposal update to all subscribers of member addresses
 * @param {string[]} memberAddresses
 * @param {object} payload
 */
function notifyDaoUpdate(memberAddresses, payload) {
  const message = JSON.stringify({ type: "daoUpdate", ...payload });
  for (const addr of memberAddresses) {
    const subs = subscribers.get(addr.toLowerCase());
    if (subs) {
      for (const ws of subs) {
        if (ws.readyState === 1) ws.send(message);
      }
    }
  }
}

module.exports = { initWebSocket, notifyTxUpdate, notifyDaoUpdate };
