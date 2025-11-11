import * as Diff from 'diff';
import logger from '../../utils/logger';

/**
 * Calculate text diff between two strings
 */
export function calculateTextDiff(oldText: string, newText: string): {
  changes: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
    count?: number;
  }>;
  stats: {
    additions: number;
    deletions: number;
    unchanged: number;
  };
} {
  const changes = Diff.diffWords(oldText, newText);

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  changes.forEach(part => {
    const count = part.count || 0;
    if (part.added) {
      additions += count;
    } else if (part.removed) {
      deletions += count;
    } else {
      unchanged += count;
    }
  });

  return {
    changes,
    stats: {
      additions,
      deletions,
      unchanged,
    },
  };
}

/**
 * Calculate line-by-line diff
 */
export function calculateLineDiff(oldText: string, newText: string): {
  changes: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
    count?: number;
  }>;
  stats: {
    linesAdded: number;
    linesRemoved: number;
    linesUnchanged: number;
  };
} {
  const changes = Diff.diffLines(oldText, newText);

  let linesAdded = 0;
  let linesRemoved = 0;
  let linesUnchanged = 0;

  changes.forEach(part => {
    const count = part.count || 0;
    if (part.added) {
      linesAdded += count;
    } else if (part.removed) {
      linesRemoved += count;
    } else {
      linesUnchanged += count;
    }
  });

  return {
    changes,
    stats: {
      linesAdded,
      linesRemoved,
      linesUnchanged,
    },
  };
}

/**
 * Calculate JSON diff for structured content
 */
export function calculateJSONDiff(
  oldObj: any,
  newObj: any
): {
  added: string[];
  removed: string[];
  modified: Array<{
    path: string;
    oldValue: any;
    newValue: any;
  }>;
} {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ path: string; oldValue: any; newValue: any }> = [];

  // Helper to get all keys recursively
  function getAllKeys(obj: any, prefix = ''): Set<string> {
    const keys = new Set<string>();
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const path = prefix ? `${prefix}.${key}` : key;
        keys.add(path);
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          getAllKeys(obj[key], path).forEach(k => keys.add(k));
        }
      });
    }
    return keys;
  }

  // Get value at path
  function getValueAtPath(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  const oldKeys = getAllKeys(oldObj);
  const newKeys = getAllKeys(newObj);

  // Find added keys
  newKeys.forEach(key => {
    if (!oldKeys.has(key)) {
      added.push(key);
    }
  });

  // Find removed keys
  oldKeys.forEach(key => {
    if (!newKeys.has(key)) {
      removed.push(key);
    }
  });

  // Find modified keys
  oldKeys.forEach(key => {
    if (newKeys.has(key)) {
      const oldValue = getValueAtPath(oldObj, key);
      const newValue = getValueAtPath(newObj, key);
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        modified.push({
          path: key,
          oldValue,
          newValue,
        });
      }
    }
  });

  return { added, removed, modified };
}

/**
 * Generate human-readable diff summary
 */
export function generateDiffSummary(
  oldContent: any,
  newContent: any,
  contentType: 'text' | 'json' = 'text'
): string {
  if (contentType === 'json') {
    const diff = calculateJSONDiff(oldContent, newContent);
    
    const parts: string[] = [];
    if (diff.added.length > 0) {
      parts.push(`Added ${diff.added.length} field(s)`);
    }
    if (diff.removed.length > 0) {
      parts.push(`Removed ${diff.removed.length} field(s)`);
    }
    if (diff.modified.length > 0) {
      parts.push(`Modified ${diff.modified.length} field(s)`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No changes';
  } else {
    // Text diff
    const oldText = typeof oldContent === 'string' ? oldContent : JSON.stringify(oldContent);
    const newText = typeof newContent === 'string' ? newContent : JSON.stringify(newContent);
    
    const diff = calculateTextDiff(oldText, newText);
    
    if (diff.stats.additions === 0 && diff.stats.deletions === 0) {
      return 'No changes';
    }

    const parts: string[] = [];
    if (diff.stats.additions > 0) {
      parts.push(`+${diff.stats.additions} words`);
    }
    if (diff.stats.deletions > 0) {
      parts.push(`-${diff.stats.deletions} words`);
    }

    return parts.join(', ');
  }
}

/**
 * Apply patch to text (useful for collaborative editing)
 */
export function applyPatch(
  originalText: string,
  patch: string
): { success: boolean; result?: string; error?: string } {
  try {
    const result = Diff.applyPatch(originalText, patch);
    if (result === false) {
      return {
        success: false,
        error: 'Patch could not be applied',
      };
    }
    return {
      success: true,
      result: result as string,
    };
  } catch (error: any) {
    logger.error('Failed to apply patch', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create patch from diff
 */
export function createPatch(
  fileName: string,
  oldText: string,
  newText: string
): string {
  return Diff.createPatch(fileName, oldText, newText);
}

/**
 * Get change statistics
 */
export function getChangeStats(oldText: string, newText: string): {
  charactersAdded: number;
  charactersRemoved: number;
  wordsAdded: number;
  wordsRemoved: number;
  linesAdded: number;
  linesRemoved: number;
  changePercentage: number;
} {
  const wordDiff = calculateTextDiff(oldText, newText);
  const lineDiff = calculateLineDiff(oldText, newText);

  const oldLength = oldText.length;
  const newLength = newText.length;
  const changePercentage = oldLength > 0 
    ? Math.abs(newLength - oldLength) / oldLength * 100 
    : 100;

  return {
    charactersAdded: Math.max(0, newLength - oldLength),
    charactersRemoved: Math.max(0, oldLength - newLength),
    wordsAdded: wordDiff.stats.additions,
    wordsRemoved: wordDiff.stats.deletions,
    linesAdded: lineDiff.stats.linesAdded,
    linesRemoved: lineDiff.stats.linesRemoved,
    changePercentage: Math.round(changePercentage * 100) / 100,
  };
}

