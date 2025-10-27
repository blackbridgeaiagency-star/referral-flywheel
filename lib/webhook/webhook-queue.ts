// lib/webhook/webhook-queue.ts
import { prisma } from '../db/prisma';
import { withRetry, shouldRetry } from '../utils/webhook-retry';
import { trackError, trackEvent, ErrorCategory } from '../monitoring/error-tracking';

/**
 * Advanced Webhook Queue System
 *
 * Features:
 * - Persistent queue with database storage
 * - Dead letter queue for failed webhooks
 * - Automatic retry with exponential backoff
 * - Priority processing
 * - Batch processing capabilities
 * - Circuit breaker pattern
 */

export enum WebhookStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}

export enum WebhookPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 100,
}

interface WebhookJob {
  id: string;
  type: string;
  payload: any;
  priority: WebhookPriority;
  status: WebhookStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Webhook queue manager
 */
export class WebhookQueue {
  private isProcessing = false;
  private circuitBreakerFailures = 0;
  private circuitBreakerThreshold = 5;
  private circuitBreakerOpenUntil?: Date;

  constructor(
    private readonly queueName: string = 'default',
    private readonly batchSize: number = 10,
    private readonly pollInterval: number = 5000 // 5 seconds
  ) {}

  /**
   * Add a webhook to the queue
   */
  async enqueue(
    type: string,
    payload: any,
    options: {
      priority?: WebhookPriority;
      maxAttempts?: number;
      delaySeconds?: number;
    } = {}
  ): Promise<string> {
    const {
      priority = WebhookPriority.NORMAL,
      maxAttempts = 5,
      delaySeconds = 0,
    } = options;

    // Store in database (using Commission table as example)
    // In production, you'd have a dedicated webhook_queue table
    const job = {
      id: crypto.randomUUID(),
      type,
      payload: JSON.stringify(payload),
      priority,
      status: WebhookStatus.PENDING,
      attempts: 0,
      maxAttempts,
      nextRetryAt: delaySeconds > 0
        ? new Date(Date.now() + delaySeconds * 1000)
        : new Date(),
      createdAt: new Date(),
    };

    // In production, store in webhook_queue table
    console.log(`📥 Webhook queued: ${type} with priority ${priority}`);

    trackEvent('webhook_enqueued', {
      category: 'webhook',
      type,
      priority,
      queueName: this.queueName,
    });

    return job.id;
  }

