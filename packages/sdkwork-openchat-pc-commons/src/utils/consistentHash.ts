


interface HashRingNode {
  id: string;
  weight: number;
  virtualNodes: number[]; 


export class ConsistentHashRing {
  private ring: Map<number, string> = new Map(); 
  private nodes: Map<string, HashRingNode> = new Map(); 
  private sortedHashes: number[] = []; 

  constructor(virtualNodesPerServer: number = 150) {
    this.virtualNodesPerServer = virtualNodesPerServer;
  }

  
  private hash(key: string): number {
    let h1 = 0;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const r1 = 15;
    const r2 = 13;
    const m = 5;
    const n = 0xe6546b64;

    let i = 0;
    const len = key.length;

    while (i + 4 <= len) {
      let k1 =
        (key.charCodeAt(i) & 0xff) |
        ((key.charCodeAt(i + 1) & 0xff) << 8) |
        ((key.charCodeAt(i + 2) & 0xff) << 16) |
        ((key.charCodeAt(i + 3) & 0xff) << 24);

      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);

      h1 ^= k1;
      h1 = (h1 << r2) | (h1 >>> (32 - r2));
      h1 = Math.imul(h1, m) + n;

      i += 4;
    }

    let k1 = 0;
    const remaining = len - i;
    if (remaining >= 3) {
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    }
    if (remaining >= 2) {
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    }
    if (remaining >= 1) {
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << r1) | (k1 >>> (32 - r1));
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
    }

    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35);
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

  
  addNode(nodeId: string, weight: number = 1): void {
    if (this.nodes.has(nodeId)) {
      console.warn(`[ConsistentHash] Node ${nodeId} already exists`);
      return;
    }

    const virtualNodes: number[] = [];
    const virtualNodeCount = Math.floor(this.virtualNodesPerServer * weight);

    for (let i = 0; i < virtualNodeCount; i++) {
      const virtualKey = `${nodeId}#${i}`;
      const hash = this.hash(virtualKey);
      
      this.ring.set(hash, nodeId);
      virtualNodes.push(hash);
    }

    this.nodes.set(nodeId, {
      id: nodeId,
      weight,
      virtualNodes,
    });

    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    console.log(
      `[ConsistentHash] Added node ${nodeId} with ${virtualNodeCount} virtual nodes`
    );
  }

  
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`[ConsistentHash] Node ${nodeId} not found`);
      return;
    }

    node.virtualNodes.forEach((hash) => {
      this.ring.delete(hash);
    });

    this.nodes.delete(nodeId);

    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    console.log(`[ConsistentHash] Removed node ${nodeId}`);
  }

  
  getNode(key: string): string | null {
    if (this.sortedHashes.length === 0) {
      return null;
    }

    const hash = this.hash(key);

    let right = this.sortedHashes.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedHashes[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

      this.sortedHashes[left] >= hash
        ? this.sortedHashes[left]
        : this.sortedHashes[0];

    return this.ring.get(targetHash) || null;
  }

  
  getNodes(key: string, count: number): string[] {
    if (this.sortedHashes.length === 0) {
      return [];
    }

    const hash = this.hash(key);
    const results: string[] = [];
    const seen = new Set<string>();

    let left = 0;
    let right = this.sortedHashes.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedHashes[mid] < hash) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    let index =
      this.sortedHashes[left] >= hash ? left : 0;

      const nodeHash = this.sortedHashes[index];
      const nodeId = this.ring.get(nodeHash);

      if (nodeId && !seen.has(nodeId)) {
        seen.add(nodeId);
        results.push(nodeId);
      }

      index = (index + 1) % this.sortedHashes.length;

      if (index === (this.sortedHashes[left] >= hash ? left : 0)) {
        break;
      }
    }

    return results;
  }

  
  getAllNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  
  getNodeCount(): number {
    return this.nodes.size;
  }

  
  getVirtualNodeCount(): number {
    return this.sortedHashes.length;
  }

  
  getDistributionStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.sortedHashes.forEach((hash) => {
      const nodeId = this.ring.get(hash);
      if (nodeId) {
        stats[nodeId] = (stats[nodeId] || 0) + 1;
      }
    });

    return stats;
  }

  
  getStandardDeviation(): number {
    const stats = this.getDistributionStats();
    const values = Object.values(stats);

    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance);
  }

  
  clear(): void {
    this.ring.clear();
    this.nodes.clear();
    this.sortedHashes = [];
  }
}


export class ServerRouter {
  private hashRing: ConsistentHashRing;
  private serverHealth: Map<string, { healthy: boolean; lastCheck: number }> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(virtualNodesPerServer: number = 150) {
    this.hashRing = new ConsistentHashRing(virtualNodesPerServer);
    this.startHealthCheck();
  }

  
  addServer(serverId: string, weight: number = 1): void {
    this.hashRing.addNode(serverId, weight);
    this.serverHealth.set(serverId, { healthy: true, lastCheck: Date.now() });
  }

  
  removeServer(serverId: string): void {
    this.hashRing.removeNode(serverId);
    this.serverHealth.delete(serverId);
  }

  
  getRoute(key: string): string | null {
    const primary = this.hashRing.getNode(key);
    
    if (!primary) return null;

    if (health?.healthy) {
      return primary;
    }

    for (const backup of backups) {
      const backupHealth = this.serverHealth.get(backup);
      if (backupHealth?.healthy) {
        return backup;
      }
    }

    return null;
  }

  
  setServerHealth(serverId: string, healthy: boolean): void {
    this.serverHealth.set(serverId, { healthy, lastCheck: Date.now() });
  }

  
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkServerHealth();
    }, 30000); 

  
  private checkServerHealth(): void {
    this.serverHealth.forEach((health, serverId) => {
      }
    });
  }

  
  getHealthyServers(): string[] {
    return Array.from(this.serverHealth.entries())
      .filter(([, health]) => health.healthy)
      .map(([serverId]) => serverId);
  }

  
  getStats() {
    return {
      totalServers: this.hashRing.getNodeCount(),
      healthyServers: this.getHealthyServers().length,
      virtualNodes: this.hashRing.getVirtualNodeCount(),
      distributionStdDev: this.hashRing.getStandardDeviation(),
    };
  }

  
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.hashRing.clear();
    this.serverHealth.clear();
  }
}

let serverRouter: ServerRouter | null = null;


export function getServerRouter(): ServerRouter {
  if (!serverRouter) {
    serverRouter = new ServerRouter();
  }
  return serverRouter;
}


export function routeUser(userId: string): string | null {
  return getServerRouter().getRoute(userId);
}


export function routeMessage(messageId: string): string | null {
  return getServerRouter().getRoute(messageId);
}

