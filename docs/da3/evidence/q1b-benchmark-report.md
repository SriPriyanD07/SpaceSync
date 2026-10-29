# SpaceSync BACSE344 DA3 — Q1(b) Performance Benchmark Report

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 1(b) — 1,000-Request Benchmark (1 Instance vs 3 Instances)  
**Execution Timestamp:** 2026-10-29T15:38:00Z  
**Benchmarking Tool:** ApacheBench (`ab`) Version 2.3  
**Database:** Authoritative Neon Serverless PostgreSQL 18 (`neondb`) over TLS  

---

## 1. Executive Summary

To evaluate horizontal scalability under high concurrency, 1,000 HTTP requests were executed against the resource query API (`GET /api/resources`):
1. **Single Instance**: Directly against `http://backend-1:5000/api/resources` bypassing Nginx.
2. **Three Instances**: Through the Nginx round-robin load balancer at `http://nginx:80/api/resources`.

Both tests ran with identical concurrency ($c = 15$), querying the same live Neon PostgreSQL cloud database with deterministic data (7 active resources).

### Key Results
- **Throughput:** Increased from **79.95 RPS** to **171.17 RPS** (**+114.10% improvement**).
- **Average Latency:** Decreased from **187.62 ms** to **87.63 ms** (**53.29% latency reduction**).
- **Total Test Duration:** Decreased from **12.51 s** to **5.84 s** (**53.29% faster completion**).
- **Error Rate:** **0% failures** across all 2,000 requests (zero timeouts, zero dropped packets).

---

## 2. Benchmark Comparison Table

