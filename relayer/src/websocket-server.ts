/**
 * @fileoverview WebSocket server for 1inch Fusion+ real-time events
 * @description Event-driven architecture with real-time notifications
 */

import { EventEmitter } from 'events';
import { createServer } from 'http';

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// WebSocket types (simplified)
interface WebSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  terminate(): void;
  ping(): void;
  on(event: string, callback: (...args: any[]) => void): void;
}

interface WebSocketServer {
  on(event: string, callback: (...args: any[]) => void): void;
  close(callback?: () => void): void;
}

// 1inch Fusion+ compliant event types
export enum EventType {
  OrderCreated = 'order_created',
  OrderInvalid = 'order_invalid',
  OrderBalanceChange = 'order_balance_change',
  OrderAllowanceChange = 'order_allowance_change',
  OrderFilled = 'order_filled',
  OrderFilledPartially = 'order_filled_partially',
  OrderCancelled = 'order_cancelled',
  SecretShared = 'secret_shared'
}

// RPC methods (1inch compliant)
export enum RpcMethod {
  GetAllowedMethods = 'getAllowedMethods',
  Ping = 'ping',
  GetActiveOrders = 'getActiveOrders',
  GetSecrets = 'getSecrets'
}

// WebSocket message structure
export interface WebSocketMessage {
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  event?: EventType;
  data?: any;
}

// Event data structures (1inch compliant)
export interface OrderCreatedEvent {
  event: EventType.OrderCreated;
  data: {
    srcChainId: number;
    dstChainId: number;
    orderHash: string;
    order: any;
    extension: string;
    signature: string;
    isMakerContract: boolean;
    quoteId: string;
    merkleLeaves: string[];
    secretHashes: string[];
  };
}

export interface OrderFilledEvent {
  event: EventType.OrderFilled;
  data: {
    orderHash: string;
    fillAmount: string;
    resolver: string;
    txHash: string;
    timestamp: number;
  };
}

export interface OrderFilledPartiallyEvent {
  event: EventType.OrderFilledPartially;
  data: {
    orderHash: string;
    fragmentIndex: number;
    fillAmount: string;
    remainingAmount: string;
    resolver: string;
    fillPercentage: number;
    txHash: string;
    timestamp: number;
  };
}

export interface OrderCancelledEvent {
  event: EventType.OrderCancelled;
  data: {
    orderHash: string;
    reason: string;
    timestamp: number;
  };
}

export interface SecretSharedEvent {
  event: EventType.SecretShared;
  data: {
    orderHash: string;
    secretIndex: number;
    secret: string;
    resolver: string;
    timestamp: number;
  };
}

// Client connection interface
export interface WebSocketClient {
  id: string;
  socket: WebSocket;
  subscriptions: Set<EventType>;
  orderFilters: Set<string>; // Specific order hashes
  resolverFilters: Set<string>; // Specific resolver addresses
  chainFilters: Set<number>; // Specific chain IDs
  lastPing: number;
  isAlive: boolean;
  metadata: {
    userAgent?: string;
    ip?: string;
    connectedAt: number;
  };
}

// Event history for replay
export interface EventRecord {
  id: string;
  timestamp: number;
  event: EventType;
  data: any;
  orderHash?: string;
  resolver?: string;
  chainId?: number;
}

