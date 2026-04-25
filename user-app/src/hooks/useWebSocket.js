// user-app/src/hooks/useWebSocket.js — Real-time push updates from Gateway
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/^http/, 'ws');

/**
 * Custom hook to connect to the Gateway WebSocket.
 * Subscribes by wallet address and receives txUpdate events.
 *
 * @param {string|null} walletAddress - wallet to subscribe to, or null to disable
 * @returns {{ lastEvent, connected, reconnectCount }}
 */
export default function useWebSocket(walletAddress) {
  const [lastEvent, setLastEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    if (!walletAddress) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Subscribe to our wallet address
        ws.send(JSON.stringify({ type: 'subscribe', walletAddress }));
        console.log(`🔌 WebSocket connected — subscribed to ${walletAddress.slice(0, 10)}…`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'txUpdate') {
            setLastEvent({ ...data, receivedAt: Date.now() });
            console.log('📩 WS txUpdate:', data);
          }
        } catch { /* ignore non-JSON */ }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 3 seconds
        retryRef.current = setTimeout(() => {
          setReconnectCount(c => c + 1);
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available
    }
  }, [walletAddress]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  return { lastEvent, connected, reconnectCount };
}
