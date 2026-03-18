import { microFrontendChannel } from "./channel";
import { errorService } from "../services/error.service";
import type {
  MicroFrontend,
  MicroFrontendConfig,
  MicroFrontendLifecycleEvent,
  MicroFrontendLoader,
  MicroFrontendStatus,
} from "./types";

declare global {
  interface Window {
    [key: string]: any;
  }
}

class EventEmitter {
  private events = new Map<string, Function[]>();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (!listeners) {
      return this;
    }

    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    for (const listener of listeners) {
      listener(...args);
    }
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export class DefaultMicroFrontend implements MicroFrontend {
  name: string;
  config: MicroFrontendConfig;
  status: MicroFrontendStatus;
  instance?: any;
  manifest?: any;
  error?: string;
  mountProps?: Record<string, any>;

  private scriptElements: HTMLScriptElement[] = [];
  private styleElements: HTMLLinkElement[] = [];

  constructor(config: MicroFrontendConfig) {
    this.name = config.name;
    this.config = config;
    this.status = "not_loaded";
  }

  async load(): Promise<void> {
    if (this.status === "loading" || this.status === "loaded") {
      return;
    }

    this.status = "loading";

    try {
      console.log(
        `[MicroFrontend] Loading "${this.name}" from "${this.config.entry}"`,
      );

      if (this.config.entry.endsWith(".html")) {
        await this.loadHtmlEntry();
      } else if (this.config.entry.endsWith(".js")) {
        await this.loadJsEntry();
      } else {
        await this.loadGenericEntry();
      }

      this.status = "loaded";
      console.log(`[MicroFrontend] Loaded "${this.name}" successfully`);
    } catch (error: any) {
      this.status = "error";
      this.error = error?.message || "Failed to load micro frontend.";
      console.error(`[MicroFrontend] Failed to load "${this.name}"`, error);
      throw error;
    }
  }

  private async loadHtmlEntry(): Promise<void> {
    const response = await fetch(this.config.entry);
    if (!response.ok) {
      throw new Error(`Failed to load micro frontend: ${response.statusText}`);
    }

    const html = await response.text();
    const container = this.getContainer();
    container.innerHTML = html;
    await this.loadScriptsAndStyles(container);
  }

  private async loadJsEntry(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = this.config.entry;
      script.type = "module";
      script.onload = () => {
        this.scriptElements.push(script);
        resolve();
      };
      script.onerror = () => {
        reject(
          new Error(
            `Failed to load micro frontend script: ${this.config.entry}`,
          ),
        );
      };
      document.head.appendChild(script);
    });
  }

  private async loadGenericEntry(): Promise<void> {
    throw new Error(`Unsupported entry type: ${this.config.entry}`);
  }

  private async loadScriptsAndStyles(container: HTMLElement): Promise<void> {
    const scripts = container.querySelectorAll("script");
    const styles = container.querySelectorAll('link[rel="stylesheet"]');

    for (const script of scripts) {
      const newScript = document.createElement("script");
      if (script.src) {
        newScript.src = script.src;
        await new Promise<void>((resolve, reject) => {
          newScript.onload = () => resolve();
          newScript.onerror = () => reject(new Error("Script load failed."));
          document.head.appendChild(newScript);
        });
      } else {
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
      }
      this.scriptElements.push(newScript);
    }

    for (const style of styles) {
      const newStyle = document.createElement("link");
      newStyle.rel = "stylesheet";
      newStyle.href = (style as HTMLLinkElement).href;
      await new Promise<void>((resolve, reject) => {
        newStyle.onload = () => resolve();
        newStyle.onerror = () => reject(new Error("Style load failed."));
        document.head.appendChild(newStyle);
      });
      this.styleElements.push(newStyle);
    }
  }

  async mount(props?: Record<string, any>): Promise<void> {
    if (this.status === "mounted") {
      return;
    }
    if (this.status !== "loaded") {
      await this.load();
    }

    try {
      console.log(`[MicroFrontend] Mounting "${this.name}"`);
      this.mountProps = {
        ...this.config.props,
        ...props,
        channel: microFrontendChannel,
      };

      if (window[this.name] && typeof window[this.name].mount === "function") {
        await window[this.name].mount(this.getContainer(), this.mountProps);
      }

      this.status = "mounted";
      console.log(`[MicroFrontend] Mounted "${this.name}" successfully`);
    } catch (error: any) {
      this.status = "error";
      this.error = error?.message || "Failed to mount micro frontend.";
      console.error(`[MicroFrontend] Failed to mount "${this.name}"`, error);
      throw error;
    }
  }

  async unmount(): Promise<void> {
    if (this.status !== "mounted") {
      return;
    }

    try {
      console.log(`[MicroFrontend] Unmounting "${this.name}"`);

      if (window[this.name] && typeof window[this.name].unmount === "function") {
        await window[this.name].unmount(this.getContainer());
      }

      this.cleanupResources();
      this.status = "unmounted";
      console.log(`[MicroFrontend] Unmounted "${this.name}" successfully`);
    } catch (error: any) {
      this.status = "error";
      this.error = error?.message || "Failed to unmount micro frontend.";
      console.error(`[MicroFrontend] Failed to unmount "${this.name}"`, error);
      throw error;
    }
  }

  async update(props?: Record<string, any>): Promise<void> {
    if (this.status !== "mounted") {
      return;
    }

    try {
      console.log(`[MicroFrontend] Updating "${this.name}"`);
      this.mountProps = {
        ...this.mountProps,
        ...props,
      };

      if (window[this.name] && typeof window[this.name].update === "function") {
        await window[this.name].update(this.mountProps);
      }
      console.log(`[MicroFrontend] Updated "${this.name}" successfully`);
    } catch (error: any) {
      this.status = "error";
      this.error = error?.message || "Failed to update micro frontend.";
      console.error(`[MicroFrontend] Failed to update "${this.name}"`, error);
      throw error;
    }
  }

  getStatus(): MicroFrontendStatus {
    return this.status;
  }

  setError(error: string): void {
    this.error = error;
    this.status = "error";
  }

  clearError(): void {
    this.error = undefined;
  }

  private getContainer(): HTMLElement {
    if (typeof this.config.container === "string") {
      const container = document.querySelector(this.config.container);
      if (!container) {
        throw new Error(
          `Cannot find micro frontend container: ${this.config.container}`,
        );
      }
      return container as HTMLElement;
    }
    return this.config.container;
  }

  private cleanupResources(): void {
    this.scriptElements.forEach((script) => script.remove());
    this.scriptElements = [];

    this.styleElements.forEach((style) => style.remove());
    this.styleElements = [];

    if (window[this.name]) {
      delete window[this.name];
    }
  }
}