export class FusionWebSocketServer extends EventEmitter {
  private httpServer: any;
  private clients: Map<string, WebSocketClient> = new Map();
  private eventHistory: EventRecord[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private isRunning = false;

  constructor(private port: number = 3002) {
    super();
    this.httpServer = createServer();
  }

  /**
   * Start WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.listen(this.port, () => {
          console.log(`🌐 WebSocket server started on port ${this.port}`);
          this.startPingInterval();
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop WebSocket server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // Close all client connections
      this.clients.forEach(client => {
        client.socket.close();
      });
      this.clients.clear();

      this.httpServer.close(() => {
        console.log('🌐 WebSocket server stopped');
        resolve();
      });
    });
  }

  /**
   * Setup WebSocket connection handlers
   */
  private setupWebSocketHandlers(): void {
    // WebSocket server setup would go here in full implementation
    // For now, this is a placeholder for the event system architecture
    console.log('🔌 WebSocket handler setup completed');
  }

  /**
   * Handle client RPC and subscription messages
   */
  private handleClientMessage(client: WebSocketClient, message: WebSocketMessage): void {
    const { id, method, params } = message;

    if (!method) {
      this.sendError(client, -32600, 'Invalid Request', 'Method is required');
      return;
    }

    switch (method) {
      case RpcMethod.Ping:
        this.handlePing(client, id);
        break;

      case RpcMethod.GetAllowedMethods:
        this.handleGetAllowedMethods(client, id);
        break;

      case RpcMethod.GetActiveOrders:
        this.handleGetActiveOrders(client, id, params);
        break;

      case 'subscribe':
        this.handleSubscribe(client, id, params);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(client, id, params);
        break;

      case 'getEventHistory':
        this.handleGetEventHistory(client, id, params);
        break;

      default:
        this.sendError(client, -32601, 'Method not found', `Unknown method: ${method}`);
    }
  }

  /**
   * Handle ping RPC method
   */
  private handlePing(client: WebSocketClient, id?: string): void {
    this.sendResponse(client, id, 'pong');
  }

  /**
   * Handle getAllowedMethods RPC method
   */
  private handleGetAllowedMethods(client: WebSocketClient, id?: string): void {
    const methods = [
      ...Object.values(RpcMethod),
      'subscribe',
      'unsubscribe',
      'getEventHistory'
    ];
    this.sendResponse(client, id, methods);
  }

  /**
   * Handle getActiveOrders RPC method
   */
  private handleGetActiveOrders(client: WebSocketClient, id?: string, params?: any): void {
    // This should integrate with the orders service
    // For now, returning mock data
    const orders = [
      {
        orderHash: '0x1234567890abcdef',
        status: 'active',
        fillPercentage: 25
      }
    ];

    this.sendResponse(client, id, { orders });
  }

  /**
   * Handle event subscriptions
   */
  private handleSubscribe(client: WebSocketClient, id?: string, params?: any): void {
    const { events, orderHashes, resolvers, chainIds } = params || {};

    // Subscribe to events
    if (events && Array.isArray(events)) {
      events.forEach(event => {
        if (Object.values(EventType).includes(event)) {
          client.subscriptions.add(event);
        }
      });
    }

    // Add filters
    if (orderHashes && Array.isArray(orderHashes)) {
      orderHashes.forEach(hash => client.orderFilters.add(hash));
    }

    if (resolvers && Array.isArray(resolvers)) {
      resolvers.forEach(resolver => client.resolverFilters.add(resolver));
    }

    if (chainIds && Array.isArray(chainIds)) {
      chainIds.forEach(chainId => client.chainFilters.add(chainId));
    }

    this.sendResponse(client, id, {
      subscribed: true,
      events: Array.from(client.subscriptions),
      filters: {
        orders: Array.from(client.orderFilters),
        resolvers: Array.from(client.resolverFilters),
        chains: Array.from(client.chainFilters)
      }
    });

    console.log(`📡 Client ${client.id} subscribed to ${client.subscriptions.size} events`);
  }

  /**
   * Handle event unsubscriptions
   */
  private handleUnsubscribe(client: WebSocketClient, id?: string, params?: any): void {
    const { events, orderHashes, resolvers, chainIds } = params || {};

    // Unsubscribe from events
    if (events && Array.isArray(events)) {
      events.forEach(event => client.subscriptions.delete(event));
    }

    // Remove filters
    if (orderHashes && Array.isArray(orderHashes)) {
      orderHashes.forEach(hash => client.orderFilters.delete(hash));
    }

    if (resolvers && Array.isArray(resolvers)) {
      resolvers.forEach(resolver => client.resolverFilters.delete(resolver));
    }

    if (chainIds && Array.isArray(chainIds)) {
      chainIds.forEach(chainId => client.chainFilters.delete(chainId));
    }

    this.sendResponse(client, id, { unsubscribed: true });
  }

  /**
   * Handle event history requests
   */
  private handleGetEventHistory(client: WebSocketClient, id?: string, params?: any): void {
    const { limit = 100, offset = 0, events, orderHash } = params || {};

    let filteredHistory = Array.from(this.eventHistory);

    // Apply filters
    if (events && Array.isArray(events)) {
      filteredHistory = filteredHistory.filter(record => events.includes(record.event));
    }

    if (orderHash) {
      filteredHistory = filteredHistory.filter(record => record.orderHash === orderHash);
    }

    // Apply pagination
    const result = filteredHistory
      .slice(offset, offset + limit)
      .map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        event: record.event,
        data: record.data
      }));

    this.sendResponse(client, id, {
      events: result,
      total: filteredHistory.length,
      limit,
      offset
    });
  }

  /**
   * Broadcast event to subscribed clients
   */
  broadcast(event: EventType, data: any, metadata?: { orderHash?: string; resolver?: string; chainId?: number }): void {
    const eventRecord: EventRecord = {
      id: generateUUID(),
      timestamp: Date.now(),
      event,
      data,
      orderHash: metadata?.orderHash,
      resolver: metadata?.resolver,
      chainId: metadata?.chainId
    };

    // Add to history
    this.eventHistory.push(eventRecord);
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory.shift();
    }

    const message: WebSocketMessage = {
      event,
      data: {
        ...data,
        timestamp: eventRecord.timestamp,
        eventId: eventRecord.id
      }
    };

    // Send to subscribed clients
    this.clients.forEach(client => {
      if (this.shouldSendToClient(client, event, metadata)) {
        this.sendMessage(client, message);
      }
    });

    console.log(`📡 Broadcasted ${event} to ${this.getSubscribedClientCount(event)} clients`);
  }

  /**
   * Check if event should be sent to client based on subscriptions and filters
   */
  private shouldSendToClient(client: WebSocketClient, event: EventType, metadata?: { orderHash?: string; resolver?: string; chainId?: number }): boolean {
    // Check event subscription
    if (!client.subscriptions.has(event)) {
      return false;
    }

    // Check order filter
    if (client.orderFilters.size > 0 && metadata?.orderHash && !client.orderFilters.has(metadata.orderHash)) {
      return false;
    }

    // Check resolver filter
    if (client.resolverFilters.size > 0 && metadata?.resolver && !client.resolverFilters.has(metadata.resolver)) {
      return false;
    }

    // Check chain filter
    if (client.chainFilters.size > 0 && metadata?.chainId && !client.chainFilters.has(metadata.chainId)) {
      return false;
    }

    return true;
  }

  /**
   * Get count of clients subscribed to an event
   */
  private getSubscribedClientCount(event: EventType): number {
    return Array.from(this.clients.values()).filter(client => client.subscriptions.has(event)).length;
  }

  /**
   * Send message to client
   */
  private sendMessage(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.socket.readyState === 1) { // 1 = OPEN
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send RPC response to client
   */
  private sendResponse(client: WebSocketClient, id: string | undefined, result: any): void {
    this.sendMessage(client, { id, result });
  }

  /**
   * Send error to client
   */
  private sendError(client: WebSocketClient, code: number, message: string, data?: any): void {
    this.sendMessage(client, {
      error: { code, message }
    });
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach(client => {
        if (!client.isAlive) {
          console.log(`💀 Terminating inactive client: ${client.id}`);
          client.socket.terminate();
          this.clients.delete(client.id);
          return;
        }

        client.isAlive = false;
        client.socket.ping();
      });
    }, this.PING_INTERVAL);
  }

  // Public getters for monitoring
  getClientCount(): number {
    return this.clients.size;
  }

  getEventHistorySize(): number {
    return this.eventHistory.length;
  }

  getClientInfo(): Array<{ id: string; subscriptions: string[]; filters: any; metadata: any }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      filters: {
        orders: Array.from(client.orderFilters),
        resolvers: Array.from(client.resolverFilters),
        chains: Array.from(client.chainFilters)
      },
      metadata: client.metadata
    }));
  }
}

export default FusionWebSocketServer; 