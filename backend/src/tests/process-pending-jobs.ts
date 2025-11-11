/**
 * Process Pending Jobs Script
 * 
 * Forces processing of pending jobs and shows queue status
 */

import { getQueue, QUEUE_NAMES } from '../services/queue/queue.service';
import { startGenerationWorker } from '../services/queue/workers/generation.worker';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkAndProcess() {
  log('\n=== Checking Queue and Starting Worker ===', colors.blue);
  
  try {
    const queue = getQueue(QUEUE_NAMES.LETTER_GENERATION);
    
    // Get queue stats
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    
    log('\nQueue Statistics:', colors.yellow);
    log(`  Waiting: ${waiting}`, waiting > 0 ? colors.yellow : colors.reset);
    log(`  Active: ${active}`, active > 0 ? colors.green : colors.reset);
    log(`  Completed: ${completed}`, colors.green);
    log(`  Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);
    
    if (waiting > 0) {
      log(`\n${waiting} job(s) waiting to be processed`, colors.yellow);
      log('Starting worker...', colors.yellow);
      
      // Start the worker
      startGenerationWorker();
      
      log('\nWaiting 30 seconds for jobs to process...', colors.yellow);
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check stats again
      const [newWaiting, newActive, newCompleted] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
      ]);
      
      log('\nAfter 30 seconds:', colors.yellow);
      log(`  Waiting: ${newWaiting}`, newWaiting > 0 ? colors.yellow : colors.green);
      log(`  Active: ${newActive}`, newActive > 0 ? colors.green : colors.reset);
      log(`  Completed: ${newCompleted}`, colors.green);
      
      if (newCompleted > completed) {
        log(`\n✅ ${newCompleted - completed} job(s) completed!`, colors.green);
      } else if (newWaiting === waiting) {
        log(`\n❌ Jobs not processing - worker may not be running`, colors.red);
      }
    } else {
      log('\n✓ No jobs waiting', colors.green);
    }
    
  } catch (error: any) {
    log(`\n✗ Error: ${error.message}`, colors.red);
    console.error(error);
  }
  
  process.exit(0);
}

checkAndProcess();

