import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../config/logger';
import { monitoringService } from './monitoring.service';

interface Client {
  id: string;
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
}

class WebSocketGateway {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    logger.info('WebSocket server initialized on /ws');

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Setup monitoring service listeners
    this.setupMonitoringListeners();

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any) {
    const clientId = this.generateClientId();
    
    const client: Client = {
      id: clientId,
      ws,
      subscriptions: new Set()
    };

    this.clients.set(clientId, client);

    logger.info('WebSocket client connected', { 
      clientId, 
      totalClients: this.clients.size 
    });

    // Send welcome message
    this.sendToClient(client, {
      type: 'connected',
      clientId,
      timestamp: new Date()
    });

    // Handle messages from client
    ws.on('message', (data: Buffer) => {
      this.handleMessage(client, data);
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.handleDisconnect(client);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', { clientId, error });
    });

    // Set client as alive
    (ws as any).isAlive = true;
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
  }

  /**
   * Handle message from client
   */
  private handleMessage(client: Client, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      
      logger.debug('WebSocket message received', { 
        clientId: client.id, 
        type: message.type 
      });

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(client, message.workflowId);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscribe(client, message.workflowId);
          break;
        
        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: new Date() });
          break;
        
        case 'authenticate':
          this.handleAuthenticate(client, message.userId);
          break;
        
        default:
          logger.warn('Unknown message type', { type: message.type });
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message:', error);
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(client: Client) {
    this.clients.delete(client.id);
    logger.info('WebSocket client disconnected', { 
      clientId: client.id,
      totalClients: this.clients.size 
    });
  }

  /**
   * Handle subscribe to workflow updates
   */
  private handleSubscribe(client: Client, workflowId: string) {
    if (!workflowId) {
      this.sendToClient(client, {
        type: 'error',
        message: 'workflowId is required for subscription'
      });
      return;
    }

    client.subscriptions.add(workflowId);
    
    this.sendToClient(client, {
      type: 'subscribed',
      workflowId,
      timestamp: new Date()
    });

    logger.info('Client subscribed to workflow', { 
      clientId: client.id, 
      workflowId 
    });

    // Send current workflow metrics
    const metrics = monitoringService.getWorkflowMetrics(workflowId);
    if (metrics) {
      this.sendToClient(client, {
        type: 'workflow_metrics',
        metrics
      });
    }
  }

  /**
   * Handle unsubscribe from workflow updates
   */
  private handleUnsubscribe(client: Client, workflowId: string) {
    client.subscriptions.delete(workflowId);
    
    this.sendToClient(client, {
      type: 'unsubscribed',
      workflowId,
      timestamp: new Date()
    });

    logger.info('Client unsubscribed from workflow', { 
      clientId: client.id, 
      workflowId 
    });
  }

  /**
   * Handle client authentication
   */
  private handleAuthenticate(client: Client, userId: string) {
    client.userId = userId;
    
    this.sendToClient(client, {
      type: 'authenticated',
      userId,
      timestamp: new Date()
    });

    logger.info('Client authenticated', { clientId: client.id, userId });
  }

  /**
   * Setup monitoring service listeners
   */
  private setupMonitoringListeners() {
    // Listen for workflow events
    monitoringService.on('workflow_event', (event) => {
      this.broadcastWorkflowEvent(event);
    });

    // Listen for broadcast messages
    monitoringService.on('broadcast', (message) => {
      this.broadcast(message);
    });
  }

  /**
   * Broadcast workflow event to subscribed clients
   */
  private broadcastWorkflowEvent(event: any) {
    const workflowId = event.workflowId;
    
    for (const client of this.clients.values()) {
      // Send to clients subscribed to this workflow
      if (client.subscriptions.has(workflowId)) {
        this.sendToClient(client, {
          type: 'workflow_event',
          event
        });
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any) {
    const payload = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: Client, message: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to specific workflow subscribers
   */
  sendToWorkflowSubscribers(workflowId: string, message: any) {
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(workflowId)) {
        this.sendToClient(client, message);
      }
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        if ((client.ws as any).isAlive === false) {
          logger.info('Terminating dead connection', { clientId: client.id });
          client.ws.terminate();
          this.clients.delete(client.id);
          continue;
        }

        (client.ws as any).isAlive = false;
        client.ws.ping();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get connected clients count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients subscribed to workflow
   */
  getWorkflowSubscribers(workflowId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(workflowId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Close all connections and shutdown
   */
  shutdown() {
    logger.info('Shutting down WebSocket server');

    this.stopHeartbeat();

    for (const client of this.clients.values()) {
      client.ws.close(1000, 'Server shutting down');
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const websocketGateway = new WebSocketGateway();
