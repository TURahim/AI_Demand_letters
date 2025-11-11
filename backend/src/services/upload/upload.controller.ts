import { Request, Response } from 'express';
import * as uploadService from './upload.service';
import {
  presignedUrlSchema,
  uploadCompleteSchema,
} from './upload.validation';
import { asyncHandler } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Request presigned URL for upload
 * POST /api/v1/upload/presigned-url
 */
export const requestPresignedUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Presigned URL requested', { userId, firmId });

    // Validate request
    const validatedData = presignedUrlSchema.parse(req.body);

    // Generate presigned URL
    const result = await uploadService.requestPresignedUrl(
      validatedData.fileName,
      validatedData.fileSize,
      validatedData.contentType,
      userId,
      firmId
    );

    res.json({
      status: 'success',
      data: result,
    });
  }
);

/**
 * Complete upload
 * POST /api/v1/upload/complete
 */
export const completeUpload = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const firmId = req.user!.firmId;

    logger.info('Upload completion requested', { userId, firmId });

    // Validate request
    const validatedData = uploadCompleteSchema.parse(req.body);

    // Complete upload
    const document = await uploadService.completeUpload(
      validatedData.fileName,
      validatedData.fileSize,
      validatedData.contentType,
      validatedData.s3Key,
      validatedData.fileHash,
      userId,
      firmId,
      req.body.metadata
    );

    res.status(201).json({
      status: 'success',
      message: 'Upload completed successfully',
      data: { document },
    });
  }
);

