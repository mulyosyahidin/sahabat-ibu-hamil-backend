import type { PrismaClient, Reminder, ReminderTimeOfDay } from "@/generated/prisma";
import type { QueueService } from "./queue.service";
import { setCustomTime } from "@/utils";

// Time slot constants - updated to match ReminderTimeOfDay enum
export const TIME_SLOTS = {
  MORNING: 'MORNING' as const,
  AFTERNOON: 'AFTERNOON' as const,
  EVENING: 'EVENING' as const,
  CUSTOM: 'CUSTOM' as const
} as const;

export type TimeSlot = ReminderTimeOfDay;

// Message templates for each time slot - 10 messages per time slot
const REMINDER_MESSAGES = {
  [TIME_SLOTS.MORNING]: [
    {
      title: '🌅 Selamat Pagi, Bunda!',
      message: 'Semangat pagi! Jangan lupa sarapan bergizi dan minum vitamin prenatal ya. Hari ini adalah hari yang indah untuk merawat diri dan si kecil dalam kandungan. 💕'
    },
    {
      title: '🌅 Pagi yang Cerah, Bunda!',
      message: 'Mulai hari dengan penuh syukur! Sarapan dengan makanan kaya folat seperti bayam dan alpukat. Jangan lupa minum air putih yang cukup untuk menjaga hidrasi. ✨'
    },
    {
      title: '🌅 Selamat Pagi, Calon Mama!',
      message: 'Bangun pagi adalah berkah! Lakukan peregangan ringan dan nikmati udara segar. Pastikan sarapan mengandung protein dan karbohidrat kompleks. 🤗'
    },
    {
      title: '🌅 Pagi Penuh Harapan!',
      message: 'Setiap pagi adalah kesempatan baru untuk merawat diri dan si kecil. Minum jus jeruk untuk vitamin C dan jangan skip sarapan ya, Bunda! 🍊'
    },
    {
      title: '🌅 Sunrise untuk Bunda!',
      message: 'Pagi ini, berikan yang terbaik untuk tubuh Bunda. Konsumsi makanan tinggi zat besi dan kalsium. Si kecil sedang tumbuh dengan sempurna! 💪'
    },
    {
      title: '🌅 Morning Blessing!',
      message: 'Bersyukur untuk kehamilan yang sehat! Mulai hari dengan oatmeal dan buah-buahan segar. Vitamin prenatal jangan sampai terlewat ya! 🥣'
    },
    {
      title: '🌅 Pagi yang Indah!',
      message: 'Nikmati momen kehamilan ini dengan penuh kebahagiaan. Sarapan dengan telur dan roti gandum untuk energi sepanjang hari. Love you, baby! 🥚'
    },
    {
      title: '🌅 Good Morning, Mama!',
      message: 'Tubuh Bunda bekerja keras untuk si kecil. Berikan nutrisi terbaik dengan sarapan seimbang dan jangan lupa minum susu hamil. 🥛'
    },
    {
      title: '🌅 Pagi Penuh Cinta!',
      message: 'Setiap detik, si kecil tumbuh dalam kasih sayang Bunda. Mulai hari dengan smoothie buah dan jangan lupa berdoa untuk keselamatan. 🙏'
    },
    {
      title: '🌅 Semangat Pagi, Bunda!',
      message: 'Hari baru, semangat baru! Konsumsi makanan kaya omega-3 seperti ikan salmon. Si kecil membutuhkan nutrisi untuk perkembangan otaknya. 🐟'
    }
  ],
  [TIME_SLOTS.AFTERNOON]: [
    {
      title: '☀️ Selamat Siang, Bunda!',
      message: 'Waktunya istirahat sejenak! Pastikan Bunda sudah makan siang yang bergizi dan minum air putih yang cukup. Jangan lupa untuk rileks dan nikmati momen kehamilan ini. 🤱'
    },
    {
      title: '☀️ Siang yang Hangat!',
      message: 'Pertengahan hari adalah waktu yang tepat untuk istirahat. Makan siang dengan sayuran hijau dan protein. Jangan lupa tidur siang sebentar ya! 😴'
    },
    {
      title: '☀️ Afternoon Break, Bunda!',
      message: 'Tubuh Bunda butuh energi di siang hari. Konsumsi makanan tinggi serat dan minum jus buah segar. Si kecil juga ikut merasakan kebahagiaan Bunda! 🥤'
    },
    {
      title: '☀️ Siang Penuh Berkah!',
      message: 'Jangan skip makan siang ya, Bunda! Pilih makanan yang kaya vitamin dan mineral. Istirahat sejenak untuk menjaga stamina sepanjang hari. 💆‍♀️'
    },
    {
      title: '☀️ Midday Reminder!',
      message: 'Siang hari adalah waktu untuk mengisi ulang energi. Makan siang dengan nasi, sayur, dan lauk bergizi. Hidrasi tubuh dengan air kelapa muda! 🥥'
    },
    {
      title: '☀️ Siang yang Produktif!',
      message: 'Sambil beraktivitas, jangan lupa menjaga kesehatan. Konsumsi camilan sehat seperti kacang-kacangan dan buah kering. Keep going, Mama! 🥜'
    },
    {
      title: '☀️ Lunch Time, Bunda!',
      message: 'Makan siang adalah fuel untuk sore hari. Pilih makanan yang mudah dicerna dan kaya nutrisi. Jangan lupa cuci tangan sebelum makan! 🍽️'
    },
    {
      title: '☀️ Siang Penuh Cinta!',
      message: 'Di tengah kesibukan, ingat untuk merawat diri. Makan siang dengan porsi yang cukup dan minum vitamin. Si kecil bangga dengan Bunda! 👶'
    },
    {
      title: '☀️ Afternoon Glow!',
      message: 'Sinar matahari siang memberikan vitamin D alami. Nikmati makan siang di tempat yang nyaman dan jangan lupa bersyukur atas kehamilan ini. ☀️'
    },
    {
      title: '☀️ Siang yang Menyegarkan!',
      message: 'Refresh tubuh dan pikiran dengan makan siang bergizi. Tambahkan yogurt untuk probiotik yang baik untuk pencernaan. Stay healthy, Bunda! 🥛'
    }
  ],
  [TIME_SLOTS.EVENING]: [
    {
      title: '🌙 Selamat Malam, Bunda!',
      message: 'Hari sudah malam, saatnya Bunda beristirahat. Jangan lupa minum susu hamil dan siapkan tidur yang nyenyak. Mimpi indah untuk Bunda dan si kecil! 😴'
    },
    {
      title: '🌙 Malam yang Tenang!',
      message: 'Waktunya wind down setelah hari yang panjang. Makan malam ringan dan minum teh chamomile untuk relaksasi. Selamat beristirahat, Mama! 🍵'
    },
    {
      title: '🌙 Evening Peace!',
      message: 'Malam adalah waktu untuk tubuh dan pikiran beristirahat. Konsumsi makanan yang mudah dicerna dan lakukan prenatal yoga ringan. 🧘‍♀️'
    },
    {
      title: '🌙 Malam Penuh Syukur!',
      message: 'Bersyukur untuk hari yang telah dilalui bersama si kecil. Makan malam dengan porsi sedang dan jangan lupa doa sebelum tidur. 🤲'
    },
    {
      title: '🌙 Goodnight Preparation!',
      message: 'Persiapkan tidur yang berkualitas untuk Bunda dan baby. Minum susu hangat dan baca buku kehamilan untuk menambah pengetahuan. 📚'
    },
    {
      title: '🌙 Malam yang Damai!',
      message: 'Setelah seharian beraktivitas, tubuh butuh istirahat. Hindari makanan berat dan pilih camilan sehat seperti pisang. Sweet dreams! 🍌'
    },
    {
      title: '🌙 Evening Blessing!',
      message: 'Malam ini, rasakan kehadiran si kecil dalam perut. Makan malam bergizi dan lakukan bonding time dengan berbicara pada baby. 💕'
    },
    {
      title: '🌙 Nighttime Routine!',
      message: 'Rutinitas malam yang baik penting untuk kehamilan sehat. Mandi air hangat, minum susu, dan siapkan mental untuk hari esok. 🛁'
    },
    {
      title: '🌙 Malam Penuh Cinta!',
      message: 'Cinta Bunda untuk si kecil semakin besar setiap hari. Nikmati makan malam bersama keluarga dan sharing kebahagiaan kehamilan. 👨‍👩‍👧‍👦'
    },
    {
      title: '🌙 Peaceful Evening!',
      message: 'Akhiri hari dengan hati yang tenang. Konsumsi makanan kaya magnesium untuk tidur yang nyenyak. Tomorrow is another beautiful day! ✨'
    }
  ],
  [TIME_SLOTS.CUSTOM]: [
    {
      title: '🕒 Waktu Kustom, Bunda!',
      message: 'Setel reminder sesuai dengan kebutuhan Bunda. Jangan lupa untuk merencanakan dengan baik. 🔔'
    },
  ],
};