export class DefaultMicroFrontendLoader
  extends EventEmitter
  implements MicroFrontendLoader
{
  private microFrontends = new Map<string, MicroFrontend>();

  async load(config: MicroFrontendConfig): Promise<MicroFrontend> {
    try {
      const existing = this.microFrontends.get(config.name);
      if (existing) {
        return existing;
      }

      const microFrontend = new DefaultMicroFrontend(config);
      this.microFrontends.set(config.name, microFrontend);

      this.emitLifecycle("beforeLoad", microFrontend);
      await microFrontend.load();
      this.emitLifecycle("afterLoad", microFrontend);

      return microFrontend;
    } catch (error: any) {
      errorService.handleError(error, {
        context: `microfrontend:load:${config.name}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  get(name: string): MicroFrontend | undefined {
    return this.microFrontends.get(name);
  }

  getAll(): MicroFrontend[] {
    return Array.from(this.microFrontends.values());
  }

  async remove(name: string): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      return;
    }

    try {
      await microFrontend.unmount();
      this.microFrontends.delete(name);
      console.log(`[MicroFrontendLoader] Removed "${name}"`);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `microfrontend:remove:${name}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  async clear(): Promise<void> {
    for (const [name, microFrontend] of this.microFrontends) {
      try {
        await microFrontend.unmount();
      } catch (error) {
        errorService.handleError(error, {
          context: `microfrontend:clear:${name}`,
          showNotification: false,
          reportError: true,
        });
      }
    }
    this.microFrontends.clear();
    console.log("[MicroFrontendLoader] Cleared all micro frontends");
  }

  async mount(name: string, props?: Record<string, any>): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      throw new Error(`Micro frontend is not loaded: ${name}`);
    }

    this.emitLifecycle("beforeMount", microFrontend);
    await microFrontend.mount(props);
    this.emitLifecycle("afterMount", microFrontend);
  }

  async unmount(name: string): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      return;
    }

    this.emitLifecycle("beforeUnmount", microFrontend);
    await microFrontend.unmount();
    this.emitLifecycle("afterUnmount", microFrontend);
  }

  async update(name: string, props?: Record<string, any>): Promise<void> {
    const microFrontend = this.microFrontends.get(name);
    if (!microFrontend) {
      throw new Error(`Micro frontend is not loaded: ${name}`);
    }

    this.emitLifecycle("beforeUpdate", microFrontend);
    await microFrontend.update(props);
    this.emitLifecycle("afterUpdate", microFrontend);
  }

  private emitLifecycle(name: string, microFrontend: MicroFrontend): void {
    this.emit(name, {
      name,
      microFrontend,
      timestamp: Date.now(),
    } as MicroFrontendLifecycleEvent);
  }
}

export const microFrontendLoader = new DefaultMicroFrontendLoader();

export default DefaultMicroFrontendLoader;
