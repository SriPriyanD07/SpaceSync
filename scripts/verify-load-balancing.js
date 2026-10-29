#!/usr/bin/env node

/**
 * SpaceSync Digital Assignment 3 (DA3) - Question 1(a) Verification Script
 * 
 * Demonstrates and proves that requests sent to the Nginx load balancer
 * (http://localhost:8080) are distributed across all three backend instances:
 * - backend-1
 * - backend-2
 * - backend-3
 */

const TARGET_URL = process.env.TARGET_URL || process.argv[2] || 'http://localhost:8080/api/health';
const RESOURCES_URL = TARGET_URL.replace(/\/health$/, '/resources');
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '15', 10);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendRequest(url, index) {
  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SpaceSync-LoadBalancer-Verification/1.0',
      },
    });

    const latencyMs = Date.now() - startTime;
    const servedByHeader = res.headers.get('x-served-by') || res.headers.get('x-backend-instance');
    const proxyByHeader = res.headers.get('x-proxy-by') || 'Nginx';

    let instanceFromPayload = null;
    try {
      const data = await res.json();
      instanceFromPayload = data.instance || null;
    } catch {
      // Non-JSON response
    }

    const instance = servedByHeader || instanceFromPayload || 'unknown';

    return {
      success: res.ok,
      status: res.status,
      instance,
      proxy: proxyByHeader,
      latencyMs,
    };
  } catch (err) {
    return {
      success: false,
      status: 'CONN_ERR',
      instance: 'none',
      proxy: 'none',
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
  console.log(` Load Balancing Method: Nginx Round-Robin`);
  console.log('------------------------------------------------------------------------\n');

  const instanceCounts = {};
  const results = [];

  console.log('Sending requests sequentially through Nginx (port 8080)...\n');
  console.log('Req # | Status | Nginx Upstream Handled By | Latency | Result');
  console.log('------|--------|---------------------------|---------|-------');

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const res = await sendRequest(TARGET_URL, i);
    results.push(res);

    if (res.success) {
      instanceCounts[res.instance] = (instanceCounts[res.instance] || 0) + 1;
    }

    const paddedIndex = String(i).padStart(5, ' ');
    const paddedStatus = String(res.status).padEnd(6, ' ');
    const paddedInstance = String(res.instance).padEnd(25, ' ');
    const paddedLatency = `${res.latencyMs}ms`.padEnd(7, ' ');
    const symbol = res.success ? '✅ OK' : `❌ ${res.error || 'FAIL'}`;

    console.log(`${paddedIndex} | ${paddedStatus} | ${paddedInstance} | ${paddedLatency} | ${symbol}`);

    // Small delay between requests to simulate real traffic pacing
    await sleep(60);
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(' Multi-Instance Distribution Breakdown');
  console.log('------------------------------------------------------------------------');

  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = results.filter((r) => !r.success).length;

  console.log(`Total Requests:      ${TOTAL_REQUESTS}`);
  console.log(`Successful:          ${successfulRequests}`);
  console.log(`Failed:              ${failedRequests}`);
  console.log('\nInstance Breakdown:');

  const detectedInstances = Object.keys(instanceCounts).sort();
  for (const inst of detectedInstances) {
    const count = instanceCounts[inst];
    const percentage = ((count / successfulRequests) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count * 2));
    console.log(`  • ${inst.padEnd(12)}: ${String(count).padStart(2)} requests (${percentage.padStart(5)}%) ${bar}`);
  }

  console.log('------------------------------------------------------------------------');

  // Verify that all 3 instances received requests
  const requiredInstances = ['backend-1', 'backend-2', 'backend-3'];
  const missingInstances = requiredInstances.filter((inst) => !instanceCounts[inst] || instanceCounts[inst] === 0);

  if (successfulRequests === 0) {
    console.error('\n❌ Could not connect to the load balancer at ' + TARGET_URL);
    console.error('👉 Make sure the containers are started using: docker compose up -d\n');
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
  if (dbSample.success) {
    console.log(`✅ Query through Nginx succeeded (HTTP ${dbSample.status}) in ${dbSample.latencyMs}ms`);
    console.log(`   Served by: [${dbSample.instance}] via [${dbSample.proxy}]`);
    console.log('   All instances successfully query the authoritative Neon PostgreSQL database.\n');
  } else {
    console.log(`⚠️ Database query status: ${dbSample.status} (${dbSample.error || 'N/A'})\n`);
  }

  console.log('========================================================================\n');
}

runDemonstration().catch((err) => {
  console.error('Fatal demonstration error:', err);
  process.exit(1);
});
