// lib/queue/webhook-queue.ts
import { prisma } from '../db/prisma';
import { cache } from '../cache/redis';

/**
 * Webhook job status
 */
export enum WebhookJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  DEAD = 'DEAD', // Max retries exceeded
}

/**
 * Webhook job priority
 */
export enum WebhookPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 100,
}

/**
 * Webhook job interface
 */
export interface WebhookJob {
  id: string;
  type: string;
  payload: any;
  status: WebhookJobStatus;
  priority: WebhookPriority;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  nextRetryAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Webhook processor interface
 */
export interface WebhookProcessor {
  type: string;
  process: (job: WebhookJob) => Promise<void>;
  onError?: (job: WebhookJob, error: Error) => Promise<void>;
  shouldRetry?: (job: WebhookJob, error: Error) => boolean;
}

/**
 * Webhook queue configuration
 */
export interface QueueConfig {
  maxConcurrency: number;
  pollInterval: number;
  retryDelayMs: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  deadLetterAfter: number;
  batchSize: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrency: 10,
  pollInterval: 5000, // 5 seconds
  retryDelayMs: 1000, // 1 second base retry
  maxRetryDelay: 300000, // 5 minutes max
  backoffMultiplier: 2, // Exponential backoff
  deadLetterAfter: 5, // Max retries
  batchSize: 20,
};

/**
 * Webhook Queue Manager
 */
export class WebhookQueue {
  private processors: Map<string, WebhookProcessor> = new Map();
  private config: QueueConfig;
  private isRunning: boolean = false;
  private activeJobs: Set<string> = new Set();
  private pollTimer?: NodeJS.Timeout;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultProcessors();
  }

  /**
   * Register default webhook processors
   */
  private registerDefaultProcessors() {
    // Payment webhook processor
    this.registerProcessor({
      type: 'payment',
      process: async (job) => {
        const { paymentId, userId, amount, productId } = job.payload;

        // Process payment webhook
        console.log(`Processing payment webhook: ${paymentId}`);

        // Your payment processing logic here
        // This would include commission calculation, member updates, etc.
      },
      shouldRetry: (job, error) => {
        // Retry on network errors, don't retry on validation errors
        return !error.message.includes('validation');
      },
    });

    // Member signup webhook processor
    this.registerProcessor({
      type: 'member.signup',
      process: async (job) => {
        const { memberId, email, referralCode } = job.payload;

        console.log(`Processing member signup: ${memberId}`);

        // Send welcome message, update stats, etc.
      },
    });

    // Refund webhook processor
    this.registerProcessor({
      type: 'refund',
      process: async (job) => {
        const { refundId, paymentId, amount } = job.payload;

        console.log(`Processing refund webhook: ${refundId}`);

        // Handle refund logic, update commissions, etc.
      },
    });
  }

  /**
   * Register a webhook processor
   */
  registerProcessor(processor: WebhookProcessor) {
    this.processors.set(processor.type, processor);
    console.log(`✅ Registered webhook processor: ${processor.type}`);
  }

