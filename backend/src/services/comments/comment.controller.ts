/**
 * Comment Controller
 * Handles HTTP requests for comment operations
 */

import { Request, Response } from 'express';
import { commentService } from './comment.service';
import logger from '../../utils/logger';
import { z } from 'zod';

// Validation schemas
const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
  position: z.any().optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  position: z.any().optional(),
});

export class CommentController {
  /**
   * Create a comment on a letter
   * POST /api/letters/:letterId/comments
   */
  async createComment(req: Request, res: Response): Promise<void> {
    try {
      const { letterId } = req.params;
      const userId = req.user!.id;

      // Validate request body
      const validation = createCommentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          errors: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const comment = await commentService.createComment({
        letterId,
        userId,
        ...validation.data,
      });

      res.status(201).json({
        status: 'success',
        message: 'Comment created successfully',
        data: { comment },
      });
    } catch (error: any) {
      logger.error('Error in createComment controller:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        status: 'error',
        message: error.message || 'Failed to create comment',
      });
    }
  }

  /**
   * Get all comments for a letter
   * GET /api/letters/:letterId/comments
   */
  async getComments(req: Request, res: Response) {
    try {
      const { letterId } = req.params;
      const includeResolved = req.query.includeResolved !== 'false';
      const parentId = req.query.parentId as string | undefined;

      const comments = await commentService.getComments({
        letterId,
        includeResolved,
        parentId: parentId === 'null' ? null : parentId,
      });

      res.json({
        status: 'success',
        message: 'Comments retrieved successfully',
        data: { comments },
      });
    } catch (error: any) {
      logger.error('Error in getComments controller:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to retrieve comments',
      });
    }
  }

  /**
   * Get a single comment
   * GET /api/comments/:id
   */
  async getComment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const comment = await commentService.getComment(id);

      res.json({
        status: 'success',
        message: 'Comment retrieved successfully',
        data: { comment },
      });
    } catch (error: any) {
      logger.error('Error in getComment controller:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        status: 'error',
        message: error.message || 'Failed to retrieve comment',
      });
    }
  }

  /**
   * Update a comment
   * PUT /api/comments/:id
   */
  async updateComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Validate request body
      const validation = updateCommentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid input',
          errors: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const comment = await commentService.updateComment(id, userId, validation.data);

      res.json({
        status: 'success',
        message: 'Comment updated successfully',
        data: { comment },
      });
    } catch (error: any) {
      logger.error('Error in updateComment controller:', error);
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('author')
        ? 403
        : error.message.includes('resolved')
        ? 400
        : 500;

      res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Failed to update comment',
      });
    }
  }

  /**
   * Delete a comment
   * DELETE /api/comments/:id
   */
  async deleteComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await commentService.deleteComment(id, userId);

      res.json({
        status: 'success',
        message: 'Comment deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error in deleteComment controller:', error);
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('author') || error.message.includes('creator')
        ? 403
        : 500;

      res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Failed to delete comment',
      });
    }
  }

  /**
   * Resolve a comment
   * POST /api/comments/:id/resolve
   */
  async resolveComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const comment = await commentService.resolveComment(id, { resolvedBy: userId }, true);

      res.json({
        status: 'success',
        message: 'Comment resolved successfully',
        data: { comment },
      });
    } catch (error: any) {
      logger.error('Error in resolveComment controller:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        status: 'error',
        message: error.message || 'Failed to resolve comment',
      });
    }
  }

  /**
   * Unresolve a comment
   * POST /api/comments/:id/unresolve
   */
  async unresolveComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const comment = await commentService.resolveComment(id, { resolvedBy: userId }, false);

      res.json({
        status: 'success',
        message: 'Comment unresolved successfully',
        data: { comment },
      });
    } catch (error: any) {
      logger.error('Error in unresolveComment controller:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        status: 'error',
        message: error.message || 'Failed to unresolve comment',
      });
    }
  }

  /**
   * Get comment count for a letter
   * GET /api/letters/:letterId/comments/count
   */
  async getCommentCount(req: Request, res: Response) {
    try {
      const { letterId } = req.params;
      const includeResolved = req.query.includeResolved !== 'false';

      const count = await commentService.getCommentCount(letterId, includeResolved);

      res.json({
        status: 'success',
        message: 'Comment count retrieved successfully',
        data: { count },
      });
    } catch (error: any) {
      logger.error('Error in getCommentCount controller:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to retrieve comment count',
      });
    }
  }
}

export const commentController = new CommentController();

