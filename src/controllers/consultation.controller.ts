/**
 * Consultation Controller
 * 
 * This controller handles HTTP requests for consultation endpoints including
 * consultation retrieval, status updates, and answering functionality.
 * 
 * @author Sahabat Ibu Hamil Team
 * @version 1.0.0
 */

import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import { PrismaClient } from '@/generated/prisma';
import { ConsultationService } from '@/services';
import { ApiResponse, toConsultationResponseData, type ConsultationsListData } from '@/models/responses';
import { validateAndRespond } from '@/utils';
import type { UpdateConsultationStatusRequest, AnswerConsultationRequest } from '@/models/requests';
import { updateConsultationStatusValidationSchema, answerConsultationValidationSchema } from '@/validations';
import { AppError } from '@/utils';
import { appInstanceManager } from '@/utils/app-instance.util';

export class ConsultationController {
  private consultationService: ConsultationService;

  constructor() {
    const prisma = new PrismaClient();
    this.consultationService = new ConsultationService(prisma);
    
    // Register device service in app instance manager
    appInstanceManager.setConsultationService(this.consultationService);
  }

  /**
   * Get all consultations endpoint
   * GET /consultations
   */
  getAll = async (
    req: Request<ParamsDictionary, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const paginatedResult = await this.consultationService.getAllConsultations(page, limit);
      
      // Transform the result to match ConsultationsListData structure
      const consultationsListData: ConsultationsListData = {
        data: paginatedResult.data.map(consultation => toConsultationResponseData(consultation)),
        pagination: paginatedResult.pagination
      };
      
      res.json(ApiResponse.success('Konsultasi berhasil diambil', consultationsListData));
    } catch (error) {
      console.error('Get all consultations error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Get consultation by ID endpoint
   * GET /consultations/:id
   */
  getById = async (
    req: Request<{ id: string }, unknown, unknown, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      const consultationId = parseInt(req.params.id);
      
      if (isNaN(consultationId)) {
        res.status(400).json(ApiResponse.error('Invalid consultation ID'));
        return;
      }
      
      // Find consultation by ID
      const consultation = await this.consultationService.getConsultationById(consultationId);
      
      res.json(ApiResponse.success('Konsultasi berhasil diambil', toConsultationResponseData(consultation)));
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Update consultation status endpoint
   * PUT /consultations/:id/status
   */
  updateStatus = async (
    req: Request<{ id: string }, unknown, UpdateConsultationStatusRequest, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      // Validate ID parameter
      const consultationId = parseInt(req.params.id);
      
      if (isNaN(consultationId)) {
        res.status(400).json(ApiResponse.error('Invalid consultation ID'));
        return;
      }
      
      // Validate request body using validation utility
      const validatedData = validateAndRespond(updateConsultationStatusValidationSchema, req.body, res);
      
      if (!validatedData) {
        // Validation failed, response already sent with 422 status
        return;
      }
      
      const consultation = await this.consultationService.updateStatus(consultationId, validatedData);
      
      res.json(ApiResponse.success('Status konsultasi berhasil diupdate', toConsultationResponseData(consultation)));
    } catch (error) {
      console.error('Update consultation status error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };

  /**
   * Answer consultation endpoint
   * PUT /consultations/:id/answer
   */
  answer = async (
    req: Request<{ id: string }, unknown, AnswerConsultationRequest, ParsedQs>,
    res: Response
  ): Promise<void> => {
    try {
      // Validate ID parameter
      const consultationId = parseInt(req.params.id);
      
      if (isNaN(consultationId)) {
        res.status(400).json(ApiResponse.error('Invalid consultation ID'));
        return;
      }
      
      // Validate request body using validation utility
      const validatedData = validateAndRespond(answerConsultationValidationSchema, req.body, res);
      
      if (!validatedData) {
        // Validation failed, response already sent with 422 status
        return;
      }
      
      const consultation = await this.consultationService.answer(consultationId, validatedData);
      
      res.json(ApiResponse.success('Konsultasi berhasil dijawab', toConsultationResponseData(consultation)));
    } catch (error) {
      console.error('Answer consultation error:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json(ApiResponse.error(error.message));
        return;
      }

      res.status(500).json(ApiResponse.error('Internal server error'));
    }
  };
}