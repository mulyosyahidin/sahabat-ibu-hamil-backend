import { MessageContentSource, MessageDirection, type HandleRegistrationDataResponse, type RawWhatsAppMessage } from '../../models';
import { PrismaClient, type Chat } from '../../generated/prisma';
import { ReminderService } from '../reminder.service';
import { asJsonObject, getNumericMenuChoice, NotFoundError, runIfOpenAIEnabled } from '@/utils';
import * as fs from 'fs';
import { extractName } from '../openai/nlu';
import { extractAge } from '../openai/nlu-age';
import { extractMenuChoice } from '../openai/nlu-menu';
import type { WhatsAppService } from '../whatsapp.service';

export class ChatService {
  private prisma: PrismaClient;
  private whatsappService: WhatsAppService;
  private reminderService: ReminderService;

  constructor(prisma: PrismaClient, whatsappService: WhatsAppService) {
    this.prisma = prisma;
    this.whatsappService = whatsappService;
    this.reminderService = new ReminderService(prisma);
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(deviceCode: string, message: any): Promise<void> {
    try {
      // Validate message object
      if (!message || !message.key || !message.key.remoteJid) {
        console.error('Invalid message object - missing key or remoteJid:', message);

        return;
      }

      // Skip messages sent by the bot itself
      if (message.key.fromMe) {
        return;
      }

      const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');

      // cek apakah nomor ini sudah pernah chat atau belum
      const chat = await this.findOrCreateChat(deviceCode, phoneNumber);
      await this.saveMessage(chat.id, phoneNumber, MessageContentSource.User, message);
      await this.processMessage(chat, message);
    }
    catch (error) {
      console.error(`Error handling incoming message:`, error);
    }
  }

  /**
   * Find existing chat or create new one
   */
  private async findOrCreateChat(deviceCode: string, phoneNumber: string): Promise<any> {
    try {
      // Find device by code
      const device = await this.prisma.device.findUnique({
        where: { code: deviceCode },
      });

      if (!device) {
        throw new Error(`Device with code ${deviceCode} not found`);
      }

      // Check if chat already exists for this device and phone number
      let chat = await this.prisma.chat.findUnique({
        where: {
          deviceId_waNumber: {
            deviceId: device.id,
            waNumber: phoneNumber,
          },
        },
      });

      // If chat doesn't exist, create new one
      if (!chat) {
        chat = await this.prisma.chat.create({
          data: {
            deviceId: device.id,
            waNumber: phoneNumber,
            sceneStack: ['registrasi'],
            lastActiveAt: new Date(),
          },
        });

        // Send welcome message immediately for new users
        const welcomeMessage =
          'Halo! Selamat datang di *Sahabat Ibu Hamil* 🤱\n\n' +
          'Saya adalah asisten virtual yang siap membantu Anda dengan informasi seputar kehamilan, anemia, dan nutrisi';

        await this.sendTextResponse(chat, phoneNumber, welcomeMessage);
        await this.sendTextResponse(chat, phoneNumber, 'Untuk memulai, silahkan masukkan nama Anda:');

        await this.prisma.chat.update({
          where: { id: chat.id },
          data: { ctx: { isNewUser: false, registrationStep: 'name' } },
        });
      } else {
        // Update last active time
        await this.prisma.chat.update({
          where: { id: chat.id },
          data: { lastActiveAt: new Date() },
        });
      }

      return chat;
    } catch (error) {
      console.error(`Error finding or creating chat:`, error);
      throw error;
    }
  }

  /**
   * Save message to database
   */
  private async saveMessage(chatId: number, phoneNumber: string, source: MessageContentSource, message: any): Promise<void> {
    try {
      await this.prisma.message.create({
        data: {
          chatId,
          source: source,
          direction: 'in',
          type: message.type || 'text',
          body: message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '',
          meta: {
            messageId: message.key?.id || message.id,
            timestamp: message.messageTimestamp || message.timestamp,
            fromMe: message.key?.fromMe || message.fromMe || false,
          },
        },
      });
    } catch (error) {
      console.error(`Error saving message:`, error);
      throw error;
    }
  }

  /**
   * Process message and generate appropriate response
   */
  private async processMessage(chat: Chat, message: any): Promise<void> {
    try {
      const phoneNumber =
        message.key?.remoteJid?.replace('@s.whatsapp.net', '') ||
        message.from?.replace('@c.us', '') ||
        'unknown';

      const sceneStack = Array.isArray(chat.sceneStack) ? chat.sceneStack : ['registrasi'];
      const currentScene = sceneStack[sceneStack.length - 1] || 'registrasi';

      switch (currentScene) {
        case 'registrasi':
          await this.handleRegistration(chat, message);
          break;
        case 'menu.root':
          await this.handleExistingUser(chat, message);
          break;
        case 'menu.anemia':
          await this.handleAnemiaMenu(chat, message);
          break;
        case 'menu.ttd':
          await this.handleTTDMenu(chat, message);
          break;
        case 'menu.nutrition':
          await this.handleNutritionMenu(chat, message);
          break;
        case 'menu.myths':
          await this.handleMythsMenu(chat, message);
          break;
        case 'menu.reminder':
          await this.handleReminderMenu(chat, message);
          break;
        case 'reminder.time_selection':
          await this.handleReminderTimeSelection(chat, message);
          break;
        case 'reminder.deactivation_selection':
          await this.handleReminderDeactivationSelection(chat, message);
          break;
        default:
      }
    }
    catch (error) {
      console.error(`Error processing message:`, error);
    }
  }

  /**
   * Handle user registration process
   */
  private async handleRegistration(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();
    const ctx = asJsonObject(chat.ctx);
    const registrationStep = ctx.registrationStep;

    const device = await this.prisma.device.findUnique({
      where: { id: chat.deviceId },
    });

    if (!device) {
      throw new Error(`Device with id ${chat.deviceId} not found`);
    }

    if (registrationStep == 'name') {
      const { valid, name } = await runIfOpenAIEnabled(
        () => extractName(
          messageText,
          chat.id.toString(),
          chat.id.toString(),
          chat.deviceId.toString()
        ),
        () => ({ valid: true, name: messageText })
      );

      if (!valid) {
        await this.sendTextResponse(chat, chat.waNumber, 'Nama yang Anda masukkan tidak valid. Harap masukkan nama Anda dengan benar:');
        return;
      }

      await this.prisma.chat.update({
        where: { id: chat.id },
        data: {
          ctx: { ...ctx, registrationStep: 'age' },
          name: name,
        },
      });

      await this.sendTextResponse(chat, chat.waNumber, `Hai ${name}.\n\nBerapa usia kamu saat ini?`);
    }
    else if (registrationStep == 'age') {
      const { valid, age } = await runIfOpenAIEnabled(
        () => extractAge(
          messageText,
          chat.id.toString(),
          chat.id.toString(),
          chat.deviceId.toString()
        ),
        () => ({ valid: true, age: parseInt(messageText, 10) })
      );

      if (!valid) {
        await this.sendTextResponse(chat, chat.waNumber, 'Usia yang Anda masukkan tidak valid. Harap masukkan usia Anda dengan benar, contoh: "25", "30 tahun"');
        return;
      }

      await this.prisma.chat.update({
        where: { id: chat.id },
        data: {
          ctx: { ...ctx, registrationStep: 'done' },
          age: age,
        },
      });

      // update chat scene stack
      await this.updateChatScene(chat.id, 'menu.root');
      await this.sendTextResponse(chat, chat.waNumber, `Hai ${chat.name}, usia kamu sekarang ${age} tahun.`);

      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.sendMainMenuOption(chat);
    }
  }

  /**
   * Handle existing user menu navigation
   */
  private async handleExistingUser(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const directChoice = getNumericMenuChoice(messageText);
    let valid: boolean;
    let choice: number | null;

    if (directChoice !== null) {
      valid = true;
      choice = directChoice;
    } else {
      ({ valid, choice } = await runIfOpenAIEnabled(
        () => extractMenuChoice(
          messageText,
          chat.id.toString(),
          chat.id.toString(),
          chat.deviceId.toString()
        ),
        () => ({ valid: false, choice: null })
      ));
    }

    if (!valid || !choice) {
      await this.sendTextResponse(chat, chat.waNumber,
        "Pilihan tidak valid. Ketik angka 1 - 7 atau tulis misalnya: 'anemia', 'ttd', 'tips gizi', 'mitos', 'reminder', 'suami', 'faq'."
      );
      return;
    }

    switch (choice) {
      case 1:
        await this.updateChatScene(chat.id, 'menu.anemia');
        await this.sendTextResponse(chat, chat.waNumber, this.getAnemiaMenuText());
        break;
      case 2:
        await this.updateChatScene(chat.id, 'menu.ttd');
        await this.sendTextResponse(chat, chat.waNumber, this.getTTDMenuText());
        break;
      case 3:
        await this.updateChatScene(chat.id, 'menu.nutrition');
        await this.sendTextResponse(chat, chat.waNumber, this.getNutritionMenuText());
        break;
      case 4:
        await this.updateChatScene(chat.id, 'menu.myths');
        await this.sendTextResponse(chat, chat.waNumber, this.getMythsMenuText());
        break;
      case 5:
        await this.updateChatScene(chat.id, 'menu.reminder');
        await this.sendTextResponse(chat, chat.waNumber, this.getReminderMenuText());
        break;
      // case 6:
      //   await this.updateChatScene(chat.id, 'menu.family');
      //   return this.getFamilyMenuText();
      // case 7:
      //   await this.updateChatScene(chat.id, 'menu.faq');
      //   return this.getFAQMenuText();
      default:
        await this.sendTextResponse(chat, chat.waNumber, `Pilihan tidak valid.`);

        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.sendMainMenuOption(chat);
        break;
    }
  }

  /**
   * Update chat scene stack
   */
  private async updateChatScene(chatId: number, newScene: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({
      where: {
        id: chatId,
      },
    });
    const currentStack = Array.isArray(chat?.sceneStack) ? chat!.sceneStack : ['registrasi'];
    currentStack.push(newScene);

    await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        sceneStack: currentStack,
        lastActiveAt: new Date(),
      },
    });
  }

  private async sendMainMenuOption(chat: Chat): Promise<void> {
    await this.sendTextResponse(chat, chat.waNumber, this.getMainMenuText());
  }

  /**
   * Get main menu text
   */
  private getMainMenuText(): string {
    return (
      '🏠 *MENU UTAMA SAHABAT IBU HAMIL*\n\n' +
      'Silakan pilih menu yang Anda inginkan:\n\n' +
      '1️⃣ Info Anemia\n' +
      '2️⃣ Info Tablet Tambah Darah (TTD)\n' +
      '3️⃣ Tips Gizi Praktis\n' +
      '4️⃣ Klarifikasi Mitos\n' +
      '5️⃣ Reminder Harian\n' +
      '6️⃣ Untuk Suami & Keluarga\n' +
      '7️⃣ FAQ & Konsultasi Bidan\n\n' +
      'Ketik angka pilihan Anda (1-7):'
    );
  }

  // ===== Submenu text builders =====

  private getAnemiaMenuText(): string {
    return (
      '🩸 *INFO ANEMIA*\n\n' +
      'Pilih informasi yang ingin Anda ketahui:\n\n' +
      '1️⃣ Apa itu anemia?\n' +
      '2️⃣ Penyebab anemia\n' +
      '3️⃣ Gejala anemia\n' +
      '4️⃣ Dampak anemia pada ibu dan bayi\n\n' +
      'Ketik pilihan Anda (1 - 4) atau 0️⃣ untuk kembali ke menu utama:'
    );
  }

  private getTTDMenuText(): string {
    return (
      '💊 *INFO TABLET TAMBAH DARAH (TTD)*\n\n' +
      'Pilih informasi yang ingin Anda ketahui:\n\n' +
      '1️⃣ Kenapa harus minum TTD?\n' +
      '2️⃣ Cara minum TTD yang benar\n' +
      '3️⃣ Efek samping TTD & cara mengatasinya\n\n' +
      'Ketik pilihan Anda (1 - 3) atau 0️⃣ untuk kembali ke menu utama:'
    );
  }

  private getNutritionMenuText(): string {
    return (
      '🥗 *TIPS GIZI PRAKTIS*\n\n' +
      'Pilih informasi yang ingin Anda ketahui:\n\n' +
      '1️⃣ Makanan sumber zat besi\n' +
      '2️⃣ Menu sehat berbasis bahan lokal\n' +
      '3️⃣ Cemilan sehat\n' +
      '4️⃣ Kombinasi booster zat besi + vitamin C\n' +
      '5️⃣ Makanan yang perlu dibatasi\n\n' +
      'Ketik pilihan Anda (1 - 5) atau 0️⃣ untuk kembali ke menu utama:'
    );
  }

  private getMythsMenuText(): string {
    return (
      '❌ *KLARIFIKASI MITOS*\n\n' +
      'Pilih mitos yang ingin diklarifikasi:\n\n' +
      '1️⃣ TTD bikin bayi besar\n' +
      '2️⃣ TTD bikin bayi sulit lahir\n' +
      '3️⃣ Anemia dianggap normal\n\n' +
      'Ketik pilihan Anda (1 - 3) atau 0️⃣ untuk kembali ke menu utama:'
    );
  }

  private getReminderMenuText(): string {
    return (
      '⏰ *REMINDER HARIAN*\n\n' +
      'Pilih pengaturan reminder:\n\n' +
      '1️⃣ Aktifkan reminder harian\n' +
      '2️⃣ Nonaktifkan reminder\n' +
      '3️⃣ Jadwal reminder saya\n\n' +
       'Ketik pilihan Anda (1 - 3) atau 0️⃣ untuk kembali ke menu utama:'
    );
  }

  // submenu
  private async handleAnemiaMenu(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const choice = parseInt(messageText, 10);
    let responseText = '';

    switch (choice) {
      case 1:
        responseText = (
          '🩸 *APA ITU ANEMIA?*\n\n' +
          'Anemia adalah kondisi ketika tubuh kekurangan sel darah merah yang sehat atau hemoglobin untuk membawa oksigen ke seluruh tubuh.\n\n' +
          'Pada ibu hamil, anemia sangat umum terjadi karena kebutuhan zat besi meningkat untuk mendukung pertumbuhan janin.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );

        // const image = fs.readFileSync("./assets/images/1.png");
        const image = `${process.env.PUBLIC_URL}/assets/images/1.jpg`;

        await this.sendImageResponse(chat, chat.waNumber, 'Anemia adalah kondisi ketika tubuh kekurangan sel darah merah yang sehat atau hemoglobin untuk membawa oksigen ke seluruh tubuh.', image);
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 2:
        responseText = (
          '🩸 *PENYEBAB ANEMIA*\n\n' +
          'Penyebab utama anemia pada ibu hamil:\n' +
          '• Kekurangan zat besi dalam makanan\n' +
          '• Kebutuhan zat besi meningkat saat hamil\n' +
          '• Kehilangan darah (menstruasi sebelum hamil)\n' +
          '• Penyerapan zat besi yang buruk\n' +
          '• Infeksi atau penyakit kronis\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 3:
        responseText = (
          '🩸 *GEJALA ANEMIA*\n\n' +
          'Gejala anemia yang perlu diwaspadai:\n' +
          '• Mudah lelah dan lemas\n' +
          '• Pusing atau sakit kepala\n' +
          '• Sesak napas\n' +
          '• Kulit pucat\n' +
          '• Kuku rapuh\n' +
          '• Jantung berdebar\n' +
          '• Sulit konsentrasi\n\n' +
          'Jika mengalami gejala ini, segera konsultasi ke tenaga kesehatan.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 4:
        responseText = (
          '🩸 *DAMPAK ANEMIA PADA IBU DAN BAYI*\n\n' +
          'Dampak pada ibu:\n' +
          '• Komplikasi persalinan\n' +
          '• Perdarahan berlebih\n' +
          '• Infeksi pasca melahirkan\n' +
          '• Kematian ibu\n\n' +
          'Dampak pada bayi:\n' +
          '• Berat badan lahir rendah\n' +
          '• Kelahiran prematur\n' +
          '• Gangguan perkembangan otak\n' +
          '• Kematian bayi\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );

        const video = `${process.env.PUBLIC_URL}/assets/videos/video1.mp4`;

        await this.sendVideoResponse(chat, chat.waNumber, 'Dampak anemia yang perlu diwaspadai', video);
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 9:
        await this.sendTextResponse(chat, chat.waNumber, this.getAnemiaMenuText());
        break;
      case 0:
        await this.updateChatScene(chat.id, 'menu.root');
        await this.sendMainMenuOption(chat);
        break;
      default:
        await this.sendTextResponse(chat, chat.waNumber, `Pilihan tidak valid.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendTextResponse(chat, chat.waNumber, 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama');
        break;
    }
  }

  private async handleTTDMenu(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const choice = parseInt(messageText, 10);
    let responseText = '';

    switch (choice) {
      case 1:
        responseText = (
          '💊 *KENAPA HARUS MINUM TTD?*\n\n' +
          'Tablet Tambah Darah (TTD) penting karena:\n' +
          '• Mencegah dan mengatasi anemia\n' +
          '• Memenuhi kebutuhan zat besi yang meningkat saat hamil\n' +
          '• Mendukung pertumbuhan janin yang optimal\n' +
          '• Mengurangi risiko komplikasi kehamilan\n' +
          '• Meningkatkan kualitas darah ibu\n\n' +
          'Ibu hamil perlu minum TTD minimal 90 tablet selama kehamilan.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 2:
        responseText = (
          '💊 *CARA MINUM TTD YANG BENAR*\n\n' +
          'Panduan minum TTD:\n' +
          '• Minum 1 tablet setiap hari\n' +
          '• Diminum malam hari sebelum tidur\n' +
          '• Dengan air putih, bukan teh/kopi\n' +
          '• Bersamaan dengan vitamin C (jeruk, tomat)\n' +
          '• Jangan bersamaan dengan susu/kalsium\n' +
          '• Konsumsi rutin tanpa terputus\n\n' +
          'Tips: Simpan TTD di tempat kering dan sejuk.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 3:
        responseText = (
          '💊 *EFEK SAMPING TTD & CARA MENGATASINYA*\n\n' +
          'Efek samping yang mungkin terjadi:\n' +
          '• Mual → Minum setelah makan\n' +
          '• Konstipasi → Perbanyak serat dan air\n' +
          '• Feses hitam → Normal, tidak berbahaya\n' +
          '• Nyeri perut → Minum dengan makanan\n' +
          '• Rasa logam di mulut → Minum dengan jus jeruk\n\n' +
          'Jika efek samping berat, konsultasi ke tenaga kesehatan.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 9:
        await this.sendTextResponse(chat, chat.waNumber, this.getTTDMenuText());
        break;
      case 0:
        await this.updateChatScene(chat.id, 'menu.root');
        await this.sendMainMenuOption(chat);
        break;
      default:
        await this.sendTextResponse(chat, chat.waNumber, `Pilihan tidak valid.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendTextResponse(chat, chat.waNumber, 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama');
        break;
    }
  }

  private async handleNutritionMenu(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const choice = parseInt(messageText, 10);
    let responseText = '';

    switch (choice) {
      case 1:
        responseText = (
          '🥗 *MAKANAN SUMBER ZAT BESI*\n\n' +
          'Sumber zat besi terbaik:\n\n' +
          '*Hewani (mudah diserap):*\n' +
          '• Daging sapi, ayam, ikan\n' +
          '• Hati ayam/sapi\n' +
          '• Telur\n\n' +
          '*Nabati:*\n' +
          '• Bayam, kangkung\n' +
          '• Kacang-kacangan\n' +
          '• Tempe, tahu\n' +
          '• Biji-bijian\n\n' +
          'Tips: Kombinasikan dengan vitamin C untuk penyerapan optimal.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 2:
        responseText = (
          '🥗 *MENU SEHAT BERBASIS BAHAN LOKAL*\n\n' +
          'Contoh menu harian:\n\n' +
          '*Sarapan:*\n' +
          '• Nasi + telur dadar + sayur bayam\n' +
          '• Jus jeruk\n\n' +
          '*Makan Siang:*\n' +
          '• Nasi + ikan/ayam + tempe + sayur\n' +
          '• Buah pepaya/pisang\n\n' +
          '*Makan Malam:*\n' +
          '• Nasi + daging + tahu + sayur hijau\n' +
          '• Air putih\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 3:
        responseText = (
          '🥗 *CEMILAN SEHAT*\n\n' +
          'Cemilan bergizi untuk ibu hamil:\n' +
          '• Kacang rebus\n' +
          '• Pisang + selai kacang\n' +
          '• Yogurt + buah\n' +
          '• Roti gandum + telur\n' +
          '• Smoothie buah\n' +
          '• Biskuit gandum\n' +
          '• Kurma\n' +
          '• Alpukat\n\n' +
          'Hindari: Gorengan, makanan manis berlebihan, makanan mentah.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 4:
        responseText = (
          '🥗 *KOMBINASI BOOSTER ZAT BESI + VITAMIN C*\n\n' +
          'Kombinasi terbaik:\n' +
          '• Bayam + tomat\n' +
          '• Daging + jeruk\n' +
          '• Tempe + paprika\n' +
          '• Ikan + brokoli\n' +
          '• Hati ayam + lemon\n' +
          '• Kacang hijau + jambu\n\n' +
          'Vitamin C meningkatkan penyerapan zat besi hingga 3x lipat!\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 5:
        responseText = (
          '🥗 *MAKANAN YANG PERLU DIBATASI*\n\n' +
          'Batasi konsumsi:\n' +
          '• Teh dan kopi (menghambat penyerapan zat besi)\n' +
          '• Susu bersamaan dengan TTD\n' +
          '• Makanan tinggi kalsium saat minum TTD\n' +
          '• Makanan mentah (sushi, lalapan)\n' +
          '• Alkohol (hindari total)\n' +
          '• Makanan tinggi garam\n\n' +
          'Tips: Beri jeda 2 jam antara TTD dengan teh/kopi/susu.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 9:
        await this.sendTextResponse(chat, chat.waNumber, this.getNutritionMenuText());
        break;
      case 0:
        await this.updateChatScene(chat.id, 'menu.root');
        await this.sendMainMenuOption(chat);
        break;
      default:
        await this.sendTextResponse(chat, chat.waNumber, `Pilihan tidak valid.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendTextResponse(chat, chat.waNumber, 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama');
        break;
    }
  }

  private async handleMythsMenu(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const choice = parseInt(messageText, 10);
    let responseText = '';

    switch (choice) {
      case 1:
        responseText = (
          '❌ *MITOS: TTD BIKIN BAYI BESAR*\n\n' +
          '*FAKTA:* Ini adalah MITOS!\n\n' +
          'TTD tidak membuat bayi besar. Yang membuat bayi besar adalah:\n' +
          '• Diabetes gestasional\n' +
          '• Kelebihan berat badan ibu\n' +
          '• Konsumsi gula berlebihan\n\n' +
          'TTD justru membantu:\n' +
          '• Pertumbuhan normal janin\n' +
          '• Mencegah bayi lahir dengan berat rendah\n' +
          '• Perkembangan otak optimal\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 2:
        responseText = (
          '❌ *MITOS: TTD BIKIN BAYI SULIT LAHIR*\n\n' +
          '*FAKTA:* Ini adalah MITOS!\n\n' +
          'TTD tidak menyebabkan persalinan sulit. Justru sebaliknya:\n' +
          '• Ibu dengan anemia lebih berisiko komplikasi persalinan\n' +
          '• TTD membantu ibu memiliki stamina untuk melahirkan\n' +
          '• Mencegah perdarahan berlebih saat persalinan\n\n' +
          'Persalinan sulit disebabkan faktor lain seperti posisi bayi, ukuran panggul, dll.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 3:
        responseText = (
          '❌ *MITOS: ANEMIA DIANGGAP NORMAL*\n\n' +
          '*FAKTA:* Anemia TIDAK normal dan harus ditangani!\n\n' +
          'Anemia pada ibu hamil:\n' +
          '• Bukan kondisi normal\n' +
          '• Dapat dicegah dan diobati\n' +
          '• Berisiko fatal jika dibiarkan\n' +
          '• Memerlukan penanganan medis\n\n' +
          'Jangan anggap remeh anemia. Konsumsi TTD rutin dan periksa ke tenaga kesehatan.\n\n' +
          'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama'
        );
        await this.sendTextResponse(chat, chat.waNumber, responseText);
        break;
      case 9:
        await this.sendTextResponse(chat, chat.waNumber, this.getMythsMenuText());
        break;
      case 0:
        await this.updateChatScene(chat.id, 'menu.root');
        await this.sendMainMenuOption(chat);
        break;
      default:
        await this.sendTextResponse(chat, chat.waNumber, `Pilihan tidak valid.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendTextResponse(chat, chat.waNumber, 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama');
        break;
    }
  }

  private async handleReminderMenu(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const choice = parseInt(messageText, 10);
    let responseText = '';

    switch (choice) {
      case 1:
        // Aktifkan reminder harian
        try {
          const timeSelectionMenu = await this.reminderService.generateTimeSelectionMenu(chat.id);
          await this.sendTextResponse(chat, chat.waNumber, timeSelectionMenu);
          await this.updateChatScene(chat.id, 'reminder.time_selection');
        } catch (error) {
          console.error('Error generating time selection menu:', error);
          await this.sendTextResponse(chat, chat.waNumber, 
            '❌ Maaf, terjadi kesalahan saat menampilkan menu waktu. Silakan coba lagi nanti.'
          );
        }
        break;
      case 2:
        // Nonaktifkan reminder
        try {
          const reminders = await this.reminderService.getChatReminders(chat.id);
          if (reminders.length === 0) {
            // Tidak ada reminder aktif untuk dinonaktifkan
            const noRemindersText = this.reminderService.generateNoRemindersToDeactivateText();
            await this.sendTextResponse(chat, chat.waNumber, noRemindersText);
          } else {
            // Tampilkan menu deaktivasi reminder
            const deactivationMenu = await this.reminderService.generateDeactivationMenu(chat.id);
            await this.sendTextResponse(chat, chat.waNumber, deactivationMenu);
            await this.updateChatScene(chat.id, 'reminder.deactivation_selection');
          }
        } catch (error) {
          console.error('Error checking reminders for deactivation:', error);
          await this.sendTextResponse(chat, chat.waNumber, 
            '❌ Maaf, terjadi kesalahan saat mengecek reminder Anda. Silakan coba lagi nanti.'
          );
        }
        break;
      case 3: // Check my reminders
        try {
          const reminders = await this.reminderService.getChatReminders(chat.id);
          
          if (reminders.length === 0) {
            const noRemindersText = this.reminderService.generateNoRemindersToCheckText();
            await this.sendTextResponse(chat, chat.waNumber, noRemindersText);
          } else {
            const reminderListText = this.reminderService.generateActiveReminderListText(reminders);
            await this.sendTextResponse(chat, chat.waNumber, reminderListText);
          }
        } catch (error) {
          console.error('Error fetching reminders:', error);
          await this.sendTextResponse(chat, chat.waNumber, 
            '❌ Maaf, terjadi kesalahan saat mengambil data reminder Anda. Silakan coba lagi nanti.'
          );
        }
        break;
      case 9:
        await this.sendTextResponse(chat, chat.waNumber, this.getReminderMenuText());
        break;
      case 0:
        await this.updateChatScene(chat.id, 'menu.root');
        await this.sendMainMenuOption(chat);
        break;
      default:
        await this.sendTextResponse(chat, chat.waNumber, `Pilihan tidak valid.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendTextResponse(chat, chat.waNumber, 'Ketik 9️⃣ untuk kembali ke menu sebelumnya, 0️⃣ untuk kembali ke menu utama');
        break;
    }
  }

  /**
   * Handle reminder time selection
   */
  private async handleReminderTimeSelection(chat: Chat, message: any): Promise<void> {
    const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage.text || '').trim();

    const choice = parseInt(messageText, 10);

    switch (choice) {
      case 1:
      case 2:
      case 3:
        try {
          const timeSlot = this.reminderService.getTimeSlotByChoice(choice);
          if (!timeSlot) {
            await this.sendTextResponse(chat, chat.waNumber, 'Pilihan waktu tidak valid.');
            return;
          }

          // Check if reminder already exists for this time slot
          const exists = await this.reminderService.hasReminderForTimeSlot(chat.id, timeSlot);
          if (exists) {
            await this.sendTextResponse(chat, chat.waNumber, 
              `❌ Reminder untuk waktu ${timeSlot} sudah ada.\n\nSilakan pilih waktu lain atau kembali ke menu sebelumnya dengan mengetik 9️⃣`
            );
            return;
          }

          // Create reminder for the selected time slot
          await this.reminderService.createReminderForTimeSlot(chat.id, timeSlot);
          
          // Generate success message
          const successMessage = this.reminderService.generateReminderCreatedMessage(timeSlot);
          await this.sendTextResponse(chat, chat.waNumber, successMessage);

          // Update scene back to reminder menu
          await this.updateChatScene(chat.id, 'menu.reminder');
        } catch (error) {
          console.error('Error creating reminder:', error);
          await this.sendTextResponse(chat, chat.waNumber, 
            '❌ Maaf, terjadi kesalahan saat membuat reminder. Silakan coba lagi nanti.'
          );
        }
        break;
      case 9:
        // Back to reminder menu
        await this.updateChatScene(chat.id, 'menu.reminder');
        await this.sendTextResponse(chat, chat.waNumber, this.getReminderMenuText());
        break;
      case 0:
        // Back to main menu
        await this.updateChatScene(chat.id, 'menu.root');
        await this.sendMainMenuOption(chat);
        break;
      default:
        await this.sendTextResponse(chat, chat.waNumber, 'Pilihan tidak valid.');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sendTextResponse(chat, chat.waNumber, 'Ketik pilihan Anda (1-3), 9️⃣ untuk kembali ke menu sebelumnya, atau 0️⃣ untuk kembali ke menu utama');
        break;
    }
  }

  /**
   * Handle reminder deactivation selection
   */
  private async handleReminderDeactivationSelection(chat: Chat, message: any): Promise<void> {
    try {
      const messageText = (message.message?.conversation || message.body || message.text || message.message.extendedTextMessage?.text || '').trim();
      const choice = parseInt(messageText);
  
      // Handle navigation options
      if (choice === 9) {
        await this.updateChatScene(chat.id, 'menu.reminder');
        const reminderMenu = this.getReminderMenuText();
        await this.sendTextResponse(chat, chat.waNumber, reminderMenu);
        return;
      }
  
      if (choice === 0) {
        await this.updateChatScene(chat.id, 'menu.root');
        const mainMenu = this.getMainMenuText();
        await this.sendTextResponse(chat, chat.waNumber, mainMenu);
        return;
      }
  
      // Validate choice
      if (isNaN(choice) || choice < 1) {
        await this.sendTextResponse(chat, chat.waNumber, '❌ Pilihan tidak valid. Silakan pilih nomor yang tersedia.');
        return;
      }
  
      // Get time slot for the choice
      const timeSlot = await this.reminderService.getTimeSlotByDeactivationChoice(chat.id, choice);
      
      if (!timeSlot) {
        await this.sendTextResponse(chat, chat.waNumber,'❌ Pilihan tidak valid. Silakan pilih nomor yang tersedia.');
        return;
      }
  
      // Deactivate the reminder
      await this.reminderService.deactivateReminderForTimeSlot(chat.id, timeSlot);
      
      // Generate success message
      const successMessage = this.reminderService.generateReminderDeactivatedMessage(timeSlot);
      await this.sendTextResponse(chat, chat.waNumber, successMessage);
  
      // Update scene back to reminder menu
      await this.updateChatScene(chat.id, 'menu.reminder');
  
    } catch (error) {
      console.error('Error handling reminder deactivation selection:', error);
      await this.sendTextResponse(chat, chat.waNumber, '❌ Terjadi kesalahan saat menonaktifkan reminder. Silakan coba lagi.');
      
      // Return to reminder menu on error
      await this.updateChatScene(chat.id, 'menu.reminder');
    }
  }

  /**
   * Send response message via WhatsApp
   */
  private async sendTextResponse(chat: Chat, sendTo: string, text: string): Promise<void> {
    try {
      // Add country code if not present
      const formattedNumber = sendTo.startsWith('62')
        ? sendTo
        : `62${sendTo.replace(/^0/, '')}`;

      const device = await this.prisma.device.findUnique({
        where: {
          id: chat.deviceId
        }
      });

      if (!device) {
        throw new NotFoundError(`Device with id ${chat.deviceId} not found`);
      }

      // await this.whatsappService.sendTextMessage(device.code, formattedNumber, text);

      await this.prisma.message.create({
        data: {
          chatId: chat.id,
          source: 'system',
          direction: 'out',
          type: 'text',
          body: text,
        },
      });

      console.log(`Response sent to ${sendTo} on device code ${device.code}`);
    } catch (error) {
      console.error(`Error sending response:`, error);
      throw error;
    }
  }

  /**
   * Send image response message via WhatsApp
   */
  private async sendImageResponse(chat: Chat, sendTo: string, caption: string, media: Buffer | string): Promise<void> {
    try {
      // Add country code if not present
      const formattedNumber = sendTo.startsWith('62')
        ? sendTo
        : `62${sendTo.replace(/^0/, '')}`;

      const device = await this.prisma.device.findUnique({
        where: {
          id: chat.deviceId
        }
      });

      if (!device) {
        throw new NotFoundError(`Device with id ${chat.deviceId} not found`);
      }

      // await this.whatsappService.sendImage(device.code, formattedNumber, caption, media);

      await this.prisma.message.create({
        data: {
          chatId: chat.id,
          source: 'system',
          direction: 'out',
          type: 'image',
          body: caption,
        },
      });

      console.log(`Image response sent to ${sendTo} on device code ${device.code}`);
    } catch (error) {
      console.error(`Error sending image response:`, error);
      throw error;
    }
  }

  /**
   * Send video response message via WhatsApp
   */
  private async sendVideoResponse(chat: Chat, sendTo: string, caption: string, media: Buffer | string): Promise<void> {
    try {
      // Add country code if not present
      const formattedNumber = sendTo.startsWith('62')
        ? sendTo
        : `62${sendTo.replace(/^0/, '')}`;

      const device = await this.prisma.device.findUnique({
        where: {
          id: chat.deviceId
        }
      });

      if (!device) {
        throw new NotFoundError(`Device with id ${chat.deviceId} not found`);
      }

      // await this.whatsappService.sendVideoBaileys(device.code, formattedNumber, caption, media);

      await this.prisma.message.create({
        data: {
          chatId: chat.id,
          source: 'system',
          direction: 'out',
          type: 'video',
          body: caption,
        },
      });

      console.log(`Video response sent to ${sendTo} on device code ${device.code}`);
    } catch (error) {
      console.error(`Error sending video response:`, error);
      throw error;
    }
  }
}
