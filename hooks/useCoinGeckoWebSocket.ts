'use client';

import { useEffect, useRef, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL;
const WS_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const IS_DEMO_KEY = Boolean(WS_KEY?.startsWith('CG-'));
const IS_WS_CONFIGURED = Boolean(WS_URL && WS_KEY);
const WS_AUTH_PARAM = IS_DEMO_KEY ? 'x_cg_demo_api_key' : 'x_cg_pro_api_key';
const WS_BASE = IS_WS_CONFIGURED ? `${WS_URL}?${WS_AUTH_PARAM}=${WS_KEY}` : null;

export const useCoinGeckoWebSocket = ({
  coinId,
  poolId,
  liveInterval,
}: UseCoinGeckoWebSocketProps): UseCoinGeckoWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const subscribed = useRef(<Set<string>>new Set());

  const [price, setPrice] = useState<ExtendedPriceData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCData | null>(null);

  const [isWsReady, setIsWsReady] = useState(false);
  const [status, setStatus] = useState<
    'unsupported' | 'misconfigured' | 'connecting' | 'connected' | 'closed'
  >(() => {
    if (!IS_WS_CONFIGURED) return 'misconfigured';
    if (IS_DEMO_KEY) return 'unsupported';
    return 'connecting';
  });
  const [statusMessage, setStatusMessage] = useState(() => {
    if (!IS_WS_CONFIGURED) {
      return 'Live updates are disabled because NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL is missing.';
    }

    if (IS_DEMO_KEY) {
      return 'Live updates are unavailable with the current CoinGecko demo key. WebSocket access requires a paid CoinGecko plan.';
    }

    return 'Connecting to CoinGecko live stream...';
  });

  useEffect(() => {
    if (!WS_BASE) {
      setIsWsReady(false);
      setStatus('misconfigured');
      setStatusMessage(
        'Live updates are disabled because NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL is missing.',
      );
      return;
    }

    if (IS_DEMO_KEY) {
      setIsWsReady(false);
      setStatus('unsupported');
      setStatusMessage(
        'Live updates are unavailable with the current CoinGecko demo key. WebSocket access requires a paid CoinGecko plan.',
      );
      return;
    }

    setStatus('connecting');
    setStatusMessage('Connecting to CoinGecko live stream...');

    const ws = new WebSocket(WS_BASE);
    wsRef.current = ws;

    const send = (payload: Record<string, unknown>) => ws.send(JSON.stringify(payload));

    const handleMessage = (event: MessageEvent) => {
      const msg: WebSocketMessage = JSON.parse(event.data);

      if (msg.type === 'ping') {
        send({ type: 'pong' });
        return;
      }
      if (msg.type === 'confirm_subscription') {
        const { channel } = JSON.parse(msg?.identifier ?? '');

        subscribed.current.add(channel);
      }
      if (msg.c === 'C1') {
        setPrice({
          usd: msg.p ?? 0,
          coin: msg.i,
          price: msg.p,
          change24h: msg.pp,
          marketCap: msg.m,
          volume24h: msg.v,
          timestamp: msg.t,
        });
      }
      if (msg.c === 'G2') {
        const newTrade: Trade = {
          price: msg.pu,
          value: msg.vo,
          timestamp: msg.t ?? 0,
          type: msg.ty,
          amount: msg.to,
        };

        setTrades((prev) => [newTrade, ...prev].slice(0, 7));
      }
      if (msg.ch === 'G3') {
        const timestamp = msg.t ?? 0;

        const candle: OHLCData = [
          timestamp,
          Number(msg.o ?? 0),
          Number(msg.h ?? 0),
          Number(msg.l ?? 0),
          Number(msg.c ?? 0),
        ];

        setOhlcv(candle);
      }
    };

    ws.onopen = () => {
      setIsWsReady(true);
      setStatus('connected');
      setStatusMessage('Connected to CoinGecko live stream.');
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setIsWsReady(false);
      setStatus('closed');
      setStatusMessage('CoinGecko live stream disconnected.');
    };

    ws.onerror = () => {
      setIsWsReady(false);
      setStatus('closed');
      setStatusMessage('Unable to establish the CoinGecko live stream connection.');
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!isWsReady) return;
    const ws = wsRef.current;
    if (!ws) return;

    const send = (payload: Record<string, unknown>) => ws.send(JSON.stringify(payload));

    const unsubscribeAll = () => {
      subscribed.current.forEach((channel) => {
        send({
          command: 'unsubscribe',
          identifier: JSON.stringify({ channel }),
        });
      });

      subscribed.current.clear();
    };

    const subscribe = (channel: string, data?: Record<string, unknown>) => {
      if (subscribed.current.has(channel)) return;

      send({ command: 'subscribe', identifier: JSON.stringify({ channel }) });

      if (data) {
        send({
          command: 'message',
          identifier: JSON.stringify({ channel }),
          data: JSON.stringify(data),
        });
      }
    };

    queueMicrotask(() => {
      setPrice(null);
      setTrades([]);
      setOhlcv(null);

      unsubscribeAll();

      subscribe('CGSimplePrice', { coin_id: [coinId], action: 'set_tokens' });
    });

    const poolAddress = poolId.replace('_', ':') ?? '';

    if (poolAddress) {
      subscribe('OnchainTrade', {
        'network_id:pool_addresses': [poolAddress],
        action: 'set_pools',
      });

      subscribe('OnchainOHLCV', {
        'network_id:pool_addresses': [poolAddress],
        interval: liveInterval,
        action: 'set_pools',
      });
    }
  }, [coinId, poolId, isWsReady, liveInterval]);

  return {
    price,
    trades,
    ohlcv,
    isConnected: isWsReady,
    status,
    statusMessage,
  };
};
