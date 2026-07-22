import { WS_URL } from "@/lib/config";

export type WsHandler = (event: {
  type: string;
  project_id?: string | null;
  payload: Record<string, unknown>;
}) => void;

export function connectEvents(onEvent: WsHandler): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      retry = 0;
    };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        onEvent(data);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      if (closed) return;
      const delay = Math.min(1000 * 2 ** retry, 10000);
      retry += 1;
      setTimeout(connect, delay);
    };
  };

  connect();
  return () => {
    closed = true;
    ws?.close();
  };
}
