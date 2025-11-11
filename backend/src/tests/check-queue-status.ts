/**
 * Queue Status Diagnostic Script
 * 
 * Checks if Redis is connected and if the generation queue is working
 * Run with: npx ts-node src/tests/check-queue-status.ts
 */

import { getQueue, QUEUE_NAMES } from '../services/queue/queue.service';

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

async function checkQueueStatus() {
  log('\n=== Queue Status Diagnostic ===', colors.blue);
  
  try {
    // Get the generation queue
    log('\n1. Checking Generation Queue Connection...', colors.yellow);
    const queue = getQueue(QUEUE_NAMES.LETTER_GENERATION);
    
    log(`   Queue Name: ${QUEUE_NAMES.LETTER_GENERATION}`, colors.green);
    log(`   Queue Created: ✓`, colors.green);
    
    // Check Redis connection
    log('\n2. Testing Redis Connection...', colors.yellow);
    try {
      const client = (queue as any).client;
      if (client && client.status === 'ready') {
        log(`   Redis Status: ${client.status}`, colors.green);
        log(`   ✓ Redis is connected`, colors.green);
      } else {
        log(`   Redis Status: ${client?.status || 'unknown'}`, colors.yellow);
        log(`   ⚠️  Redis may not be fully connected`, colors.yellow);
      }
    } catch (err) {
      log(`   ✗ Could not check Redis status`, colors.red);
    }
    
    // Get queue stats
    log('\n3. Queue Statistics:', colors.yellow);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    
    log(`   Waiting Jobs: ${waiting}`, waiting > 0 ? colors.yellow : colors.reset);
    log(`   Active Jobs: ${active}`, active > 0 ? colors.green : colors.reset);
    log(`   Completed Jobs: ${completed}`, colors.green);
    log(`   Failed Jobs: ${failed}`, failed > 0 ? colors.red : colors.reset);
    log(`   Delayed Jobs: ${delayed}`, colors.reset);
    
    // Check if worker is running
    log('\n4. Worker Status:', colors.yellow);
    const workers = await queue.getWorkers();
    log(`   Active Workers: ${workers.length}`, workers.length > 0 ? colors.green : colors.red);
    
    if (workers.length === 0) {
      log(`   ⚠️  NO WORKERS RUNNING!`, colors.red);
      log(`   This means jobs will queue up but never process`, colors.yellow);
      log(`   Solution: Restart the backend server`, colors.yellow);
    } else {
      log(`   ✓ Worker(s) are running`, colors.green);
    }
    
    // Check recent failed jobs
    if (failed > 0) {
      log('\n5. Recent Failed Jobs:', colors.yellow);
      const failedJobs = await queue.getFailed(0, 5);
      
      for (const job of failedJobs) {
        log(`\n   Job ID: ${job.id}`, colors.red);
        log(`   Failed At: ${job.failedReason ? new Date(job.processedOn!).toISOString() : 'N/A'}`);
        log(`   Error: ${job.failedReason || 'Unknown'}`, colors.red);
        log(`   Letter ID: ${(job.data as any)?.letterId || 'N/A'}`);
      }
    }
    
    // Check recent completed jobs
    if (completed > 0) {
      log('\n6. Recent Completed Jobs:', colors.yellow);
      const completedJobs = await queue.getCompleted(0, 5);
      
      for (const job of completedJobs) {
        const result = job.returnvalue;
        log(`\n   Job ID: ${job.id}`, colors.green);
        log(`   Completed At: ${new Date(job.finishedOn!).toISOString()}`);
        log(`   Letter ID: ${result?.letterId || 'N/A'}`);
        log(`   Success: ${result?.success ? '✓' : '✗'}`, result?.success ? colors.green : colors.red);
        if (result?.error) {
          log(`   Error: ${JSON.stringify(result.error)}`, colors.red);
        }
      }
    }
    
    // Summary
    log('\n═══════════════════════════════════════', colors.blue);
    
    if (workers.length === 0) {
      log('❌ PROBLEM: No workers running!', colors.red);
      log('   The queue is not processing jobs', colors.red);
      log('   Solution: Restart backend server', colors.yellow);
    } else if (failed > waiting + active) {
      log('⚠️  WARNING: More failed jobs than pending', colors.yellow);
      log('   Check the error messages above', colors.yellow);
    } else {
      log('✅ Queue system is operational', colors.green);
      if (waiting > 0) {
        log(`   ${waiting} job(s) waiting to be processed`, colors.yellow);
      }
    }
    
    log('═══════════════════════════════════════\n', colors.blue);
    
  } catch (error: any) {
    log(`\n✗ Error checking queue status: ${error.message}`, colors.red);
    console.error(error);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Redis')) {
      log('\n⚠️  Redis connection failed!', colors.yellow);
      log('   Possible causes:', colors.yellow);
      log('   1. Redis is not running', colors.yellow);
      log('   2. Wrong Redis host/port in .env', colors.yellow);
      log('   3. Redis container not started', colors.yellow);
      log('\n   Solutions:', colors.yellow);
      log('   - Start Redis: docker-compose up -d redis', colors.yellow);
      log('   - Check .env: REDIS_HOST=localhost, REDIS_PORT=6379', colors.yellow);
    }
  }
  
  process.exit(0);
}

checkQueueStatus();

