import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

export interface CreateSessionInput {
  userId: string;
  title?: string;
  summary?: string;
  mode?: 'explore' | 'build';
}

export interface AddMessageInput {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  metadata?: Record<string, any>;
}

export interface SessionWithMessages {
  id: string;
  userId: string;
  title: string | null;
  summary: string | null;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    intent: string | null;
    metadata: any;
    createdAt: Date;
  }>;
}

class SessionService {
  /**
   * Create a new chat session
   */
  async createSession(input: CreateSessionInput): Promise<SessionWithMessages> {
    try {
      logger.info('[Session] Creating new session', { userId: input.userId });

      const session = await prisma.session.create({
        data: {
          userId: input.userId,
          title: input.title || null,
          summary: input.summary || null,
          mode: input.mode || 'explore'
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      logger.info('[Session] Session created successfully', { 
        sessionId: session.id,
        userId: input.userId 
      });

      return session;

    } catch (error: any) {
      logger.error('[Session] Failed to create session', { 
        error: error.message,
        userId: input.userId 
      });
      throw error;
    }
  }

  /**
   * Add a message to a session
   */
  async addMessage(input: AddMessageInput): Promise<void> {
    try {
      logger.debug('[Session] Adding message to session', { 
        sessionId: input.sessionId,
        role: input.role,
        contentLength: input.content.length
      });

      await prisma.message.create({
        data: {
          sessionId: input.sessionId,
          role: input.role,
          content: input.content,
          intent: input.intent || null,
          metadata: input.metadata || null
        }
      });

      // Update session's updatedAt timestamp
      await prisma.session.update({
        where: { id: input.sessionId },
        data: { updatedAt: new Date() }
      });

      logger.debug('[Session] Message added successfully', { 
        sessionId: input.sessionId 
      });

    } catch (error: any) {
      logger.error('[Session] Failed to add message', { 
        error: error.message,
        sessionId: input.sessionId 
      });
      throw error;
    }
  }

  /**
   * Get a session with all its messages
   */
  async getSession(sessionId: string): Promise<SessionWithMessages | null> {
    try {
      logger.debug('[Session] Fetching session', { sessionId });

      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!session) {
        logger.warn('[Session] Session not found', { sessionId });
        return null;
      }

      logger.debug('[Session] Session fetched successfully', { 
        sessionId,
        messageCount: session.messages.length 
      });

      return session;

    } catch (error: any) {
      logger.error('[Session] Failed to fetch session', { 
        error: error.message,
        sessionId 
      });
      throw error;
    }
  }

  /**
   * Get the most recent session for a user
   */
  async getRecentSession(userId: string): Promise<SessionWithMessages | null> {
    try {
      logger.debug('[Session] Fetching recent session', { userId });

      const session = await prisma.session.findFirst({
        where: { userId },
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!session) {
        logger.debug('[Session] No recent session found', { userId });
        return null;
      }

      logger.debug('[Session] Recent session fetched', { 
        sessionId: session.id,
        userId,
        messageCount: session.messages.length 
      });

      return session;

    } catch (error: any) {
      logger.error('[Session] Failed to fetch recent session', { 
        error: error.message,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit: number = 20): Promise<SessionWithMessages[]> {
    try {
      logger.debug('[Session] Fetching user sessions', { userId, limit });

      const sessions = await prisma.session.findMany({
        where: { userId },
        orderBy: {
          updatedAt: 'desc'
        },
        take: limit,
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      logger.debug('[Session] User sessions fetched', { 
        userId,
        sessionCount: sessions.length 
      });

      return sessions;

    } catch (error: any) {
      logger.error('[Session] Failed to fetch user sessions', { 
        error: error.message,
        userId 
      });
      throw error;
    }
  }

  /**
   * Update session title and summary
   */
  async updateSession(
    sessionId: string, 
    updates: { title?: string; summary?: string }
  ): Promise<void> {
    try {
      logger.debug('[Session] Updating session', { sessionId, updates });

      await prisma.session.update({
        where: { id: sessionId },
        data: updates
      });

      logger.debug('[Session] Session updated successfully', { sessionId });

    } catch (error: any) {
      logger.error('[Session] Failed to update session', { 
        error: error.message,
        sessionId 
      });
      throw error;
    }
  }

  /**
   * Delete a session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      logger.info('[Session] Deleting session', { sessionId });

      await prisma.session.delete({
        where: { id: sessionId }
      });

      logger.info('[Session] Session deleted successfully', { sessionId });

    } catch (error: any) {
      logger.error('[Session] Failed to delete session', { 
        error: error.message,
        sessionId 
      });
      throw error;
    }
  }

  /**
   * Generate session title from first message
   */
  generateSessionTitle(firstMessage: string): string {
    // Take first 50 characters or up to first sentence
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;

    return title.split(/[.!?]/)[0].trim() || 'New Conversation';
  }
}

export const sessionService = new SessionService();
export default sessionService;
