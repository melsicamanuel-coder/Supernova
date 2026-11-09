export interface WSEvent {
  type: string;
  [key: string]: unknown;
}

export type WSStatus = "connecting" | "connected" | "disconnected" | "error";

type EventCallback = (event: WSEvent) => void;
type StatusCallback = (status: WSStatus) => void;

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export class SupernovaWS {
  private ws: WebSocket | null = null;
  private projectId: string;
  private eventCallbacks: EventCallback[] = [];
  private statusCallbacks: StatusCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnect = 5;
  private closed = false;
  private _status: WSStatus = "disconnected";

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  get status(): WSStatus {
    return this._status;
  }

  private setStatus(s: WSStatus) {
    this._status = s;
    this.statusCallbacks.forEach((cb) => cb(s));
  }

  connect(): void {
    if (this.closed) return;
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(`${WS_BASE}/${this.projectId}`);
    } catch {
      this.setStatus("error");
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("connected");
    };

    this.ws.onmessage = (msg) => {
      try {
        const event: WSEvent = JSON.parse(msg.data);
        this.eventCallbacks.forEach((cb) => cb(event));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      this.setStatus("error");
    };

    this.ws.onclose = () => {
      if (this.closed) return;
      this.setStatus("disconnected");
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
      }
    };
  }

  onEvent(cb: EventCallback): () => void {
    this.eventCallbacks.push(cb);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((c) => c !== cb);
    };
  }

  onStatusChange(cb: StatusCallback): () => void {
    this.statusCallbacks.push(cb);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((c) => c !== cb);
    };
  }

  disconnect(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.eventCallbacks = [];
    this.statusCallbacks = [];
    this.setStatus("disconnected");
  }
}
