/**
 * Auto-save Service
 * Handles debounced auto-save for letter editor
 */

import prisma from '../../utils/prisma-client';
import logger from '../../utils/logger';

interface AutoSaveData {
  content?: any;
  title?: string;
  metadata?: any;
}

interface AutoSaveOptions {
  createVersion?: boolean;
}

class AutoSaveService {
  private saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingSaves: Map<string, AutoSaveData> = new Map();
  private readonly DEBOUNCE_DELAY = 2000; // 2 seconds

  /**
   * Schedule an auto-save for a letter
   * Debounces multiple rapid saves into a single operation
   */
  async scheduleSave(
    letterId: string,
    userId: string,
    data: AutoSaveData,
    options: AutoSaveOptions = {}
  ): Promise<void> {
    // Clear existing timer for this letter
    const existingTimer = this.saveTimers.get(letterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Merge with any pending data
    const existingData = this.pendingSaves.get(letterId) || {};
    const mergedData = { ...existingData, ...data };
    this.pendingSaves.set(letterId, mergedData);

    // Schedule new save
    const timer = setTimeout(async () => {
      try {
        await this.executeSave(letterId, userId, mergedData, options);
        this.pendingSaves.delete(letterId);
        this.saveTimers.delete(letterId);
      } catch (error) {
        logger.error('Auto-save failed:', { letterId, error });
        // Don't delete pending data on error - will retry on next change
      }
    }, this.DEBOUNCE_DELAY);

    this.saveTimers.set(letterId, timer);
  }

  /**
   * Force immediate save (flush pending changes)
   */
  async forceSave(
    letterId: string,
    userId: string,
    options: AutoSaveOptions = {}
  ): Promise<void> {
    // Clear timer
    const existingTimer = this.saveTimers.get(letterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.saveTimers.delete(letterId);
    }

    // Get pending data
    const pendingData = this.pendingSaves.get(letterId);
    if (!pendingData) {
      logger.debug('No pending changes to save', { letterId });
      return;
    }

    // Execute save
    await this.executeSave(letterId, userId, pendingData, options);
    this.pendingSaves.delete(letterId);
  }

  /**
   * Execute the actual save operation
   */
  private async executeSave(
    letterId: string,
    userId: string,
    data: AutoSaveData,
    options: AutoSaveOptions
  ): Promise<void> {
    try {
      // Verify letter exists and user has access
      const letter = await prisma.letter.findUnique({
        where: { id: letterId },
        select: {
          id: true,
          firmId: true,
          version: true,
          content: true,
          createdBy: true,
        },
      });

      if (!letter) {
        throw new Error('Letter not found');
      }

      // Verify user has access
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firmId: true, role: true },
      });

      if (!user || user.firmId !== letter.firmId) {
        throw new Error('User does not have access to this letter');
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.content !== undefined) {
        updateData.content = data.content;
      }

      if (data.title !== undefined) {
        updateData.title = data.title;
      }

      if (data.metadata !== undefined) {
        updateData.metadata = data.metadata;
      }

      // Update letter
      await prisma.letter.update({
        where: { id: letterId },
        data: updateData,
      });

      // Create version if requested (for manual saves, not auto-saves)
      if (options.createVersion && data.content) {
        await prisma.letterVersion.create({
          data: {
            letterId,
            version: letter.version + 1,
            content: data.content,
            createdBy: userId,
            changes: this.calculateChanges(letter.content, data.content),
          },
        });

        // Increment version number
        await prisma.letter.update({
          where: { id: letterId },
          data: { version: letter.version + 1 },
        });
      }

      logger.info('Auto-save completed', {
        letterId,
        userId,
        createVersion: options.createVersion,
      });
    } catch (error: any) {
      logger.error('Error executing auto-save:', {
        letterId,
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Calculate changes between two content versions
   * Simple implementation - can be enhanced with proper diff algorithm
   */
  private calculateChanges(oldContent: any, newContent: any): any {
    return {
      timestamp: new Date().toISOString(),
      oldContentLength: JSON.stringify(oldContent).length,
      newContentLength: JSON.stringify(newContent).length,
      // In a real implementation, you'd use a proper diff library
      // like diff-match-patch or fast-diff
    };
  }

  /**
   * Cancel pending save for a letter
   */
  cancelSave(letterId: string): void {
    const timer = this.saveTimers.get(letterId);
    if (timer) {
      clearTimeout(timer);
      this.saveTimers.delete(letterId);
    }
    this.pendingSaves.delete(letterId);
  }

  /**
   * Get pending changes for a letter
   */
  getPendingChanges(letterId: string): AutoSaveData | undefined {
    return this.pendingSaves.get(letterId);
  }

  /**
   * Check if letter has pending changes
   */
  hasPendingChanges(letterId: string): boolean {
    return this.pendingSaves.has(letterId);
  }

  /**
   * Cleanup - force save all pending changes (useful on server shutdown)
   */
  async flushAll(): Promise<void> {
    logger.info('Flushing all pending auto-saves');
    const promises: Promise<void>[] = [];

    for (const [letterId, data] of this.pendingSaves.entries()) {
      // We don't have userId here, so we'll use the letter's creator
      const letter = await prisma.letter.findUnique({
        where: { id: letterId },
        select: { createdBy: true },
      });

      if (letter) {
        promises.push(
          this.executeSave(letterId, letter.createdBy, data, {
            createVersion: false,
          })
        );
      }
    }

    await Promise.allSettled(promises);
    
    // Clear all timers and pending saves
    for (const timer of this.saveTimers.values()) {
      clearTimeout(timer);
    }
    this.saveTimers.clear();
    this.pendingSaves.clear();

    logger.info('All pending auto-saves flushed');
  }
}

// Export singleton instance
export const autoSaveService = new AutoSaveService();