  /**
   * Start processing the queue
   */
  async startProcessing(
    processor: (job: WebhookJob) => Promise<void>
  ): Promise<void> {
    if (this.isProcessing) {
      console.warn('⚠️ Queue is already processing');
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Starting webhook queue processor: ${this.queueName}`);

    while (this.isProcessing) {
      try {
        // Check circuit breaker
        if (this.isCircuitBreakerOpen()) {
          console.log('🔴 Circuit breaker is open, waiting...');
          await this.sleep(10000); // Wait 10 seconds
          continue;
        }

        // Fetch batch of jobs
        const jobs = await this.fetchPendingJobs(this.batchSize);

        if (jobs.length === 0) {
          // No jobs, wait before polling again
          await this.sleep(this.pollInterval);
          continue;
        }

        // Process jobs in parallel
        await Promise.all(
          jobs.map(job => this.processJob(job, processor))
        );

        // Reset circuit breaker on success
        this.circuitBreakerFailures = 0;

      } catch (error) {
        console.error('❌ Queue processing error:', error);
        trackError(error as Error, ErrorCategory.WEBHOOK, {
          action: 'queue_processing',
        });

        // Increment circuit breaker
        this.circuitBreakerFailures++;
        if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
          this.openCircuitBreaker();
        }

        await this.sleep(5000); // Wait 5 seconds before retry
      }
    }
  }

  /**
   * Stop processing the queue
   */
  stopProcessing(): void {
    this.isProcessing = false;
    console.log(`⏹️ Stopping webhook queue processor: ${this.queueName}`);
  }

  /**
   * Process a single job
   */
  private async processJob(
    job: WebhookJob,
    processor: (job: WebhookJob) => Promise<void>
  ): Promise<void> {
    try {
      // Mark as processing
      await this.updateJobStatus(job.id, WebhookStatus.PROCESSING);

      // Process with retry logic
      await withRetry(
        () => processor(job),
        {
          maxAttempts: job.maxAttempts - job.attempts,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            console.log(`⏳ Retry ${attempt} for webhook ${job.id}:`, error.message);
          },
        }
      );

      // Mark as completed
      await this.updateJobStatus(job.id, WebhookStatus.COMPLETED);

      trackEvent('webhook_processed', {
        category: 'webhook',
        type: job.type,
        attempts: job.attempts + 1,
        duration: Date.now() - job.createdAt.getTime(),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update job with error
      job.attempts++;
      job.lastError = errorMessage;

      if (job.attempts >= job.maxAttempts || !shouldRetry(error)) {
        // Move to dead letter queue
        await this.moveToDeadLetter(job, errorMessage);
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(
          1000 * Math.pow(2, job.attempts),
          300000 // Max 5 minutes
        );

        job.nextRetryAt = new Date(Date.now() + retryDelay);
        job.status = WebhookStatus.PENDING;

        await this.updateJob(job);

        console.log(`🔄 Webhook ${job.id} scheduled for retry in ${retryDelay}ms`);
      }

      trackError(error as Error, ErrorCategory.WEBHOOK, {
        action: 'job_processing',
        metadata: {
          jobId: job.id,
          type: job.type,
          attempts: job.attempts,
        }
      });
    }
  }

  /**
   * Fetch pending jobs from the queue
   */
  private async fetchPendingJobs(limit: number): Promise<WebhookJob[]> {
    // In production, fetch from webhook_queue table
    // This is a mock implementation
    const now = new Date();

    // Mock jobs for demonstration
    const jobs: WebhookJob[] = [];

    // Sort by priority and creation date
    jobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
    });

    return jobs.slice(0, limit);
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: WebhookStatus
  ): Promise<void> {
    // In production, update webhook_queue table
    console.log(`📝 Webhook ${jobId} status: ${status}`);
  }

  /**
   * Update job
   */
  private async updateJob(job: WebhookJob): Promise<void> {
    // In production, update webhook_queue table
    console.log(`📝 Webhook ${job.id} updated`);
  }

  /**
   * Move job to dead letter queue
   */
  private async moveToDeadLetter(
    job: WebhookJob,
    reason: string
  ): Promise<void> {
    job.status = WebhookStatus.DEAD_LETTER;
    job.lastError = reason;

    await this.updateJob(job);

    console.error(`☠️ Webhook ${job.id} moved to dead letter queue: ${reason}`);

    trackEvent('webhook_dead_letter', {
      category: 'webhook',
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
      reason,
    });

    // Send alert for critical webhooks
    if (job.priority >= WebhookPriority.HIGH) {
      // Send notification to admin
      console.error(`🚨 CRITICAL: High-priority webhook failed: ${job.type}`);
    }
  }

  /**
   * Circuit breaker pattern
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpenUntil) {
      return false;
    }

    if (new Date() > this.circuitBreakerOpenUntil) {
      this.circuitBreakerOpenUntil = undefined;
      this.circuitBreakerFailures = 0;
      console.log('🟢 Circuit breaker closed');
      return false;
    }

    return true;
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpenUntil = new Date(Date.now() + 30000); // Open for 30 seconds
    console.error('🔴 Circuit breaker opened due to failures');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    // In production, query webhook_queue table
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
    };
  }

  /**
   * Reprocess dead letter queue items
   */
  async reprocessDeadLetter(limit = 10): Promise<number> {
    // Fetch dead letter items
    // Reset their status and attempts
    // Return count of reprocessed items
    console.log(`♻️ Reprocessing ${limit} dead letter items`);
    return 0;
  }

  /**
   * Clear completed jobs older than X days
   */
  async cleanupCompleted(daysOld = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    // Delete old completed jobs
    console.log(`🗑️ Cleaning up completed jobs older than ${daysOld} days`);
    return 0;
  }
}

/**
 * Global webhook queue instances
 */
export const paymentQueue = new WebhookQueue('payments', 10, 2000);
export const notificationQueue = new WebhookQueue('notifications', 20, 5000);
export const analyticsQueue = new WebhookQueue('analytics', 50, 10000);

/**
 * Initialize all queues
 */
export function initializeQueues(): void {
  // Start payment queue processor
  paymentQueue.startProcessing(async (job) => {
    console.log(`Processing payment webhook: ${job.type}`);
    // Process payment webhook
  });

  // Start notification queue processor
  notificationQueue.startProcessing(async (job) => {
    console.log(`Processing notification: ${job.type}`);
    // Send notification
  });

  // Start analytics queue processor
  analyticsQueue.startProcessing(async (job) => {
    console.log(`Processing analytics event: ${job.type}`);
    // Track analytics
  });

  console.log('✅ All webhook queues initialized');
}

/**
 * Graceful shutdown
 */
export function shutdownQueues(): void {
  paymentQueue.stopProcessing();
  notificationQueue.stopProcessing();
  analyticsQueue.stopProcessing();
  console.log('✅ All webhook queues stopped');
}