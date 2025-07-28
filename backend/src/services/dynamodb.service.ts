import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { QuizSession, UserAnswer, QuizQuestion } from '../types/quiz.types';
import { logger } from '../utils/logger';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    // Initialize DynamoDB client
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
    
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'QuizSessions';
  }

  /**
   * Store a new quiz session
   */
  async createSession(session: QuizSession): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          sessionId: session.sessionId,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.totalQuestions,
          score: session.score,
          correctAnswers: session.correctAnswers,
          answers: session.answers,
          difficulty: session.difficulty,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime ? session.endTime.toISOString() : null,
          isCompleted: session.isCompleted,
          userId: session.userId || null,
          ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hour TTL
        },
        ConditionExpression: 'attribute_not_exists(sessionId)', // Prevent overwrites
      });

      await this.client.send(command);
      
      logger.info('Session created in DynamoDB', {
        sessionId: session.sessionId,
        difficulty: session.difficulty,
        totalQuestions: session.totalQuestions,
      });
      
    } catch (error) {
      logger.error('Failed to create session in DynamoDB', error, {
        sessionId: session.sessionId,
      });
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a quiz session by ID
   */
  async getSession(sessionId: string): Promise<QuizSession | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { sessionId },
      });

      const result = await this.client.send(command);
      
      if (!result.Item) {
        logger.warn('Session not found in DynamoDB', { sessionId });
        return null;
      }

      // Convert DynamoDB item back to QuizSession
      const session: QuizSession = {
        sessionId: result.Item.sessionId,
        currentQuestionIndex: result.Item.currentQuestionIndex,
        totalQuestions: result.Item.totalQuestions,
        score: result.Item.score,
        correctAnswers: result.Item.correctAnswers,
        answers: result.Item.answers || [],
        difficulty: result.Item.difficulty,
        startTime: new Date(result.Item.startTime),
        endTime: result.Item.endTime ? new Date(result.Item.endTime) : undefined,
        isCompleted: result.Item.isCompleted,
        userId: result.Item.userId || undefined,
      };

      logger.info('Session retrieved from DynamoDB', {
        sessionId,
        currentQuestionIndex: session.currentQuestionIndex,
        isCompleted: session.isCompleted,
      });

      return session;
      
    } catch (error) {
      logger.error('Failed to get session from DynamoDB', error, { sessionId });
      throw new Error(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a quiz session
   */
  async updateSession(
    sessionId: string,
    answer: UserAnswer,
    currentQuestion: QuizQuestion
  ): Promise<QuizSession | null> {
    try {
      // First get the current session
      const currentSession = await this.getSession(sessionId);
      if (!currentSession) {
        return null;
      }

      // Update the session data
      currentSession.answers.push(answer);
      if (answer.isCorrect) {
        currentSession.correctAnswers++;
      }
      currentSession.currentQuestionIndex++;
      currentSession.score = Math.round((currentSession.correctAnswers / currentSession.currentQuestionIndex) * 100);
      
      if (currentSession.currentQuestionIndex >= currentSession.totalQuestions) {
        currentSession.isCompleted = true;
        currentSession.endTime = new Date();
      }

      // Update in DynamoDB
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { sessionId },
        UpdateExpression: `
          SET currentQuestionIndex = :currentQuestionIndex,
              score = :score,
              correctAnswers = :correctAnswers,
              answers = :answers,
              isCompleted = :isCompleted,
              endTime = :endTime
        `,
        ExpressionAttributeValues: {
          ':currentQuestionIndex': currentSession.currentQuestionIndex,
          ':score': currentSession.score,
          ':correctAnswers': currentSession.correctAnswers,
          ':answers': currentSession.answers,
          ':isCompleted': currentSession.isCompleted,
          ':endTime': currentSession.endTime ? currentSession.endTime.toISOString() : null,
        },
        ReturnValues: 'ALL_NEW',
      });

      await this.client.send(command);
      
      logger.info('Session updated in DynamoDB', {
        sessionId,
        currentQuestionIndex: currentSession.currentQuestionIndex,
        score: currentSession.score,
        isCompleted: currentSession.isCompleted,
      });

      return currentSession;
      
    } catch (error) {
      logger.error('Failed to update session in DynamoDB', error, { sessionId });
      throw new Error(`Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a quiz session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { sessionId },
      });

      await this.client.send(command);
      
      logger.info('Session deleted from DynamoDB', { sessionId });
      
    } catch (error) {
      logger.error('Failed to delete session from DynamoDB', error, { sessionId });
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get session statistics (for admin/monitoring)
   */
  async getSessionStats() {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        ProjectionExpression: 'sessionId, currentQuestionIndex, totalQuestions, score, isCompleted, startTime',
      });

      const result = await this.client.send(command);
      
      return {
        activeSessions: result.Items?.length || 0,
        sessions: result.Items?.map(item => ({
          sessionId: item.sessionId,
          progress: `${item.currentQuestionIndex}/${item.totalQuestions}`,
          score: item.score,
          isCompleted: item.isCompleted,
          startTime: new Date(item.startTime),
        })) || [],
      };
      
    } catch (error) {
      logger.error('Failed to get session stats from DynamoDB', error);
      throw new Error(`Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test DynamoDB connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to describe the table
      await this.client.send(new ScanCommand({
        TableName: this.tableName,
        Limit: 1,
      }));
      
      return true;
      
    } catch (error) {
      logger.error('DynamoDB connection test failed', error);
      return false;
    }
  }
}
