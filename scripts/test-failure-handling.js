#!/usr/bin/env node

/**
 * SpaceSync BACSE344 DA3 - Q1(c) Failure Handling & Resilience Test Script
 * 
 * Coordinates a sustained concurrent load test while stopping one backend container
 * mid-flight to measure request failure and Nginx failover resilience.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Auto-load root .env or backend/.env if present
try {
  const envPath = path.join(__dirname, '..', '.env');
  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
  const targetEnv = fs.existsSync(envPath) ? envPath : (fs.existsSync(backendEnvPath) ? backendEnvPath : null);
  if (targetEnv) {
    const envContent = fs.readFileSync(targetEnv, 'utf8');
    for (const line of envContent.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val.trim();
      }
    }
  }
} catch {}

const NGINX_PORT = process.env.NGINX_PORT || '8081';
const TARGET_URL = process.env.TARGET_URL || process.argv[2] || `http://localhost:${NGINX_PORT}/api/resources`;
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '600', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const STOP_TRIGGER_REQ = parseInt(process.env.STOP_TRIGGER_REQ || '180', 10);
const CONTAINER_TO_STOP = process.env.CONTAINER_TO_STOP || 'spacesync-backend-2';
const TEST_PHASE = process.argv[3] || process.env.TEST_PHASE || 'baseline'; // 'baseline' or 'resilience'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendRequest(id) {
  const start = Date.now();
  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SpaceSync-Failover-Test/1.0',
      },
    });

    const latencyMs = Date.now() - start;
    const servedBy = res.headers.get('x-served-by') || res.headers.get('x-backend-instance') || 'unknown';

    return {
      id,
      success: res.ok,
      statusCode: res.status,
      servedBy,
      latencyMs,
    };
  } catch (err) {
    return {
      id,
      success: false,
      statusCode: 'CONN_ERR',
      servedBy: 'none',
      latencyMs: Date.now() - start,
      error: err.message,
    };
  }
}

async function runTest() {
  console.log('========================================================================');
  console.log(` SpaceSync BACSE344 DA3 - Q1(c) Failure Experiment [${TEST_PHASE.toUpperCase()}]`);
  console.log('========================================================================');
  console.log(` Target Endpoint:     ${TARGET_URL}`);
  console.log(` Total Requests:      ${TOTAL_REQUESTS}`);
  console.log(` Concurrency Level:   ${CONCURRENCY}`);
  console.log(` Interruption Target: ${CONTAINER_TO_STOP} (stopped at request #${STOP_TRIGGER_REQ})`);
  console.log('------------------------------------------------------------------------\n');

  let stoppedTriggered = false;
  let stopTimestamp = null;
  let stopDurationMs = null;
  let containerStateBefore = 'unknown';
  let containerStateAfterStop = 'unknown';
  let containerRestored = false;
  const results = [];
  const statusCounts = {};
  const instanceCounts = {};

  // Pre-test container state verification
  try {
    const isRunning = execSync(`docker inspect -f "{{.State.Running}}" ${CONTAINER_TO_STOP}`, { encoding: 'utf8' }).trim();
    containerStateBefore = isRunning === 'true' ? 'running' : 'stopped';
    if (isRunning !== 'true') {
      console.log(`⚠️ Container [${CONTAINER_TO_STOP}] is not currently running. Starting it prior to test...`);
      execSync(`docker start ${CONTAINER_TO_STOP}`, { stdio: 'ignore' });
      await sleep(4000);
      containerStateBefore = 're-started';
    }
  } catch (err) {
    console.warn(`Warning: Could not inspect container state before test: ${err.message}`);
  }
  console.log(`[PRE-FLIGHT] Container [${CONTAINER_TO_STOP}] initial state: ${containerStateBefore}`);

  let requestIndex = 0;
  const startTime = Date.now();

  // Worker pool for concurrency control
  async function worker() {
    while (true) {
      const currentReq = ++requestIndex;
      if (currentReq > TOTAL_REQUESTS) break;

      // Trigger container stop mid-flight
      if (currentReq === STOP_TRIGGER_REQ && !stoppedTriggered) {
        stoppedTriggered = true;
        stopTimestamp = new Date().toISOString();
        console.log(`\n⚡ [INTERRUPTION TRIGGERED] Stopping container [${CONTAINER_TO_STOP}] at request #${currentReq}...`);
        const stopStart = Date.now();
        try {
          execSync(`docker stop ${CONTAINER_TO_STOP}`, { stdio: 'ignore' });
          stopDurationMs = Date.now() - stopStart;
          const isRunningAfter = execSync(`docker inspect -f "{{.State.Running}}" ${CONTAINER_TO_STOP}`, { encoding: 'utf8' }).trim();
          containerStateAfterStop = isRunningAfter === 'true' ? 'running' : 'stopped';
          console.log(`🛑 [STOPPED] Container [${CONTAINER_TO_STOP}] stopped in ${stopDurationMs}ms (State: ${containerStateAfterStop}).\n`);
        } catch (e) {
          console.error(`Failed to stop container: ${e.message}`);
        }
      }

      const res = await sendRequest(currentReq);
      results.push(res);

      statusCounts[res.statusCode] = (statusCounts[res.statusCode] || 0) + 1;
      if (res.success) {
        instanceCounts[res.servedBy] = (instanceCounts[res.servedBy] || 0) + 1;
      }

      if (currentReq % 100 === 0 || currentReq === TOTAL_REQUESTS) {
        process.stdout.write(` Progress: ${currentReq}/${TOTAL_REQUESTS} requests completed...\r`);
      }
    }
  }

  try {
    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);
  } finally {
    // Guaranteed recovery: restart the stopped container after the experiment phase completes
    if (stoppedTriggered) {
      console.log(`\n🔄 [CLEANUP / RESTORATION] Restoring container [${CONTAINER_TO_STOP}]...`);
      try {
        execSync(`docker start ${CONTAINER_TO_STOP}`, { stdio: 'ignore' });
        await sleep(3000);
        const restoredState = execSync(`docker inspect -f "{{.State.Running}}" ${CONTAINER_TO_STOP}`, { encoding: 'utf8' }).trim();
        containerRestored = restoredState === 'true';
        console.log(`✅ [RESTORED] Container [${CONTAINER_TO_STOP}] running: ${containerRestored}\n`);
      } catch (err) {
        console.error(`Failed to restore container ${CONTAINER_TO_STOP}: ${err.message}`);
      }
    }
  }

  const totalDurationSeconds = (Date.now() - startTime) / 1000;
  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = results.filter((r) => !r.success).length;
  const requestsPerSec = (TOTAL_REQUESTS / totalDurationSeconds).toFixed(2);
  const avgLatency = (results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length).toFixed(2);
  const successRate = ((successfulRequests / TOTAL_REQUESTS) * 100).toFixed(2);

  console.log('\n\n------------------------------------------------------------------------');
  console.log(' Failure Experiment Results Breakdown');
  console.log('------------------------------------------------------------------------');
  console.log(`Total Requests:         ${TOTAL_REQUESTS}`);
  console.log(`Successful Requests:    ${successfulRequests}`);
  console.log(`Failed Requests:        ${failedRequests}`);
  console.log(`Success Rate:           ${successRate}%`);
  console.log(`Total Duration:         ${totalDurationSeconds.toFixed(3)}s`);
  console.log(`Throughput:             ${requestsPerSec} RPS`);
  console.log(`Average Latency:        ${avgLatency}ms`);
  console.log(`Interruption Timestamp: ${stopTimestamp || 'N/A'}`);
  console.log('\nHTTP Status Distribution:');
  for (const [status, count] of Object.entries(statusCounts)) {
    const pct = ((count / TOTAL_REQUESTS) * 100).toFixed(1);
    console.log(`  • HTTP ${status}: ${count} requests (${pct}%)`);
  }

  console.log('\nServing Instances (Successful Requests):');
  for (const [inst, count] of Object.entries(instanceCounts)) {
    const pct = ((count / successfulRequests) * 100).toFixed(1);
    console.log(`  • ${inst.padEnd(12)}: ${count} requests (${pct}%)`);
  }
  console.log('========================================================================\n');

  return {
    test_phase: TEST_PHASE,
    target_url: TARGET_URL,
    total_requests: TOTAL_REQUESTS,
    concurrency: CONCURRENCY,
    stopped_container: CONTAINER_TO_STOP,
    container_state_before: containerStateBefore,
    container_state_after_stop: containerStateAfterStop,
    stop_duration_ms: stopDurationMs,
    container_restored: containerRestored,
    interruption_request_index: STOP_TRIGGER_REQ,
    interruption_timestamp: stopTimestamp,
    total_duration_seconds: totalDurationSeconds,
    requests_per_second: parseFloat(requestsPerSec),
    average_latency_ms: parseFloat(avgLatency),
    successful_requests: successfulRequests,
    failed_requests: failedRequests,
    success_rate_percent: parseFloat(successRate),
    status_distribution: statusCounts,
    instance_distribution: instanceCounts,
  };
}

if (require.main === module) {
  runTest()
    .then((data) => {
      const outPath = path.join(__dirname, '..', 'docs', 'da3', 'evidence', `raw-${TEST_PHASE}.json`);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    })
    .catch((err) => {
      console.error('Fatal error during failure experiment:', err);
      process.exit(1);
    });
}

module.exports = { runTest };