export class ReminderService {
  private prisma: PrismaClient;
  private queueService: QueueService;

  constructor(prisma: PrismaClient, queueService: QueueService) {
    this.prisma = prisma;
    this.queueService = queueService;
  }

  /**
   * Get all active reminders for a specific chat
   */
  async getChatReminders(chatId: number): Promise<Reminder[]> {
    return await this.prisma.reminder.findMany({
      where: {
        chat_id: chatId,
        active: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  /**
   * Get all reminders (active and inactive) for a specific chat
   */
  async getAllChatReminders(chatId: number): Promise<Reminder[]> {
    return await this.prisma.reminder.findMany({
      where: {
        chat_id: chatId
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  /**
   * Get reminder count for a specific chat
   */
  async getChatReminderCount(chatId: number): Promise<number> {
    return await this.prisma.reminder.count({
      where: {
        chat_id: chatId,
        active: true
      }
    });
  }

  /**
   * Get a random message for a specific time slot
   */
  private getRandomMessageForTimeSlot(timeSlot: TimeSlot): { title: string; message: string } {
    const messages = REMINDER_MESSAGES[timeSlot];
    if (!messages || messages.length === 0) {
      // Fallback message if no messages are available for the time slot
      return {
        title: '🔔 Reminder',
        message: 'Jangan lupa untuk menjaga kesehatan Anda dan si kecil!'
      };
    }
    const randomIndex = Math.floor(Math.random() * messages.length);
    const selectedMessage = messages[randomIndex];

    // This should never happen given our length check above, but TypeScript needs assurance
    if (!selectedMessage) {
      return {
        title: '🔔 Reminder',
        message: 'Jangan lupa untuk menjaga kesehatan Anda dan si kecil!'
      };
    }

    return selectedMessage;
  }

  /**
   * Format message for WhatsApp delivery
   */
  private formatMessageForDelivery(messageData: { title: string; message: string }): string {
    return `${messageData.title}\n\n${messageData.message}`;
  }

  async createReminder(chatId: number, timeOfDay: ReminderTimeOfDay): Promise<Reminder> {
    const nextRunMessage = timeOfDay ? this.formatMessageForDelivery(this.getRandomMessageForTimeSlot(timeOfDay)) : null;

    const reminder = await this.prisma.reminder.create({
      data: {
        chat_id: chatId,
        time_of_day: timeOfDay,
        custom_time: null,
        active: true,
        next_run_message: nextRunMessage
      }
    });

    // Schedule the reminder job in BullMQ
    if (timeOfDay) {
      const nextScheduledTime = this.calculateNextScheduledTime(timeOfDay);
      await this.queueService.scheduleReminder(
        reminder.id, 
        reminder.chat_id, 
        reminder.next_run_message || '', 
        nextScheduledTime
      );
    }

    return reminder;
  }

  /**
   * Deactivate a reminder
   */
  async deactivateReminder(reminderId: number): Promise<Reminder> {
    return await this.prisma.reminder.update({
      where: { id: reminderId },
      data: { active: false }
    });
  }

  /**
   * Format reminder time display
   */
  formatReminderTime(timeOfDay: ReminderTimeOfDay | null, customTime?: string | null): string {
    if (!timeOfDay) return 'Belum diatur';

    switch (timeOfDay) {
      case TIME_SLOTS.MORNING:
        return '🌅 Pagi (08:00)';
      case TIME_SLOTS.AFTERNOON:
        return '☀️ Siang (12:00)';
      case TIME_SLOTS.EVENING:
        return '🌙 Malam (20:00)';
      case TIME_SLOTS.CUSTOM:
        return customTime ? `🕒 Waktu Kustom (${customTime})` : '🕒 Waktu Kustom (Belum diatur)';
      default:
        return `⏰ ${timeOfDay}`;
    }
  }

  /**
   * Generate text for deactivating reminders when none exist
   */
  generateNoRemindersToDeactivateText(): string {
    return '❌ *Nonaktifkan Reminder*\n\nAnda belum memiliki reminder aktif yang dapat dinonaktifkan.\nUntuk membuat reminder terlebih dahulu, silahkan pilih menu no 1️⃣\n\nKetik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';
  }

  /**
   * Generate text for checking reminders when none exist
   */
  generateNoRemindersToCheckText(): string {
    return '📝 *Jadwal Reminder Saya*\n\nAnda belum memiliki reminder aktif.\nUntuk membuat reminder, silahkan pilih menu no 1️⃣\n\nKetik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';
  }

  /**
   * Generate reminder list text for WhatsApp (when reminders exist)
   */
  generateActiveReminderListText(reminders: Reminder[]): string {
    let text = '📝 *Jadwal Reminder Saya*\n\n';

    reminders.forEach((reminder, index) => {
      const timeDisplay = this.formatReminderTime(reminder.time_of_day, reminder.custom_time);
      const status = reminder.active ? '✅ Aktif' : '❌ Nonaktif';

      text += `${timeDisplay}\n`;
      text += `${status}\n`;

      text += '\n';
    });

    text += 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, atau 0️⃣ untuk kembali ke menu utama';

    return text;
  }

  /**
   * Generate reminder list text for WhatsApp (legacy method for backward compatibility)
   */
  generateReminderListText(reminders: Reminder[]): string {
    if (reminders.length === 0) {
      return this.generateNoRemindersToCheckText();
    }
    return this.generateActiveReminderListText(reminders);
  }

  /**
   * Check if a reminder exists for a specific time slot
   */
  async hasReminderForTimeSlot(chatId: number, timeSlot: TimeSlot): Promise<boolean> {
    const count = await this.prisma.reminder.count({
      where: {
        chat_id: chatId,
        time_of_day: timeSlot,
        active: true
      }
    });
    return count > 0;
  }

  /**
   * Get existing reminders grouped by time slot (returns actual reminders)
   */
  getRemindersByTimeSlot(reminders: Reminder[]): Record<string, Reminder[]> {
    const grouped: Record<string, Reminder[]> = {
      [TIME_SLOTS.MORNING]: [],
      [TIME_SLOTS.AFTERNOON]: [],
      [TIME_SLOTS.EVENING]: [],
      [TIME_SLOTS.CUSTOM]: []
    };

    reminders.forEach(reminder => {
      if (reminder.time_of_day && grouped[reminder.time_of_day]) {
        grouped[reminder.time_of_day]!.push(reminder);
      }
    });

    return grouped;
  }

  /**
   * Get existing reminders grouped by time slot for a specific chat (only active reminders for availability check)
   */
  async getRemindersByTimeSlotForChat(chatId: number): Promise<Record<string, Reminder[]>> {
    const reminders = await this.getChatReminders(chatId);
    return this.getRemindersByTimeSlot(reminders);
  }

  /**
   * Get all reminders (active and inactive) grouped by time slot for a specific chat
   */
  async getAllRemindersByTimeSlotForChat(chatId: number): Promise<Record<string, Reminder[]>> {
    const reminders = await this.getAllChatReminders(chatId);
    return this.getRemindersByTimeSlot(reminders);
  }

  /**
   * Create reminder for specific time slot
   */
  async createReminderForTimeSlot(chatId: number, timeSlot: TimeSlot): Promise<Reminder> {
    // Check if active reminder already exists for this time slot
    const activeExists = await this.hasReminderForTimeSlot(chatId, timeSlot);
    if (activeExists) {
      throw new Error(`Reminder untuk waktu ${timeSlot} sudah ada`);
    }

    // Check if there's an inactive reminder for this time slot
    const inactiveReminder = await this.prisma.reminder.findFirst({
      where: {
        chat_id: chatId,
        time_of_day: timeSlot,
        active: false
      }
    });

    // If inactive reminder exists, reactivate it with new nextRunAt and nextRunMessage
    if (inactiveReminder) {
      const nextRunMessage = this.formatMessageForDelivery(this.getRandomMessageForTimeSlot(timeSlot));

      const reactivatedReminder = await this.prisma.reminder.update({
        where: { id: inactiveReminder.id },
        data: {
          active: true,
          next_run_message: nextRunMessage,
          updated_at: new Date()
        }
      });

      // Schedule the reactivated reminder job in BullMQ
      const nextScheduledTime = this.calculateNextScheduledTime(timeSlot);
      await this.queueService.scheduleReminder(
        reactivatedReminder.id, 
        reactivatedReminder.chat_id, 
        reactivatedReminder.next_run_message || '', 
        nextScheduledTime
      );

      return reactivatedReminder;
    }

    // Otherwise, create a new reminder
    return await this.createReminder(chatId, timeSlot);
  }

  /**
   * Generate time selection menu with availability indicators
   */
  async generateTimeSelectionMenu(chatId: number): Promise<string> {
    // Get only active reminders to check availability
    const activeReminders = await this.getRemindersByTimeSlotForChat(chatId);

    let text = '⏰ *Pilih Waktu Reminder*\n\n';
    text += 'Pilih waktu untuk reminder harian Anda:\n\n';

    // Morning option - check if there are active reminders
    const hasActiveMorning = activeReminders[TIME_SLOTS.MORNING] && activeReminders[TIME_SLOTS.MORNING]!.length > 0;
    const morningIcon = hasActiveMorning ? '❌' : '🌅';
    text += `1️⃣ ${morningIcon} Pagi (08:00)\n`;

    // Afternoon option - check if there are active reminders
    const hasActiveAfternoon = activeReminders[TIME_SLOTS.AFTERNOON] && activeReminders[TIME_SLOTS.AFTERNOON]!.length > 0;
    const afternoonIcon = hasActiveAfternoon ? '❌' : '☀️';
    text += `2️⃣ ${afternoonIcon} Siang (12:00)\n`;

    // Evening option - check if there are active reminders
    const hasActiveEvening = activeReminders[TIME_SLOTS.EVENING] && activeReminders[TIME_SLOTS.EVENING]!.length > 0;
    const eveningIcon = hasActiveEvening ? '❌' : '🌙';
    text += `3️⃣ ${eveningIcon} Malam (20:00)\n\n`;

    // custom time option
    // const customIcon = '🕒';
    // text += `4️⃣ ${customIcon} Waktu Kustom\n\n`;

    text += '💡 *Catatan:* Anda bisa membuat maksimal 3 reminder\n\n';
    text += 'Ketik pilihan Anda (1-4), 9️⃣ untuk kembali ke menu sebelumnya, atau 0️⃣ untuk kembali ke menu utama';

    return text;
  }

  /**
   * Get time slot by choice number
   */
  getTimeSlotByChoice(choice: number): TimeSlot | null {
    switch (choice) {
      case 1:
        return TIME_SLOTS.MORNING;
      case 2:
        return TIME_SLOTS.AFTERNOON;
      case 3:
        return TIME_SLOTS.EVENING;
      default:
        return null;
    }
  }

  /**
   * Generate success message for created reminder
   */
  generateReminderCreatedMessage(timeSlot: TimeSlot): string {
    const timeDisplay = this.formatReminderTime(timeSlot);

    let text = '✅ *Reminder Berhasil Dibuat!*\n\n';
    text += `${timeDisplay} telah diaktifkan.\n`;
    text += '💡 Reminder akan dikirim otomatis setiap hari sesuai waktu yang dipilih.\n\n';
    text += 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';

    return text;
  }

  /**
   * Generate deactivation menu showing active reminders
   */
  async generateDeactivationMenu(chatId: number): Promise<string> {
    const reminders = await this.getChatReminders(chatId);

    if (reminders.length === 0) {
      return this.generateNoRemindersToDeactivateText();
    }

    const remindersByTimeSlot = await this.getRemindersByTimeSlotForChat(chatId);

    let text = '🔕 *NONAKTIFKAN REMINDER*\n\n';
    text += 'Pilih reminder yang ingin dinonaktifkan:\n\n';

    let optionNumber = 1;
    const timeSlots = [TIME_SLOTS.MORNING, TIME_SLOTS.AFTERNOON, TIME_SLOTS.EVENING, TIME_SLOTS.CUSTOM];

    for (const timeSlot of timeSlots) {
      if (remindersByTimeSlot[timeSlot] && remindersByTimeSlot[timeSlot].length > 0) {
        if (timeSlot === TIME_SLOTS.CUSTOM) {
          // For custom reminders, show each one individually
          for (const reminder of remindersByTimeSlot[timeSlot]) {
            const timeDisplay = this.formatReminderTime(timeSlot, reminder.custom_time);
            text += `${optionNumber}️⃣ ${timeDisplay}\n`;
            optionNumber++;
          }
        } else {
          const timeDisplay = this.formatReminderTime(timeSlot);
          text += `${optionNumber}️⃣ ${timeDisplay}\n`;
          optionNumber++;
        }
      }
    }

    text += '\n9️⃣ Kembali ke menu sebelumnya\n';
    text += '0️⃣ Kembali ke menu utama\n\n';
    text += `Ketik pilihan Anda (1-${optionNumber - 1}):`;

    return text;
  }

  /**
   * Get reminder by deactivation choice
   */
  async getReminderByDeactivationChoice(chatId: number, choice: number): Promise<Reminder | null> {
    const reminders = await this.getChatReminders(chatId);
    const remindersByTimeSlot = this.getRemindersByTimeSlot(reminders);

    let optionNumber = 1;
    const timeSlots = [TIME_SLOTS.MORNING, TIME_SLOTS.AFTERNOON, TIME_SLOTS.EVENING, TIME_SLOTS.CUSTOM];

    for (const timeSlot of timeSlots) {
      if (remindersByTimeSlot[timeSlot] && remindersByTimeSlot[timeSlot].length > 0) {
        if (timeSlot === TIME_SLOTS.CUSTOM) {
          // For custom reminders, check each one individually
          for (const reminder of remindersByTimeSlot[timeSlot]) {
            if (optionNumber === choice) {
              return reminder;
            }
            optionNumber++;
          }
        } else {
          if (optionNumber === choice) {
            return remindersByTimeSlot[timeSlot]?.[0] || null; // Return first reminder for this time slot
          }
          optionNumber++;
        }
      }
    }

    return null;
  }

  /**
   * Get time slot by deactivation choice (legacy method for backward compatibility)
   */
  async getTimeSlotByDeactivationChoice(chatId: number, choice: number): Promise<ReminderTimeOfDay | null> {
    const reminder = await this.getReminderByDeactivationChoice(chatId, choice);
    return reminder ? reminder.time_of_day : null;
  }

  /**
   * Deactivate reminder for specific time slot
   */
  async deactivateReminderForTimeSlot(chatId: number, timeSlot: ReminderTimeOfDay): Promise<void> {
    const reminders = await this.getChatReminders(chatId);
    const remindersByTimeSlot = this.getRemindersByTimeSlot(reminders);

    if (!remindersByTimeSlot[timeSlot] || remindersByTimeSlot[timeSlot].length === 0) {
      throw new Error(`No active reminder found for time slot: ${timeSlot}`);
    }

    // Deactivate all reminders for this time slot (should be only one, but just in case)
    const reminderIds = remindersByTimeSlot[timeSlot].map(reminder => reminder.id);

    await this.prisma.reminder.updateMany({
      where: {
        id: { in: reminderIds },
        chat_id: chatId,
      },
      data: {
        active: false
      }
    });
  }

  /**
   * Generate reminder deactivated message
   */
  generateReminderDeactivatedMessage(timeSlot: ReminderTimeOfDay, customTime?: string | null): string {
    const timeDisplay = this.formatReminderTime(timeSlot, customTime);

    let text = '🔕 *Reminder Berhasil Dinonaktifkan!*\n\n';
    text += `${timeDisplay} telah dinonaktifkan.\n`;
    text += '💡 Anda tidak akan menerima reminder untuk waktu ini lagi.\n\n';
    text += 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';

    return text;
  }

  generateCustomTimePrompt() {
    let text = '🕒 *PEMBUATAN REMINDER KUSTOM*\n\n';
    text += 'Masukkan waktu kustom untuk reminder (format: HH:mm, misalnya 15:30):\n\n';
    text += '💡 *Contoh format yang benar:*\n';
    text += '• 07:00 (pagi)\n';
    text += '• 14:30 (siang)\n';
    text += '• 21:15 (malam)\n\n';
    text += 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';

    return text;
  }

  /**
   * Validate custom time format (HH:mm)
   */
  validateCustomTime(timeString: string): { valid: boolean; time?: string; error?: string } {
    const trimmedTime = timeString.trim();

    // Check basic format HH:mm
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const match = trimmedTime.match(timeRegex);

    if (!match || !match[1] || !match[2]) {
      return {
        valid: false,
        error: 'Format waktu tidak valid. Gunakan format HH:mm (contoh: 15:30)'
      };
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    // Additional validation
    if (hours < 0 || hours > 23) {
      return {
        valid: false,
        error: 'Jam harus antara 00-23'
      };
    }

    if (minutes < 0 || minutes > 59) {
      return {
        valid: false,
        error: 'Menit harus antara 00-59'
      };
    }

    // Format to ensure consistent HH:mm format
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    return {
      valid: true,
      time: formattedTime
    };
  }

  /**
   * Create custom time reminder
   */
  async createCustomTimeReminder(chatId: number, customTime: string): Promise<Reminder> {
    // Validate time format first
    const validation = this.validateCustomTime(customTime);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid time format');
    }

    const formattedTime = validation.time!;

    // Check if active custom reminder already exists
    const existingCustomReminder = await this.prisma.reminder.findFirst({
      where: {
        chat_id: chatId,
        time_of_day: TIME_SLOTS.CUSTOM,
        active: true
      }
    });

    if (existingCustomReminder) {
      throw new Error('Anda sudah memiliki reminder kustom aktif. Nonaktifkan terlebih dahulu untuk membuat yang baru.');
    }

    // Generate random message for custom time
    const customMessages = REMINDER_MESSAGES[TIME_SLOTS.CUSTOM];
    const randomMessage = customMessages?.[Math.floor(Math.random() * customMessages.length)];
    const nextRunMessage = randomMessage ? this.formatMessageForDelivery(randomMessage) : null;

    // Check if there's an inactive custom reminder
    const inactiveCustomReminder = await this.prisma.reminder.findFirst({
      where: {
        chat_id: chatId,
        time_of_day: TIME_SLOTS.CUSTOM,
        active: false
      }
    });

    // If inactive reminder exists, reactivate it with new custom time
    if (inactiveCustomReminder) {
      const updatedReminder = await this.prisma.reminder.update({
        where: { id: inactiveCustomReminder.id },
        data: {
          active: true,
          custom_time: formattedTime,
          next_run_message: nextRunMessage,
          updated_at: new Date()
        }
      });

      // Schedule the reactivated custom reminder job in BullMQ
      const nextScheduledTime = this.calculateNextScheduledTime(TIME_SLOTS.CUSTOM, formattedTime);
      await this.queueService.scheduleReminder(
        updatedReminder.id, 
        updatedReminder.chat_id, 
        updatedReminder.next_run_message || '', 
        nextScheduledTime
      );

      return updatedReminder;
    }

    // Otherwise, create a new custom reminder
    const reminder = await this.prisma.reminder.create({
      data: {
        chat_id: chatId,
        time_of_day: TIME_SLOTS.CUSTOM,
        custom_time: formattedTime,
        active: true,
        next_run_message: nextRunMessage
      }
    });

    // Schedule the new custom reminder job in BullMQ
    const nextScheduledTime = this.calculateNextScheduledTime(TIME_SLOTS.CUSTOM, formattedTime);
    await this.queueService.scheduleReminder(
      reminder.id, 
      reminder.chat_id, 
      reminder.next_run_message || '', 
      nextScheduledTime
    );

    return reminder;
  }

  /**
   * Format custom time display
   */
  formatCustomReminderTime(customTime: string | null): string {
    if (!customTime) return '🕒 Waktu Kustom (Belum diatur)';
    return `🕒 Waktu Kustom (${customTime})`;
  }

  /**
   * Generate success message for custom reminder
   */
  generateCustomReminderCreatedMessage(customTime: string): string {
    let text = '✅ *Reminder Kustom Berhasil Dibuat!*\n\n';
    text += `🕒 Waktu Kustom (${customTime}) telah diaktifkan.\n`;
    text += 'Anda akan menerima reminder sesuai waktu yang telah ditentukan.\n\n';
    text += 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';

    return text;
  }

  /**
     * Calculate next scheduled time for a reminder based on time_of_day
     */
  private calculateNextScheduledTime(timeOfDay: ReminderTimeOfDay, customTime?: string | null): Date {
    const now = new Date();
    const nextRun = new Date();

    switch (timeOfDay) {
      case TIME_SLOTS.MORNING:
        nextRun.setHours(8, 0, 0, 0); // 08:00 Jakarta time
        break;
      case TIME_SLOTS.AFTERNOON:
        nextRun.setHours(12, 0, 0, 0); // 12:00 Jakarta time
        break;
      case TIME_SLOTS.EVENING:
        nextRun.setHours(20, 0, 0, 0); // 20:00 Jakarta time
        break;
      case TIME_SLOTS.CUSTOM:
        setCustomTime(nextRun, customTime);
        break;
      default:
        nextRun.setHours(9, 0, 0, 0); // Default to 9:00 AM Jakarta time
    }

    // Convert Jakarta time to UTC (subtract 7 hours)
    // Jakarta is UTC+7, so to get UTC we subtract 7 hours
    nextRun.setHours(nextRun.getHours() - 7);

    // If the scheduled time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }
}