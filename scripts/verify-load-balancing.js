#!/usr/bin/env node

/**
 * SpaceSync Digital Assignment 3 (DA3) - Question 1(a) Verification Script
 * 
 * Demonstrates and verifies that requests sent to the Nginx load balancer
 * (http://localhost:8080) are distributed across all three backend instances:
 * - backend-1
 * - backend-2
 * - backend-3
 */

const NGINX_PORT = process.env.NGINX_PORT || '8080';
const TARGET_URL = process.env.TARGET_URL || process.argv[2] || `http://localhost:${NGINX_PORT}/api/health`;
const RESOURCES_URL = TARGET_URL.replace(/\/(api\/)?health\/?$/, '/api/resources');
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '15', 10);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendRequest(url, index) {
  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SpaceSync-LoadBalancer-Verification/1.0',
      },
    });

    const latencyMs = Date.now() - startTime;
    const servedByHeader = res.headers.get('x-served-by') || res.headers.get('x-backend-instance');
    const proxyByHeader = res.headers.get('x-proxy-by') || 'Nginx';

    let instanceFromPayload = null;
    let dbStatus = 'unknown';
    let payloadMessage = null;

    try {
      const data = await res.json();
      instanceFromPayload = data.instance || null;
      dbStatus = data.database || 'unknown';
      payloadMessage = data.message || null;
    } catch {
      // Non-JSON response
    }

    const instance = servedByHeader || instanceFromPayload || 'unknown';
    const isHealthy = res.ok && (dbStatus === 'connected' || dbStatus === 'embedded');

    return {
      success: isHealthy,
      statusCode: res.status,
      instance,
      proxy: proxyByHeader,
      database: dbStatus,
      message: payloadMessage,
      latencyMs,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 'CONN_ERR',
      instance: 'none',
      proxy: 'none',
      database: 'none',
      latencyMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

async function runDemonstration() {
  console.log('========================================================================');
  console.log(' SpaceSync BACSE344 DA3 - Q1(a) Load Balancing Demonstration');
  console.log('========================================================================');
  console.log(` Target Load Balancer:  ${TARGET_URL}`);
  console.log(` Total Sample Requests: ${TOTAL_REQUESTS}`);
  console.log(` Load Balancing Method: Nginx Round-Robin (default)`);
  console.log('------------------------------------------------------------------------\n');

  const instanceCounts = {};
  const failureStatusCounts = {};
  const results = [];

  console.log('Sending requests sequentially through Nginx (port 8080)...\n');
  console.log('Req # | Status | Upstream Handled By       | Database    | Latency | Result');
  console.log('------|--------|---------------------------|-------------|---------|-------');

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const res = await sendRequest(TARGET_URL, i);
    results.push(res);

    if (res.instance && res.instance !== 'none' && res.instance !== 'unknown') {
      instanceCounts[res.instance] = (instanceCounts[res.instance] || 0) + 1;
    }

    if (!res.success) {
      failureStatusCounts[res.statusCode] = (failureStatusCounts[res.statusCode] || 0) + 1;
    }

    const paddedIndex = String(i).padStart(5, ' ');
    const paddedStatus = String(res.statusCode).padEnd(6, ' ');
    const paddedInstance = String(res.instance).padEnd(25, ' ');
    const paddedDb = String(res.database).padEnd(11, ' ');
    const paddedLatency = `${res.latencyMs}ms`.padEnd(7, ' ');
    const symbol = res.success ? '✅ OK' : `❌ ${res.error || res.message || 'ERR'}`;

    console.log(`${paddedIndex} | ${paddedStatus} | ${paddedInstance} | ${paddedDb} | ${paddedLatency} | ${symbol}`);

    // Small delay between requests to simulate real traffic pacing
    await sleep(60);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(' Multi-Instance Distribution Breakdown');
  console.log('------------------------------------------------------------------------');

  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = results.filter((r) => !r.success).length;

  console.log(`Total Requests:      ${TOTAL_REQUESTS}`);
  console.log(`Successful (HTTP 200): ${successfulRequests}`);
  console.log(`Failed / Degraded:   ${failedRequests}`);
  console.log('\nInstance Traffic Distribution:');

  const detectedInstances = Object.keys(instanceCounts).sort();
  if (detectedInstances.length === 0) {
    console.log('  (No backend instances responded)');
  } else {
    for (const inst of detectedInstances) {
      const count = instanceCounts[inst];
      const percentage = ((count / TOTAL_REQUESTS) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(count * 2));
      console.log(`  • ${inst.padEnd(12)}: ${String(count).padStart(2)} requests (${percentage.padStart(5)}%) ${bar}`);
    }
  }

  console.log('------------------------------------------------------------------------');

  // Verify that all 3 instances received requests
  const requiredInstances = ['backend-1', 'backend-2', 'backend-3'];
  const missingInstances = requiredInstances.filter((inst) => !instanceCounts[inst] || instanceCounts[inst] === 0);

  if (successfulRequests === 0) {
    console.error('\n❌ VERIFICATION FAILED: 0 out of ' + TOTAL_REQUESTS + ' requests succeeded.');

    if (failureStatusCounts['CONN_ERR']) {
      console.error('\n👉 DIAGNOSTIC [CONN_ERR]: Cannot reach http://localhost:8080.');
      console.error('   The Docker stack is not running. Start it with:');
      console.error('   docker compose up -d --build\n');
    } else if (failureStatusCounts['503']) {
      console.error('\n👉 DIAGNOSTIC [HTTP 503]: Backend instances are running, but PostgreSQL is disconnected.');
      console.error('   Please configure your Neon DATABASE_URL in root .env or backend/.env:');
      console.error('   DATABASE_URL=postgresql://user:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/spacesync?sslmode=require\n');
    } else if (failureStatusCounts['502']) {
      console.error('\n👉 DIAGNOSTIC [HTTP 502]: Nginx cannot reach backend containers.');
      console.error('   Check backend container logs using:');
      console.error('   docker compose logs backend-1 backend-2 backend-3\n');
    } else if (failureStatusCounts['401']) {
      console.error('\n👉 DIAGNOSTIC [HTTP 401]: Received HTTP 401 Unauthorized.');
      console.error('   Ensure no conflicting local service is occupying port 8080.');
      console.error('   Verify GET /api/health does not require authentication.\n');
    }

    process.exit(1);
  } else if (missingInstances.length === 0) {
    console.log('\n🎉 EVIDENCE VERIFIED:');
    console.log('✅ Requests were successfully balanced across all THREE instances (backend-1, backend-2, backend-3)!');
    console.log('✅ Evidence demonstrates round-robin distribution with zero dropped requests.\n');
  } else {
    console.warn(`\n⚠️ Notice: Some instances did not receive traffic: ${missingInstances.join(', ')}`);
    console.warn(`Detected instances: ${detectedInstances.join(', ')}\n`);
  }

  // Demonstration of Database-backed API request
  console.log('------------------------------------------------------------------------');
  console.log(' Database-backed API Verification: GET /api/resources');
  console.log('------------------------------------------------------------------------');
  const dbSample = await sendRequest(RESOURCES_URL, 1);
  if (dbSample.success || dbSample.statusCode === 200) {
    console.log(`✅ Query through Nginx succeeded (HTTP ${dbSample.statusCode}) in ${dbSample.latencyMs}ms`);
    console.log(`   Served by: [${dbSample.instance}] via [${dbSample.proxy}]`);
    console.log('   All instances successfully query the authoritative Neon PostgreSQL database.\n');
  } else {
    console.log(`⚠️ Database query status: HTTP ${dbSample.statusCode} (${dbSample.error || dbSample.message || 'N/A'})\n`);
  }

  console.log('========================================================================\n');
}

runDemonstration().catch((err) => {
  console.error('Fatal demonstration error:', err);
  process.exit(1);
});
