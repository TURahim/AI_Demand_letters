/**
 * Comment Service
 * Handles comment CRUD operations for letters
 */

import prisma from '../../utils/prisma-client';
import logger from '../../utils/logger';

export interface CreateCommentDto {
  letterId: string;
  userId: string;
  content: string;
  parentId?: string;
  position?: any;
}

export interface UpdateCommentDto {
  content?: string;
  position?: any;
  isResolved?: boolean;
}

export interface ResolveCommentDto {
  resolvedBy: string;
}

export interface ListCommentsOptions {
  letterId: string;
  includeResolved?: boolean;
  parentId?: string | null; // null for root comments only
}

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(data: CreateCommentDto) {
    try {
      // Verify letter exists and user has access
      const letter = await prisma.letter.findUnique({
        where: { id: data.letterId },
        select: { id: true, firmId: true },
      });

      if (!letter) {
        throw new Error('Letter not found');
      }

      // Verify user has access to this letter's firm
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, firmId: true },
      });

      if (!user || user.firmId !== letter.firmId) {
        throw new Error('User does not have access to this letter');
      }

      // If parentId is provided, verify parent comment exists
      if (data.parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: data.parentId },
        });

        if (!parentComment) {
          throw new Error('Parent comment not found');
        }

        if (parentComment.letterId !== data.letterId) {
          throw new Error('Parent comment belongs to a different letter');
        }
      }

      // Create the comment
      const comment = await prisma.comment.create({
        data: {
          letterId: data.letterId,
          userId: data.userId,
          content: data.content,
          parentId: data.parentId,
          position: data.position,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info('Comment created', {
        commentId: comment.id,
        letterId: data.letterId,
        userId: data.userId,
      });

      return comment;
    } catch (error: any) {
      logger.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a letter
   */
  async getComments(options: ListCommentsOptions) {
    try {
      const { letterId, includeResolved = true, parentId } = options;

      const where: any = {
        letterId,
      };

      if (!includeResolved) {
        where.isResolved = false;
      }

      // If parentId is explicitly null, get only root comments
      // If parentId is undefined, get all comments
      // If parentId is a string, get comments with that parent
      if (parentId === null) {
        where.parentId = null;
      } else if (parentId !== undefined) {
        where.parentId = parentId;
      }

      const comments = await prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return comments;
    } catch (error: any) {
      logger.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Get a single comment by ID
   */
  async getComment(commentId: string) {
    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      return comment;
    } catch (error: any) {
      logger.error('Error getting comment:', error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, data: UpdateCommentDto) {
    try {
      // Verify comment exists and user is the author
      const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!existingComment) {
        throw new Error('Comment not found');
      }

      if (existingComment.userId !== userId) {
        throw new Error('Only the comment author can edit it');
      }

      if (existingComment.isResolved) {
        throw new Error('Cannot edit a resolved comment');
      }

      // Update the comment
      const comment = await prisma.comment.update({
        where: { id: commentId },
        data: {
          content: data.content,
          position: data.position,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      logger.info('Comment updated', { commentId, userId });

      return comment;
    } catch (error: any) {
      logger.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string) {
    try {
      // Verify comment exists and user is the author
      const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          letter: {
            select: {
              createdBy: true,
            },
          },
        },
      });

      if (!existingComment) {
        throw new Error('Comment not found');
      }

      // Allow deletion if user is the author or the letter creator
      if (
        existingComment.userId !== userId &&
        existingComment.letter.createdBy !== userId
      ) {
        throw new Error('Only the comment author or letter creator can delete this comment');
      }

      // Delete the comment (cascades to replies)
      await prisma.comment.delete({
        where: { id: commentId },
      });

      logger.info('Comment deleted', { commentId, userId });

      return { success: true };
    } catch (error: any) {
      logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  /**
   * Resolve or unresolve a comment
   */
  async resolveComment(commentId: string, data: ResolveCommentDto, resolve: boolean = true) {
    try {
      const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!existingComment) {
        throw new Error('Comment not found');
      }

      const comment = await prisma.comment.update({
        where: { id: commentId },
        data: resolve
          ? {
              isResolved: true,
              resolvedBy: data.resolvedBy,
              resolvedAt: new Date(),
            }
          : {
              isResolved: false,
              resolvedBy: null,
              resolvedAt: null,
            },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resolver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info(`Comment ${resolve ? 'resolved' : 'unresolved'}`, {
        commentId,
        resolvedBy: data.resolvedBy,
      });

      return comment;
    } catch (error: any) {
      logger.error('Error resolving comment:', error);
      throw error;
    }
  }

  /**
   * Get comment count for a letter
   */
  async getCommentCount(letterId: string, includeResolved: boolean = true) {
    try {
      const where: any = {
        letterId,
      };

      if (!includeResolved) {
        where.isResolved = false;
      }

      const count = await prisma.comment.count({
        where,
      });

      return count;
    } catch (error: any) {
      logger.error('Error getting comment count:', error);
      throw error;
    }
  }
}

export const commentService = new CommentService();

