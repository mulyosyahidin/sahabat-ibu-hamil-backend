import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { PrismaClient } from "@/generated/prisma";
import { ApiResponse } from "@/models";
import { OverviewService } from "@/services/overview.service";
import { AppError } from "@/utils";

export class OverviewController {
    private overviewService: OverviewService;

    constructor() {
        const prisma = new PrismaClient();

        this.overviewService = new OverviewService(prisma);
    }

    /**
     * Get overview data
     */
    getOverview = async (req: Request<ParamsDictionary, unknown, unknown, ParsedQs>,
        res: Response): Promise<void> => {
        try {
            const data = {
                chatCount: await this.overviewService.getChatCount(),
                consultationCount: await this.overviewService.getConsultationCount(),
                deviceCount: await this.overviewService.getDeviceCount(),
                chatCountPerDay: await this.overviewService.getChatCountPerDay(),
            };

            res.status(200).json(ApiResponse.success('Overview data berhasil diambil', data));
        } catch (error) {
            if (error instanceof AppError) {
                res.status(error.statusCode).json(ApiResponse.error(error.message));
            } else {
                console.error('Device creation error:', error);
                res.status(500).json(ApiResponse.error('Terjadi kesalahan internal server'));
            }
        }
    }
}