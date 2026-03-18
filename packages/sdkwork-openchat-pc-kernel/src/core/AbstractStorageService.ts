

import { Result } from './types';

export abstract class AbstractStorageService<T extends { id: string }> {
  protected storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  protected async loadData(): Promise<T[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  protected async save(data: T[]): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  protected async saveItem(item: T): Promise<void> {
    const data = await this.loadData();
    const index = data.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      data[index] = item;
    } else {
      data.push(item);
    }
    await this.save(data);
  }

  async getAll(): Promise<Result<T[]>> {
    try {
      const data = await this.loadData();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getById(id: string): Promise<Result<T | null>> {
    try {
      const data = await this.loadData();
      const item = data.find((item) => item.id === id) || null;
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async create(item: Omit<T, 'id'>): Promise<Result<T>> {
    try {
      const data = await this.loadData();
      const newItem = { ...item, id: this.generateId() } as T;
      data.push(newItem);
      await this.save(data);
      return { success: true, data: newItem };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async update(id: string, updates: Partial<T>): Promise<Result<T>> {
    try {
      const data = await this.loadData();
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) {
        return { success: false, error: 'Item not found' };
      }
      data[index] = { ...data[index], ...updates };
      await this.save(data);
      return { success: true, data: data[index] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const data = await this.loadData();
      const filtered = data.filter((item) => item.id !== id);
      await this.save(filtered);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  protected generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
