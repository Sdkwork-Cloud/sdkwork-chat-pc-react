import type { MicroFrontendChannel, MicroFrontendEvent } from "./types";

class EventEmitter {
  private events = new Map<string, Function[]>();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        console.error("[MicroFrontendChannel] Listener error:", error);
      }
    }
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (!listeners) {
      return;
    }
    this.events.set(
      event,
      listeners.filter((item) => item !== listener),
    );
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
      return;
    }
    this.events.clear();
  }
}

export class DefaultMicroFrontendChannel
  extends EventEmitter
  implements MicroFrontendChannel
{
  private static instance: DefaultMicroFrontendChannel;

  private eventListeners = new Map<
    string,
    Set<(event: MicroFrontendEvent) => void>
  >();

  private constructor() {
    super();
  }

  static getInstance(): DefaultMicroFrontendChannel {
    if (!DefaultMicroFrontendChannel.instance) {
      DefaultMicroFrontendChannel.instance = new DefaultMicroFrontendChannel();
    }
    return DefaultMicroFrontendChannel.instance;
  }

  send(event: MicroFrontendEvent): void {
    const eventWithTimestamp: MicroFrontendEvent = {
      ...event,
      timestamp: Date.now(),
    };

    console.log(
      `[MicroFrontendChannel] Send event "${event.type}" from "${event.source}" to "${event.target || "all"}"`,
    );

    this.emit("event", eventWithTimestamp);
    this.emit(event.type, eventWithTimestamp);

    if (event.target) {
      this.emit(`${event.type}:${event.target}`, eventWithTimestamp);
    }
  }

  on(type: string, handler: (event: MicroFrontendEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)?.add(handler);
    super.on(type, handler);
    console.log(`[MicroFrontendChannel] Register listener for "${type}"`);
  }

  off(type: string, handler: (event: MicroFrontendEvent) => void): void {
    const handlers = this.eventListeners.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventListeners.delete(type);
      }
    }
    super.off(type, handler);
    console.log(`[MicroFrontendChannel] Remove listener for "${type}"`);
  }

  clear(): void {
    this.eventListeners.forEach((handlers, type) => {
      handlers.forEach((handler) => super.off(type, handler));
    });
    this.eventListeners.clear();
    this.removeAllListeners();
    console.log("[MicroFrontendChannel] Cleared all listeners");
  }

  getListenerCount(type?: string): number {
    if (type) {
      return this.eventListeners.get(type)?.size || 0;
    }
    return Array.from(this.eventListeners.values()).reduce(
      (total, handlers) => total + handlers.size,
      0,
    );
  }

  broadcast(type: string, payload: any, source: string): void {
    this.send({
      type,
      payload,
      source,
      timestamp: Date.now(),
    });
  }

  sendTo(target: string, type: string, payload: any, source: string): void {
    this.send({
      type,
      payload,
      source,
      target,
      timestamp: Date.now(),
    });
  }
}

export const microFrontendChannel = DefaultMicroFrontendChannel.getInstance();

export default DefaultMicroFrontendChannel;
