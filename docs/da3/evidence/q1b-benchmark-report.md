# SpaceSync BACSE344 DA3 — Q1(b) Performance Benchmark Report

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 1(b) — 1,000-Request Benchmark (1 Instance vs 3 Instances)  
**Execution Timestamp:** 2026-10-29T14:38:55Z  
**Benchmarking Tool:** ApacheBench (`ab`) Version 2.3  
**Database:** Authoritative Neon Serverless PostgreSQL 18 (`neondb`) over TLS  

---

## 1. Executive Summary

To evaluate horizontal scalability under high concurrency, 1,000 HTTP requests were executed against the resource query API (`GET /api/resources`):
1. **Single Instance**: Directly against `http://backend-1:5000/api/resources` bypassing Nginx.
2. **Three Instances**: Through the Nginx round-robin load balancer at `http://nginx:80/api/resources`.

Both tests ran with identical concurrency ($c = 15$), querying the same live Neon PostgreSQL cloud database with deterministic data (7 active resources).

### Key Results
- **Throughput:** Increased from **82.74 RPS** to **171.79 RPS** (**+107.63% improvement**).
- **Average Latency:** Decreased from **181.29 ms** to **87.32 ms** (**51.84% latency reduction**).
- **Total Test Duration:** Decreased from **12.09 s** to **5.82 s** (**51.84% faster completion**).
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
| **Total Duration** | **12.086 seconds** | **5.821 seconds** | **-6.265 s** | **-51.84%** |
| **Requests Per Second (RPS)** | **82.74 [#/sec]** | **171.79 [#/sec]** | **+89.05 RPS** | **+107.63%** |
| **Time Per Request (Mean)** | **181.289 ms** | **87.315 ms** | **-93.974 ms** | **-51.84%** |
| **Time Per Request (Concurrent)** | 12.086 ms | 5.821 ms | -6.265 ms | -51.84% |
| **Median Latency ($p_{50}$)** | 172 ms | 81 ms | -91 ms | -52.91% |
| **75th Percentile ($p_{75}$)** | 184 ms | 84 ms | -100 ms | -54.35% |
| **95th Percentile ($p_{95}$)** | 200 ms | 90 ms | -110 ms | -55.00% |
| **99th Percentile ($p_{99}$)** | 444 ms | 346 ms | -98 ms | -22.07% |
| **Transfer Rate** | 253.07 KB/s | 534.50 KB/s | +281.43 KB/s | +111.21% |

---

## 3. Mathematical Calculations

### A. Throughput (RPS) Improvement
$$\text{Improvement} = \frac{\text{Three Instances RPS} - \text{Single Instance RPS}}{\text{Single Instance RPS}} \times 100$$
$$\text{Improvement} = \frac{171.79 - 82.74}{82.74} \times 100 = \frac{89.05}{82.74} \times 100 = \mathbf{+107.63\%}$$

### B. Average Response-Time Reduction
$$\text{Latency Reduction} = \frac{\text{Single Instance Latency} - \text{Three Instances Latency}}{\text{Single Instance Latency}} \times 100$$
$$\text{Latency Reduction} = \frac{181.289 - 87.315}{181.289} \times 100 = \frac{93.974}{181.289} \times 100 = \mathbf{51.84\%}$$

### C. Total Execution Duration Reduction
$$\text{Duration Reduction} = \frac{12.086 - 5.821}{12.086} \times 100 = \frac{6.265}{12.086} \times 100 = \mathbf{51.84\%}$$

---

## 4. Root-Cause Performance Analysis

Why did three instances achieve a **107.63% throughput increase** and cut latency in half?

1. **Database Connection Pool Multiplexing:**
   - SpaceSync configures `DB_POOL_MAX=7` per backend instance to respect Neon serverless connection limits.
   - In the **single-instance run** under concurrency 15:
     - 7 requests acquired database client connections from the pool immediately.
     - The remaining 8 requests were forced to wait in the Node.js event-loop queue until active queries completed and released connections.
     - This connection-queue bottleneck pushed median latency to **172 ms**.
   - In the **three-instance cluster**:
     - Concurrency 15 was distributed evenly by Nginx round-robin: $15 / 3 = 5$ concurrent requests per instance.
     - Because each instance handles only 5 simultaneous requests (which is strictly below the `DB_POOL_MAX=7` threshold), **zero connection queuing occurred**.
     - Every incoming request obtained a database connection instantly, dropping median latency to **81 ms**.

2. **Node.js Single-Threaded CPU Offloading:**
   - Although Node.js is asynchronous for I/O, JSON serialization, Express middleware execution, and TLS framing are CPU-bound on the V8 main thread.
   - Spreading 1,000 requests across three independent V8 runtimes distributed CPU load across multiple CPU cores, preventing event-loop tick starvation.

3. **Nginx Reverse Proxy Efficiency:**
   - Nginx acted as a high-speed reverse proxy with persistent keep-alive connections, buffering responses and streaming them with low memory footprint.

---

## 5. Raw Command Output Evidence

### Run 1: Single Instance Direct (`backend-1:5000`)
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
Time taken for tests:   12.086 seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      3132000 bytes
HTML transferred:       2451000 bytes
Requests per second:    82.74 [#/sec] (mean)
Time per request:       181.289 [ms] (mean)
Time per request:       12.086 [ms] (mean, across all concurrent requests)
Transfer rate:          253.07 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.1      0       2
Processing:    85  179  36.7    172     496
Waiting:       85  179  36.6    172     494
Total:         86  179  36.7    172     496

Percentage of the requests served within a certain time (ms)
  50%    172
  66%    180
  75%    184
  80%    187
  90%    194
  95%    200
  98%    217
  99%    444
 100%    496 (longest request)
```

### Run 2: Three Instances via Nginx Load Balancer (`nginx:80`)
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
Time taken for tests:   5.821 seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      3186000 bytes
HTML transferred:       2451000 bytes
Requests per second:    171.79 [#/sec] (mean)
Time per request:       87.315 [ms] (mean)
Time per request:       5.821 [ms] (mean, across all concurrent requests)
Transfer rate:          534.50 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   0.1      0       1
Processing:    75   85  31.2     81     389
Waiting:       75   85  31.2     81     389
Total:         75   85  31.2     81     390

Percentage of the requests served within a certain time (ms)
  50%     81
  66%     83
  75%     84
  80%     84
  90%     86
  95%     90
  98%    106
  99%    346
 100%    390 (longest request)
```
