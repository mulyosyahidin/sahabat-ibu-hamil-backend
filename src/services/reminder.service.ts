import type { PrismaClient, Reminder } from "@/generated/prisma";

// Time slot constants
export const TIME_SLOTS = {
  MORNING: 'pagi',
  AFTERNOON: 'siang', 
  EVENING: 'malam'
} as const;

export type TimeSlot = typeof TIME_SLOTS[keyof typeof TIME_SLOTS];

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
  ]
};

export class ReminderService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get all active reminders for a specific chat
   */
  async getChatReminders(chatId: number): Promise<Reminder[]> {
    return await this.prisma.reminder.findMany({
      where: {
        chatId,
        active: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get all reminders (active and inactive) for a specific chat
   */
  async getAllChatReminders(chatId: number): Promise<Reminder[]> {
    return await this.prisma.reminder.findMany({
      where: {
        chatId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get reminder count for a specific chat
   */
  async getChatReminderCount(chatId: number): Promise<number> {
    return await this.prisma.reminder.count({
      where: {
        chatId,
        active: true
      }
    });
  }

  /**
   * Create a new reminder for a chat
   */
  /**
   * Calculate the next run time based on the time slot and current time
   * Uses Indonesia timezone (WIB/UTC+7)
   * Ensures the next run is not set for a time that has already passed today
   */
  private calculateNextRunAt(timeSlot: TimeSlot): Date {
    // Create a date object for today in UTC
    const now = new Date();
    const nextRun = new Date();
    
    // Set the time based on time slot (in WIB, which will be converted to UTC)
    switch (timeSlot) {
      case TIME_SLOTS.MORNING:
        // 08:00 WIB = 01:00 UTC (08 - 7 = 01)
        nextRun.setUTCHours(1, 0, 0, 0);
        break;
      case TIME_SLOTS.AFTERNOON:
        // 12:00 WIB = 05:00 UTC (12 - 7 = 05)
        nextRun.setUTCHours(5, 0, 0, 0);
        break;
      case TIME_SLOTS.EVENING:
        // 20:00 WIB = 13:00 UTC (20 - 7 = 13)
        nextRun.setUTCHours(13, 0, 0, 0);
        break;
    }
    
    // If the time has already passed today (comparing in UTC), set it for tomorrow
    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    
    return nextRun;
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

  async createReminder(chatId: number, timeOfDay?: string): Promise<Reminder> {
    const nextRunAt = timeOfDay ? this.calculateNextRunAt(timeOfDay as TimeSlot) : null;
    const nextRunMessage = timeOfDay ? this.formatMessageForDelivery(this.getRandomMessageForTimeSlot(timeOfDay as TimeSlot)) : null;
    
    return await this.prisma.reminder.create({
      data: {
        chatId,
        timeOfDay: timeOfDay || null,
        active: true,
        nextRunAt,
        nextRunMessage
      }
    });
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
   * Update reminder's next run time
   */
  async updateNextRunAt(reminderId: number, nextRunAt: Date): Promise<Reminder> {
    return await this.prisma.reminder.update({
      where: { id: reminderId },
      data: { nextRunAt }
    });
  }

  /**
   * Format reminder time display
   */
  formatReminderTime(timeOfDay: string | null): string {
    if (!timeOfDay) return 'Belum diatur';
    
    switch (timeOfDay) {
      case 'pagi':
        return '🌅 Pagi (08:00)';
      case 'siang':
        return '☀️ Siang (12:00)';
      case 'malam':
        return '🌙 Malam (20:00)';
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
      const timeDisplay = this.formatReminderTime(reminder.timeOfDay);
      const status = reminder.active ? '✅ Aktif' : '❌ Nonaktif';
      
      text += `${index + 1}. ${timeDisplay}\n`;
      text += `   Status: ${status}\n`;
      
      if (reminder.nextRunAt) {
        const nextRun = new Date(reminder.nextRunAt).toLocaleString('id-ID', {
          timeZone: reminder.tz,
          dateStyle: 'short',
          timeStyle: 'short'
        });
        text += `   Berikutnya: ${nextRun}\n`;
      }
      
      text += '\n';
    });

    text += '💡 *Tips:* Reminder akan mengirimkan pesan otomatis sesuai jadwal yang telah diatur untuk membantu Anda mengingat hal-hal penting selama kehamilan.';
    
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
        chatId,
        timeOfDay: timeSlot,
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
      [TIME_SLOTS.EVENING]: []
    };
    
    reminders.forEach(reminder => {
      if (reminder.timeOfDay && grouped[reminder.timeOfDay]) {
        grouped[reminder.timeOfDay]!.push(reminder);
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
        chatId,
        timeOfDay: timeSlot,
        active: false
      }
    });

    // If inactive reminder exists, reactivate it with new nextRunAt and nextRunMessage
    if (inactiveReminder) {
      const nextRunAt = this.calculateNextRunAt(timeSlot);
      const nextRunMessage = this.formatMessageForDelivery(this.getRandomMessageForTimeSlot(timeSlot));
      
      return await this.prisma.reminder.update({
        where: { id: inactiveReminder.id },
        data: { 
          active: true,
          nextRunAt,
          nextRunMessage,
          updatedAt: new Date()
        }
      });
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
    const morningStatus = hasActiveMorning ? '(Sudah ada)' : '(Tersedia)';
    text += `1️⃣ ${morningIcon} Pagi (08:00) ${morningStatus}\n`;
    
    // Afternoon option - check if there are active reminders
    const hasActiveAfternoon = activeReminders[TIME_SLOTS.AFTERNOON] && activeReminders[TIME_SLOTS.AFTERNOON]!.length > 0;
    const afternoonIcon = hasActiveAfternoon ? '❌' : '☀️';
    const afternoonStatus = hasActiveAfternoon ? '(Sudah ada)' : '(Tersedia)';
    text += `2️⃣ ${afternoonIcon} Siang (12:00) ${afternoonStatus}\n`;
    
    // Evening option - check if there are active reminders
    const hasActiveEvening = activeReminders[TIME_SLOTS.EVENING] && activeReminders[TIME_SLOTS.EVENING]!.length > 0;
    const eveningIcon = hasActiveEvening ? '❌' : '🌙';
    const eveningStatus = hasActiveEvening ? '(Sudah ada)' : '(Tersedia)';
    text += `3️⃣ ${eveningIcon} Malam (20:00) ${eveningStatus}\n\n`;
    
    text += '💡 *Catatan:* Anda bisa membuat maksimal 3 reminder\n\n';
    text += 'Ketik pilihan Anda (1-3), 9️⃣ untuk kembali ke menu sebelumnya, atau 0️⃣ untuk kembali ke menu utama';
    
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
    const messageTemplate = REMINDER_MESSAGES[timeSlot];
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
    const timeSlots = [TIME_SLOTS.MORNING, TIME_SLOTS.AFTERNOON, TIME_SLOTS.EVENING];
    
    for (const timeSlot of timeSlots) {
      if (remindersByTimeSlot[timeSlot] && remindersByTimeSlot[timeSlot].length > 0) {
        const timeDisplay = this.formatReminderTime(timeSlot);
        text += `${optionNumber}️⃣ ${timeDisplay}\n`;
        optionNumber++;
      }
    }
    
    text += '\n9️⃣ Kembali ke menu sebelumnya\n';
    text += '0️⃣ Kembali ke menu utama\n\n';
    text += `Ketik pilihan Anda (1-${optionNumber - 1}):`;
    
    return text;
  }

  /**
   * Get time slot by deactivation choice
   */
  async getTimeSlotByDeactivationChoice(chatId: number, choice: number): Promise<string | null> {
    const reminders = await this.getChatReminders(chatId);
    const remindersByTimeSlot = this.getRemindersByTimeSlot(reminders);
    
    let optionNumber = 1;
    const timeSlots = [TIME_SLOTS.MORNING, TIME_SLOTS.AFTERNOON, TIME_SLOTS.EVENING];
    
    for (const timeSlot of timeSlots) {
      if (remindersByTimeSlot[timeSlot] && remindersByTimeSlot[timeSlot].length > 0) {
        if (optionNumber === choice) {
          return timeSlot;
        }
        optionNumber++;
      }
    }
    
    return null;
  }

  /**
   * Deactivate reminder for specific time slot
   */
  async deactivateReminderForTimeSlot(chatId: number, timeSlot: string): Promise<void> {
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
        chatId: chatId
      },
      data: {
        active: false
      }
    });
  }

  /**
   * Generate reminder deactivated message
   */
  generateReminderDeactivatedMessage(timeSlot: string): string {
    const timeDisplay = this.formatReminderTime(timeSlot);
    
    let text = '🔕 *Reminder Berhasil Dinonaktifkan!*\n\n';
    text += `${timeDisplay} telah dinonaktifkan.\n`;
    text += '💡 Anda tidak akan menerima reminder untuk waktu ini lagi.\n\n';
    text += 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama';
    
    return text;
  }
}