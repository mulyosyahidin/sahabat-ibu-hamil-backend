import { PrismaClient } from '@/generated/prisma';
import { 
  reminderQueue, 
  createReminderWorker, 
  queueManager, 
  type SendReminderJobData 
} from '@/config/bullmq';
import type { Worker } from 'bullmq';

export class QueueService {
  private prisma: PrismaClient;
  private reminderWorker: Worker | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize the queue service and start workers
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Queue Service...');
      
      // Create and start the reminder worker
      this.reminderWorker = createReminderWorker(this.prisma);
      
      console.log('✅ Queue Service initialized successfully');
      console.log('📋 Available queues: reminder-queue');
      
      // Log queue statistics
      const stats = await queueManager.getQueueStats();
      console.log('📊 Queue Statistics:', stats);
      
    } catch (error) {
      console.error('❌ Failed to initialize Queue Service:', error);
      throw error;
    }
  }

  /**
   * Schedule a reminder job
   */
  async scheduleReminder(
    reminderId: number,
    chatId: number,
    message: string,
    scheduledFor: Date
  ): Promise<string> {
    try {
      const jobData: SendReminderJobData = {
        reminderId,
        chatId,
        message,
        scheduledFor,
      };

      // Add job to queue
      const jobId = await queueManager.addReminderJob(jobData, scheduledFor);

      // Create ReminderJob record in database
      await this.prisma.reminderJob.create({
        data: {
          id: jobId,
          reminder_id: reminderId,
          status: 'WAITING',
          scheduled_for: scheduledFor,
          created_at: new Date(),
          attempts: 0,
        },
      });

      console.log(`📅 Reminder scheduled: Job ${jobId} for reminder ${reminderId}`);
      return jobId;

    } catch (error) {
      console.error('❌ Failed to schedule reminder:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled reminder job
   */
  async cancelReminder(jobId: string): Promise<boolean> {
    try {
      // Remove job from queue
      const removed = await queueManager.removeJob(jobId);
      
      if (removed) {
        // Update ReminderJob status in database
        await this.prisma.reminderJob.update({
          where: { id: jobId },
          data: {
            status: 'REMOVED',
            updated_at: new Date(),
          },
        });

        console.log(`🗑️ Reminder cancelled: Job ${jobId}`);
      }

      return removed;

    } catch (error) {
      console.error(`❌ Failed to cancel reminder job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return await queueManager.getQueueStats();
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanQueue(): Promise<void> {
    await queueManager.cleanQueue();
  }

  /**
   * Get all jobs for a specific reminder
   */
  async getReminderJobs(reminderId: number) {
    return await this.prisma.reminderJob.findMany({
      where: { reminder_id: reminderId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get job details by job ID
   */
  async getJobDetails(jobId: string) {
    try {
      const job = await reminderQueue.getJob(jobId);
      const dbJob = await this.prisma.reminderJob.findUnique({
        where: { id: jobId },
        include: {
          reminder: true,
        },
      });

      return {
        queueJob: job ? {
          id: job.id,
          name: job.name,
          data: job.data,
          opts: job.opts,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
          finishedOn: job.finishedOn,
          processedOn: job.processedOn,
        } : null,
        dbJob,
      };

    } catch (error) {
      console.error(`❌ Failed to get job details for ${jobId}:`, error);
      return { queueJob: null, dbJob: null };
    }
  }

  /**
   * Reschedule a reminder job
   */
  async rescheduleReminder(
    jobId: string,
    newScheduledFor: Date
  ): Promise<string | null> {
    try {
      // Get the original job data
      const jobDetails = await this.getJobDetails(jobId);
      
      if (!jobDetails.dbJob || !jobDetails.queueJob) {
        throw new Error('Job not found');
      }

      // Cancel the existing job
      await this.cancelReminder(jobId);

      // Create a new job with the same data but new schedule
      const jobData = jobDetails.queueJob.data as SendReminderJobData;
      const newJobId = await this.scheduleReminder(
        jobData.reminderId,
        jobData.chatId,
        jobData.message,
        newScheduledFor
      );

      console.log(`🔄 Reminder rescheduled: ${jobId} → ${newJobId}`);
      return newJobId;

    } catch (error) {
      console.error(`❌ Failed to reschedule reminder job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Gracefully shutdown the queue service
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down Queue Service...');
      
      if (this.reminderWorker) {
        await this.reminderWorker.close();
        this.reminderWorker = null;
      }

      console.log('✅ Queue Service shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during Queue Service shutdown:', error);
    }
  }

  /**
   * Health check for the queue service
   */
  async healthCheck(): Promise<{ status: string; queues: any }> {
    try {
      const stats = await this.getQueueStats();
      
      return {
        status: 'healthy',
        queues: {
          'reminder-queue': stats,
        },
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        queues: {},
      };
    }
  }
}

export default QueueService;