  /**
   * Add a job to the queue
   */
  async enqueue(
    type: string,
    payload: any,
    options: {
      priority?: WebhookPriority;
      maxAttempts?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const jobId = `webhook_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: WebhookJob = {
      id: jobId,
      type,
      payload,
      status: WebhookJobStatus.PENDING,
      priority: options.priority || WebhookPriority.NORMAL,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.config.deadLetterAfter,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options.metadata,
    };

    // Store job in cache/database
    await this.saveJob(job);

    console.log(`📥 Enqueued webhook job: ${jobId} (type: ${type})`);

    // If queue is running, it will pick up the job automatically
    // Otherwise, you might want to trigger processing
    if (!this.isRunning) {
      this.processNext();
    }

    return jobId;
  }

  /**
   * Start the queue processor
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Webhook queue already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting webhook queue processor');

    // Start polling for jobs
    this.poll();
  }

  /**
   * Stop the queue processor
   */
  async stop() {
    console.log('🛑 Stopping webhook queue processor');
    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }

    // Wait for active jobs to complete
    while (this.activeJobs.size > 0) {
      console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs to complete`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Webhook queue stopped');
  }

  /**
   * Poll for new jobs
   */
  private async poll() {
    if (!this.isRunning) return;

    try {
      await this.processNext();
    } catch (error) {
      console.error('Error in queue poll:', error);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollInterval);
  }

  /**
   * Process next batch of jobs
   */
  private async processNext() {
    if (this.activeJobs.size >= this.config.maxConcurrency) {
      return; // Already at max concurrency
    }

    const availableSlots = this.config.maxConcurrency - this.activeJobs.size;
    const jobs = await this.getNextJobs(Math.min(availableSlots, this.config.batchSize));

    if (jobs.length === 0) return;

    // Process jobs in parallel
    await Promise.all(
      jobs.map(job => this.processJob(job).catch(err => {
        console.error(`Error processing job ${job.id}:`, err);
      }))
    );
  }

  /**
   * Process a single job
   */
  private async processJob(job: WebhookJob) {
    if (this.activeJobs.has(job.id)) {
      return; // Already processing
    }

    this.activeJobs.add(job.id);

    try {
      // Update job status
      job.status = WebhookJobStatus.PROCESSING;
      job.attempts++;
      await this.saveJob(job);

      console.log(`⚙️ Processing webhook job: ${job.id} (attempt ${job.attempts})`);

      // Get processor
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor for webhook type: ${job.type}`);
      }

      // Process the job
      await processor.process(job);

      // Mark as completed
      job.status = WebhookJobStatus.COMPLETED;
      job.processedAt = new Date();
      await this.saveJob(job);

      console.log(`✅ Webhook job completed: ${job.id}`);
    } catch (error: any) {
      console.error(`❌ Webhook job failed: ${job.id}`, error);

      // Get processor for error handling
      const processor = this.processors.get(job.type);

      // Check if should retry
      const shouldRetry = processor?.shouldRetry
        ? processor.shouldRetry(job, error)
        : job.attempts < job.maxAttempts;

      if (shouldRetry && job.attempts < job.maxAttempts) {
        // Calculate retry delay with exponential backoff
        const delay = Math.min(
          this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, job.attempts - 1),
          this.config.maxRetryDelay
        );

        job.status = WebhookJobStatus.RETRYING;
        job.lastError = error.message;
        job.nextRetryAt = new Date(Date.now() + delay);

        console.log(`🔄 Scheduling retry for ${job.id} in ${delay}ms`);
      } else {
        // Move to dead letter queue
        job.status = WebhookJobStatus.DEAD;
        job.lastError = error.message;

        console.error(`💀 Job moved to dead letter: ${job.id}`);

        // Call error handler if provided
        if (processor?.onError) {
          await processor.onError(job, error);
        }
      }

      await this.saveJob(job);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Get next jobs to process
   */
  private async getNextJobs(limit: number): Promise<WebhookJob[]> {
    const cacheKey = 'webhook:queue:pending';

    // In a real implementation, this would query a database
    // For now, we'll use a simple cache-based approach
    const jobs: WebhookJob[] = [];

    // Get pending and retry-ready jobs
    const now = new Date();

    // This is a simplified version - in production, use a proper job queue
    // like Bull, BullMQ, or database-backed queue
    const pendingJobs = await cache.get<WebhookJob[]>(cacheKey) || [];

    const readyJobs = pendingJobs
      .filter(job =>
        (job.status === WebhookJobStatus.PENDING ||
         (job.status === WebhookJobStatus.RETRYING && job.nextRetryAt && job.nextRetryAt <= now)) &&
        !this.activeJobs.has(job.id)
      )
      .sort((a, b) => b.priority - a.priority) // Sort by priority
      .slice(0, limit);

    return readyJobs;
  }

  /**
   * Save job state
   */
  private async saveJob(job: WebhookJob) {
    job.updatedAt = new Date();

    // In production, save to database
    // For now, we'll use cache
    const cacheKey = `webhook:job:${job.id}`;
    await cache.set(cacheKey, job, 86400); // 24 hour TTL

    // Also update the queue list
    const queueKey = 'webhook:queue:pending';
    const queue = await cache.get<WebhookJob[]>(queueKey) || [];

    const index = queue.findIndex(j => j.id === job.id);
    if (index >= 0) {
      queue[index] = job;
    } else {
      queue.push(job);
    }

    await cache.set(queueKey, queue, 86400);
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<WebhookJob | null> {
    const cacheKey = `webhook:job:${jobId}`;
    return cache.get<WebhookJob>(cacheKey);
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== WebhookJobStatus.FAILED && job.status !== WebhookJobStatus.DEAD) {
      throw new Error(`Job cannot be retried in status: ${job.status}`);
    }

    job.status = WebhookJobStatus.PENDING;
    job.attempts = 0;
    job.lastError = undefined;
    job.nextRetryAt = undefined;

    await this.saveJob(job);
    console.log(`🔄 Job queued for retry: ${jobId}`);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    dead: number;
  }> {
    const queueKey = 'webhook:queue:pending';
    const queue = await cache.get<WebhookJob[]>(queueKey) || [];

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0,
    };

    for (const job of queue) {
      switch (job.status) {
        case WebhookJobStatus.PENDING:
          stats.pending++;
          break;
        case WebhookJobStatus.PROCESSING:
          stats.processing++;
          break;
        case WebhookJobStatus.COMPLETED:
          stats.completed++;
          break;
        case WebhookJobStatus.FAILED:
        case WebhookJobStatus.RETRYING:
          stats.failed++;
          break;
        case WebhookJobStatus.DEAD:
          stats.dead++;
          break;
      }
    }

    return stats;
  }

  /**
   * Clear dead letter queue
   */
  async clearDeadLetters(): Promise<number> {
    const queueKey = 'webhook:queue:pending';
    const queue = await cache.get<WebhookJob[]>(queueKey) || [];

    const deadJobs = queue.filter(j => j.status === WebhookJobStatus.DEAD);
    const activeQueue = queue.filter(j => j.status !== WebhookJobStatus.DEAD);

    await cache.set(queueKey, activeQueue, 86400);

    console.log(`🗑️ Cleared ${deadJobs.length} dead letter jobs`);
    return deadJobs.length;
  }
}

// Export singleton instance
export const webhookQueue = new WebhookQueue();

/**
 * Initialize and start the webhook queue
 */
export function initWebhookQueue() {
  webhookQueue.start();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, stopping webhook queue');
    await webhookQueue.stop();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, stopping webhook queue');
    await webhookQueue.stop();
  });
}