import { Queue, Worker, QueueEvents } from 'bullmq';
import { createBullMQRedisConnection } from './redis';
import type { PrismaClient } from '@/generated/prisma';
import { appInstanceManager } from '@/utils/app-instance.util';
import { WhatsAppService } from '@/services/app/whatsapp/whatsapp.service';

// Bull MQ configuration
export const QUEUE_NAMES = {
  REMINDER: 'reminder-queue',
} as const;

// Job types
export const JOB_TYPES = {
  SEND_REMINDER: 'send-reminder',
} as const;

// Job data interfaces
export interface SendReminderJobData {
  reminderId: number;
  chatId: number;
  message: string;
  scheduledFor: Date;
}

// Queue configuration options
const queueOptions = {
  connection: createBullMQRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry failed jobs 3 times
    backoff: {
      type: 'exponential' as const,
      delay: 2000,         // Start with 2 second delay
    },
  },
};

// Create reminder queue
export const reminderQueue = new Queue(QUEUE_NAMES.REMINDER, queueOptions);

// Queue events for monitoring
export const reminderQueueEvents = new QueueEvents(QUEUE_NAMES.REMINDER, {
  connection: createBullMQRedisConnection(),
});

// Queue event listeners
reminderQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`✅ Reminder job ${jobId} completed successfully`);
});

reminderQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Reminder job ${jobId} failed:`, failedReason);
});

reminderQueueEvents.on('active', ({ jobId }) => {
  console.log(`🔄 Reminder job ${jobId} started processing`);
});

// Worker processor function
export const createReminderWorker = (prisma: PrismaClient) => {
  return new Worker(
    QUEUE_NAMES.REMINDER,
    async (job) => {
      const { reminderId, chatId, message, scheduledFor } = job.data as SendReminderJobData;
      
      console.log(`Processing reminder job ${job.id} for reminder ${reminderId}`);
      
      try {
        // check is reminder exist
        const reminder = await prisma.reminder.findUnique({
          where: { id: reminderId },
        });

        if (!reminder) {
          console.error(`Reminder with id ${reminderId} not found`);
          
          return;
        }

        // Update ReminderJob status to active
        await prisma.reminderJob.update({
          where: { id: job.id! },
          data: {
            status: 'ACTIVE',
            started_at: new Date(),
            attempts: job.attemptsMade + 1,
          },
        });

        // Get WhatsApp service instance
        const whatsappService = appInstanceManager.getWhatsAppService();
        
        if (!whatsappService) {
          throw new Error('WhatsApp service not available');
        }

        // Get chat information to retrieve device and phone number
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { device: true }
        });

        if (!chat) {
          throw new Error(`Chat with id ${chatId} not found`);
        }

        if (!chat.device) {
          throw new Error(`Device not found for chat ${chatId}`);
        }

        // Format phone number for WhatsApp (ensure it starts with 62)
        const formattedNumber = chat.wa_number.startsWith('62') 
          ? chat.wa_number 
          : `62${chat.wa_number.replace(/^0/, '')}`;

        // Send WhatsApp message
        console.log(`📱 Sending reminder to chat ${chatId} (${formattedNumber}) via device ${chat.device.code}: ${message}`);
        
        // For demo purposes, we'll use console.log instead of actual WhatsApp sending
        // Uncomment the line below when ready to send actual WhatsApp messages
        await whatsappService.sendTextMessage(chat.device.code, formattedNumber, message);
        
        console.log(`✅ WhatsApp reminder has been sent to ${formattedNumber} via device ${chat.device.code}`);
        console.log(`📄 Message content: ${message}`);
        
        // Create reminder log entry
        await prisma.reminderLog.create({
          data: {
            reminder_id: reminderId,
            status: 'SENT',
            scheduled_for: scheduledFor,
            executed_at: new Date(),
            message_sent: message,
            job_id: job.id!,
          },
        });

        // Update ReminderJob status to completed
        await prisma.reminderJob.update({
          where: { id: job.id! },
          data: {
            status: 'COMPLETED',
            completed_at: new Date(),
          },
        });

        console.log(`✅ Reminder sent successfully for reminder ID: ${reminderId}`);

        // Schedule next reminder (24 hours later at the same time)
        const nextScheduledTime = new Date(scheduledFor);
        nextScheduledTime.setDate(nextScheduledTime.getDate() + 1); // Add 1 day
        
        // Create new reminder job for tomorrow
        const nextJobData: SendReminderJobData = {
          reminderId,
          chatId,
          message,
          scheduledFor: nextScheduledTime
        };
        
        const nextJobId = await queueManager.addReminderJob(nextJobData, nextScheduledTime);

        // Create new reminder job record in database
        await prisma.reminderJob.create({
          data: {
            id: nextJobId,
            reminder_id: reminderId,
            scheduled_for: nextScheduledTime,
            status: 'WAITING',
            message: message
          }
        });

        console.log(`🔄 Next reminder scheduled for: ${nextScheduledTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);

        return { success: true, message: 'Reminder sent successfully' };
        
      } catch (error) {
        console.error(`Error processing reminder job ${job.id}:`, error);
        
        // Update ReminderJob status to failed
        await prisma.reminderJob.update({
          where: { id: job.id! },
          data: {
            status: 'FAILED',
            failed_at: new Date(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
            attempts: job.attemptsMade + 1,
          },
        });

        // Create failed reminder log entry
        await prisma.reminderLog.create({
          data: {
            reminder_id: reminderId,
            status: 'FAILED',
            scheduled_for: scheduledFor,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            job_id: job.id!,
          },
        });

        throw error;
      }
    },
    {
      connection: createBullMQRedisConnection(),
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );
};

// Queue management functions
export const queueManager = {
  // Add a reminder job to the queue
  async addReminderJob(data: SendReminderJobData, scheduledFor: Date): Promise<string> {
    const job = await reminderQueue.add(
      JOB_TYPES.SEND_REMINDER,
      data,
      {
        delay: scheduledFor.getTime() - Date.now(), // Schedule for future execution
        jobId: `reminder-${data.reminderId}-${Date.now()}`, // Unique job ID
      }
    );
    
    console.log(`📅 Scheduled reminder job ${job.id} for ${scheduledFor.toISOString()}`);
    return job.id!;
  },

  // Remove a job from the queue
  async removeJob(jobId: string): Promise<boolean> {
    try {
      const job = await reminderQueue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`🗑️ Removed job ${jobId} from queue`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error removing job ${jobId}:`, error);
      return false;
    }
  },

  // Get queue statistics
  async getQueueStats() {
    const waiting = await reminderQueue.getWaiting();
    const active = await reminderQueue.getActive();
    const completed = await reminderQueue.getCompleted();
    const failed = await reminderQueue.getFailed();
    const delayed = await reminderQueue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  },

  // Clean old jobs
  async cleanQueue(): Promise<void> {
    await reminderQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Clean completed jobs older than 24 hours
    await reminderQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Clean failed jobs older than 7 days
    console.log('🧹 Queue cleaned successfully');
  },
};

// Graceful shutdown
export const shutdownBullMQ = async (): Promise<void> => {
  console.log('🔄 Shutting down Bull MQ...');
  
  await reminderQueue.close();
  await reminderQueueEvents.close();
  
  console.log('✅ Bull MQ shutdown complete');
};

export default {
  reminderQueue,
  reminderQueueEvents,
  createReminderWorker,
  queueManager,
  shutdownBullMQ,
};