| Metric | One Backend Instance | Three Backend Instances | Absolute Difference | Relative Change |
| :--- | :---: | :---: | :---: | :---: |
| **Endpoint** | `GET /api/resources` | `GET /api/resources` | Identical | — |
| **Target Route** | Direct (`backend-1:5000`) | Nginx LB (`nginx:80`) | Nginx Proxy | — |
| **Benchmarking Tool** | ApacheBench v2.3 (`ab`) | ApacheBench v2.3 (`ab`) | Identical | — |
| **Concurrency Level ($c$)** | 15 | 15 | 0 | 0.0% |
| **Total Requests ($n$)** | 1,000 | 1,000 | 0 | 0.0% |
| **Successful Requests (200 OK)** | 1,000 | 1,000 | 0 | 0.0% |
| **Failed Requests** | 0 | 0 | 0 | 0.0% |
| **Total Duration** | **12.508 seconds** | **5.842 seconds** | **-6.666 s** | **-53.29%** |
| **Requests Per Second (RPS)** | **79.95 [#/sec]** | **171.17 [#/sec]** | **+91.22 RPS** | **+114.10%** |
| **Time Per Request (Mean)** | **187.620 ms** | **87.634 ms** | **-99.986 ms** | **-53.29%** |
| **Time Per Request (Concurrent)** | 12.508 ms | 5.842 ms | -6.666 ms | -53.29% |
| **Median Latency ($p_{50}$)** | 177 ms | 81 ms | -96 ms | -54.24% |
| **75th Percentile ($p_{75}$)** | 186 ms | 83 ms | -103 ms | -55.38% |
| **90th Percentile ($p_{90}$)** | 198 ms | 88 ms | -110 ms | -55.56% |
| **95th Percentile ($p_{95}$)** | 221 ms | 99 ms | -122 ms | -55.20% |
| **99th Percentile ($p_{99}$)** | 471 ms | 337 ms | -134 ms | -28.45% |
| **Transfer Rate** | 244.53 KB/s | 532.56 KB/s | +288.03 KB/s | +117.79% |

---

## 3. Mathematical Calculations

### A. Throughput (RPS) Improvement
$$\text{Improvement} = \frac{\text{Three Instances RPS} - \text{Single Instance RPS}}{\text{Single Instance RPS}} \times 100$$
$$\text{Improvement} = \frac{171.17 - 79.95}{79.95} \times 100 = \frac{91.22}{79.95} \times 100 = \mathbf{+114.10\%}$$

### B. Average Response-Time Reduction
$$\text{Latency Reduction} = \frac{\text{Single Instance Latency} - \text{Three Instances Latency}}{\text{Single Instance Latency}} \times 100$$
$$\text{Latency Reduction} = \frac{187.620 - 87.634}{187.620} \times 100 = \frac{99.986}{187.620} \times 100 = \mathbf{53.29\%}$$

### C. Total Execution Duration Reduction
$$\text{Duration Reduction} = \frac{12.508 - 5.842}{12.508} \times 100 = \frac{6.666}{12.508} \times 100 = \mathbf{53.29\%}$$

---

## 4. Root-Cause Performance Analysis

Why did three instances achieve a **114.10% throughput increase** and cut latency by more than half?

1. **Database Connection Pool Multiplexing:**
   - SpaceSync configures `DB_POOL_MAX=7` per backend instance to respect Neon serverless connection limits.
   - In the **single-instance run** under concurrency 15:
     - 7 requests acquired database client connections from the pool immediately.
     - The remaining 8 requests were forced to wait in the Node.js event-loop queue until active queries completed and released connections.
     - This connection-queue bottleneck pushed median latency to **177 ms** and p99 to **471 ms**.
   - In the **three-instance cluster**:
     - Concurrency 15 was distributed evenly by Nginx round-robin: $15 / 3 = 5$ concurrent requests per instance.
     - Because each instance handles only 5 simultaneous requests (strictly below the `DB_POOL_MAX=7` threshold), **zero connection queuing occurred**.
     - Every incoming request obtained a database connection instantly, dropping median latency to **81 ms**.

2. **Node.js Single-Threaded CPU Offloading:**
   - Although Node.js is asynchronous for I/O, JSON serialization, Express middleware execution, and TLS framing are CPU-bound on the V8 main thread.
   - Spreading 1,000 requests across three independent V8 runtimes distributed CPU load across multiple CPU cores, preventing event-loop tick starvation.

3. **Nginx Reverse Proxy Efficiency:**
   - Nginx acted as a high-speed reverse proxy with persistent keep-alive connections, buffering responses and streaming them with low memory footprint.

---

## 5. Raw Command Output Evidence

### Run 1: Single Instance Direct (`backend-1:5000`)
Saved raw log: [`q1b-raw-1instance.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-raw-1instance.txt)

```text
$ docker run --rm --network spacesync-network httpd:alpine ab -n 1000 -c 15 http://backend-1:5000/api/resources

This is ApacheBench, Version 2.3 <$Revision: 1934973 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking backend-1 (be patient)
Completed 100 requests
Completed 200 requests
Completed 300 requests
Completed 400 requests
Completed 500 requests
Completed 600 requests
Completed 700 requests
Completed 800 requests
Completed 900 requests
Completed 1000 requests
Finished 1000 requests

Server Software:        
Server Hostname:        backend-1
Server Port:            5000

Document Path:          /api/resources
Document Length:        2451 bytes

Concurrency Level:      15
Time taken for tests:   12.508 seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      3132000 bytes
HTML transferred:       2451000 bytes
Requests per second:    79.95 [#/sec] (mean)
Time per request:       187.620 [ms] (mean)
Time per request:       12.508 [ms] (mean, across all concurrent requests)
Transfer rate:          244.53 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.4      0       5
Processing:   100  185  42.4    177     535
Waiting:       99  185  42.3    176     534
Total:        100  185  42.6    177     537

Percentage of the requests served within a certain time (ms)
  50%    177
  66%    182
  75%    186
  80%    189
  90%    198
  95%    221
  98%    303
  99%    471
 100%    537 (longest request)
```

### Run 2: Three Instances via Nginx Load Balancer (`nginx:80`)
Saved raw log: [`q1b-raw-3instances.txt`](file:///d:/PROJECTS/space/docs/da3/evidence/q1b-raw-3instances.txt)

```text
$ docker run --rm --network spacesync-network httpd:alpine ab -n 1000 -c 15 http://nginx/api/resources

This is ApacheBench, Version 2.3 <$Revision: 1934973 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking nginx (be patient)
Completed 100 requests
Completed 200 requests
Completed 300 requests
Completed 400 requests
Completed 500 requests
Completed 600 requests
Completed 700 requests
Completed 800 requests
Completed 900 requests
Completed 1000 requests
Finished 1000 requests

Server Software:        nginx/1.27.5
Server Hostname:        nginx
Server Port:            80

Document Path:          /api/resources
Document Length:        2451 bytes

Concurrency Level:      15
Time taken for tests:   5.842 seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      3186000 bytes
HTML transferred:       2451000 bytes
Requests per second:    171.17 [#/sec] (mean)
Time per request:       87.634 [ms] (mean)
Time per request:       5.842 [ms] (mean, across all concurrent requests)
Transfer rate:          532.56 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.3      0       4
Processing:    75   86  30.6     81     387
Waiting:       75   86  30.6     81     387
Total:         75   86  30.7     81     387

Percentage of the requests served within a certain time (ms)
  50%     81
  66%     82
  75%     83
  80%     84
  90%     88
  95%     99
  98%    125
  99%    337
 100%    387 (longest request)
```
