

import { Plugin, PluginManager as PluginManagerInterface, PluginStatus, PluginConfig, PluginHook, HookType, PluginError } from './types';
import { errorService } from '../services/error.service';

class EventEmitter {
  private events: Map<string, Function[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
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
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      for (const listener of listeners) {
        listener(...args);
      }
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  getMaxListeners(): number {
    return 0;
  }

  setMaxListeners(n: number): this {
    return this;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  rawListeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  prependListener(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(onceListener);
    return this;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

class PluginManager extends EventEmitter implements PluginManagerInterface {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private pluginErrors: PluginError[] = [];
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.loadBuiltInPlugins();
    
    this.startHotPlugMonitoring();
    
    this.isInitialized = true;
    console.log('[PluginManager] Initialized');
  }

  
  private loadBuiltInPlugins(): void {
    console.log('[PluginManager] Loading built-in plugins');
  }

  
  async loadPlugin(id: string): Promise<Plugin> {
    if (this.plugins.has(id)) {
      return this.plugins.get(id)!;
    }

    try {
      const plugin = this.createMockPlugin(id);
      this.plugins.set(id, plugin);

      await plugin.initialize({
        app: {},
        services: {},
        config: plugin.config,
        logger: {
          info: (message: string) => console.log(`[Plugin ${id}] ${message}`),
          warn: (message: string) => console.warn(`[Plugin ${id}] ${message}`),
          error: (message: string) => console.error(`[Plugin ${id}] ${message}`),
          debug: (message: string) => console.debug(`[Plugin ${id}] ${message}`),
        },
      });

      plugin.status = 'loaded';
      this.emit('plugin:loaded', plugin);
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to load plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async unloadPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      if (plugin.status === 'activated') {
        await plugin.deactivate();
      }

      await plugin.uninstall();

      this.plugins.delete(id);

      this.removePluginHooks(id);

      this.emit('plugin:unloaded', id);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async activatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      const dependencies = this.getPluginDependencies(id);
      for (const depId of dependencies) {
        if (!this.plugins.has(depId)) {
          await this.loadPlugin(depId);
        }
        const depPlugin = this.plugins.get(depId);
        if (depPlugin?.status !== 'activated') {
          await this.activatePlugin(depId);
        }
      }

      const conflicts = this.getPluginConflicts(id);
      for (const conflictId of conflicts) {
        if (this.plugins.has(conflictId)) {
          const conflictPlugin = this.plugins.get(conflictId);
          if (conflictPlugin?.status === 'activated') {
            throw new Error(`Plugin ${id} conflicts with ${conflictId}`);
          }
        }
      }

      await plugin.activate();
      plugin.status = 'activated';

      this.emit('plugin:activated', plugin);
    } catch (error: any) {
      plugin.setError(error.message);
      plugin.status = 'error';
      this.emit('plugin:error', plugin);
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async deactivatePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      await plugin.deactivate();
      plugin.status = 'deactivated';

      this.emit('plugin:deactivated', plugin);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `plugin:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  getPlugin(id: string): Plugin | null {
    return this.plugins.get(id) || null;
  }

  
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  
  getPluginsByStatus(status: PluginStatus): Plugin[] {
    return this.getPlugins().filter(plugin => plugin.status === status);
  }

  
  getPluginsByCategory(category: string): Plugin[] {
    return this.getPlugins().filter(plugin => plugin.metadata.category === category);
  }

  
  registerHook(name: string, callback: (...args: any[]) => any, priority: number = 0): void {
    const hook: PluginHook = {
      name,
      callback,
      priority,
    };

    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    this.hooks.get(name)!.push(hook);
    this.hooks.get(name)!.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  
  async triggerHook(name: string, ...args: any[]): Promise<any[]> {
    const hookCallbacks = this.hooks.get(name) || [];
    const results: any[] = [];

    for (const hook of hookCallbacks) {
      try {
        const result = await hook.callback(...args);
        results.push(result);
      } catch (error: any) {
        errorService.handleError(error, {
          context: `hook:${name}`,
          showNotification: false,
          reportError: true,
        });
      }
    }

    return results;
  }

  
  async loadAllPlugins(): Promise<void> {
    console.log('[PluginManager] Loading all plugins');
  }

  
  async unloadAllPlugins(): Promise<void> {
    for (const plugin of this.getPlugins()) {
      try {
        await this.unloadPlugin(plugin.metadata.id);
      } catch (error) {
        errorService.handleError(error, {
          context: 'plugin:unloadAll',
          showNotification: false,
          reportError: true,
        });
      }
    }
  }

  
  getPluginConfig(id: string): PluginConfig {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }
    return plugin.config;
  }

  
  async updatePluginConfig(id: string, config: PluginConfig): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin ${id} not found`);
    }

    try {
      plugin.config = { ...plugin.config, ...config };
      await plugin.onConfigChange(plugin.config);
      this.emit('plugin:configChanged', plugin);
    } catch (error: any) {
      errorService.handleError(error, {
        context: `plugin:${id}:config`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  getPluginDependencies(id: string): string[] {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return [];
    }
    return plugin.metadata.dependencies || [];
  }

  
  getPluginConflicts(id: string): string[] {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return [];
    }
    return plugin.metadata.conflicts || [];
  }

  
  private removePluginHooks(pluginId: string): void {
    console.log(`[PluginManager] Removing hooks for plugin ${pluginId}`);
  }

  
  private createMockPlugin(id: string): Plugin {
    return {
      metadata: {
        id,
        name: `Mock Plugin ${id}`,
        version: '1.0.0',
        description: 'A mock plugin',
        author: 'OpenChat Team',
        homepage: 'https://openchat.com',
        dependencies: [],
        conflicts: [],
        category: 'general',
        permissions: [],
      },
      status: 'loaded',
      config: {},
      api: {},
      hooks: [],

      async initialize(context) {
        this.context = context;
        console.log(`[Plugin ${id}] Initialized`);
      },

      async activate() {
        console.log(`[Plugin ${id}] Activated`);
      },

      async deactivate() {
        console.log(`[Plugin ${id}] Deactivated`);
      },

      async uninstall() {
        console.log(`[Plugin ${id}] Uninstalled`);
      },

      async onConfigChange(config) {
        console.log(`[Plugin ${id}] Config changed:`, config);
      },

      registerHook(hook) {
        this.hooks.push(hook);
      },

      getApi() {
        return this.api;
      },

      getStatus() {
        return this.status;
      },

      setError(error) {
        this.error = error;
      },

      clearError() {
        this.error = undefined;
      },
    };
  }

  
  getPluginErrors(): PluginError[] {
    return this.pluginErrors;
  }

  
  clearPluginErrors(): void {
    this.pluginErrors = [];
  }

  
  private startHotPlugMonitoring(): void {
    console.log('[PluginManager] Starting hot plug monitoring');
    this.schedulePluginScan();
  }

  
  private schedulePluginScan(): void {
    setInterval(async () => {
      await this.scanForNewPlugins();
    }, 5000); 
  }

  
  private async scanForNewPlugins(): Promise<void> {
    console.log('[PluginManager] Scanning for new plugins');
  }

  
  async hotLoadPlugin(id: string, pluginPath: string): Promise<Plugin> {
    try {
      console.log(`[PluginManager] Hot loading plugin ${id} from ${pluginPath}`);
      
      if (this.plugins.has(id)) {
        await this.hotUnloadPlugin(id);
      }

      const plugin = await this.loadPlugin(id);
      
      await this.activatePlugin(id);
      
      this.emit('plugin:hotLoaded', plugin);
      console.log(`[PluginManager] Hot loaded plugin ${id}`);
      
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to hot load plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:hotLoad:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async hotUnloadPlugin(id: string): Promise<void> {
    try {
      console.log(`[PluginManager] Hot unloading plugin ${id}`);
      
      if (!this.plugins.has(id)) {
        console.warn(`[PluginManager] Plugin ${id} not found for hot unload`);
        return;
      }

      await this.unloadPlugin(id);
      
      this.emit('plugin:hotUnloaded', id);
      console.log(`[PluginManager] Hot unloaded plugin ${id}`);
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to hot unload plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:hotUnload:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async hotUpdatePlugin(id: string, pluginPath: string): Promise<Plugin> {
    try {
      console.log(`[PluginManager] Hot updating plugin ${id}`);
      
      const plugin = await this.hotLoadPlugin(id, pluginPath);
      
      this.emit('plugin:hotUpdated', plugin);
      console.log(`[PluginManager] Hot updated plugin ${id}`);
      
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to hot update plugin',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:hotUpdate:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  async loadPluginFromUrl(id: string, url: string): Promise<Plugin> {
    try {
      console.log(`[PluginManager] Loading plugin ${id} from URL ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.statusText}`);
      }
      
      const _pluginCode = await response.text();
      
      const plugin = this.createMockPlugin(id);
      this.plugins.set(id, plugin);
      
      await plugin.initialize({
        app: {},
        services: {},
        config: plugin.config,
        logger: {
          info: (message: string) => console.log(`[Plugin ${id}] ${message}`),
          warn: (message: string) => console.warn(`[Plugin ${id}] ${message}`),
          error: (message: string) => console.error(`[Plugin ${id}] ${message}`),
          debug: (message: string) => console.debug(`[Plugin ${id}] ${message}`),
        },
      });
      
      plugin.status = 'loaded';
      this.emit('plugin:loadedFromUrl', plugin);
      console.log(`[PluginManager] Loaded plugin ${id} from URL`);
      
      return plugin;
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId: id,
        error: error.message || 'Failed to load plugin from URL',
        stack: error.stack,
        timestamp: Date.now(),
      };
      this.pluginErrors.push(pluginError);
      errorService.handleError(error, {
        context: `plugin:loadFromUrl:${id}`,
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  
  getStatus() {
    return {
      initialized: this.isInitialized,
      pluginCount: this.plugins.size,
      activePlugins: this.getPluginsByStatus('activated').length,
      loadedPlugins: this.getPluginsByStatus('loaded').length,
      errorPlugins: this.getPluginsByStatus('error').length,
      hookCount: Array.from(this.hooks.values()).reduce((sum, hooks) => sum + hooks.length, 0),
    };
  }
}

export const pluginManager = PluginManager.getInstance();

export default PluginManager;