import type { PrismaClient } from "@/generated/prisma";
import { toYMD, type DayCount } from "@/utils";

export class OverviewService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Get chat count
     */
    getChatCount = async () => {
        return await this.prisma.chat.count();
    }

    /**
     * Get consultation count
     */
    getConsultationCount = async () => {
        return await this.prisma.consultation.count();
    }

    /**
     * Get device count
     */
    getDeviceCount = async () => {
        return await this.prisma.device.count();
    }

    /**
     * Get chat count in last 7 days
     */
    async getChatCountPerDay(): Promise<DayCount[]> {
        const TZ = 'Asia/Jakarta';

        // tentukan rentang [start, end) = 7 hari terakhir berakhir di awal hari besok (TZ aware)
        const now = new Date();
        const endLocalMidnight = new Date(
            new Date(now).toLocaleString('en-US', { timeZone: TZ })
        );
        endLocalMidnight.setHours(24, 0, 0, 0); // awal hari besok (di TZ)

        const startLocalMidnight = new Date(endLocalMidnight);
        startLocalMidnight.setDate(startLocalMidnight.getDate() - 7);

        // seed 7 hari dengan count=0 (urut lama -> terbaru)
        const days: DayCount[] = [];
        const idxByDate = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const d = new Date(startLocalMidnight);
            d.setDate(d.getDate() + i);
            const key = toYMD(d, TZ);
            idxByDate.set(key, i);
            days.push({ date: key, count: 0 });
        }

        // ambil hanya 7 hari terakhir, lalu agregasi di JS ke level tanggal lokal
        const rows = await this.prisma.chat.findMany({
            where: {
                created_at: {
                    gte: startLocalMidnight, // prisma simpan UTC; ini tetap valid
                    lt: endLocalMidnight,
                },
            },
            select: { created_at: true },
        });

        for (const r of rows) {
            // r.created_at adalah Date, konversi ke YYYY-MM-DD TZ lokal
            const key = toYMD(r.created_at, TZ);
            const i = idxByDate.get(key);
            if (i !== undefined) days[i]!.count++;
        }

        return days;
    }
}