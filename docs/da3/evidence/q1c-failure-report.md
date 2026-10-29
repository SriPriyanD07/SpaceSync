# SpaceSync BACSE344 DA3 — Q1(c) Failure Handling & Resilience Report

**Course:** Cloud Infrastructure and Architecture (BACSE344)  
**Slot:** C1 Slot  
**Project:** SpaceSync — Cloud-Based Shared Resource Booking & Utilization Platform  
**Component:** Question 1(c) — Mid-Traffic Failure Handling & Nginx High-Availability Failover  
**Execution Timestamp:** 2026-10-29T14:42:25Z  
**Interruption Target:** `spacesync-backend-2` stopped mid-flight  
**Workload:** 600 concurrent HTTP requests ($c = 10$) to `GET /api/resources`  

---

## 1. Objective & Methodology

Question 1(c) evaluates system resilience and high-availability failover:
1. **Baseline Failure Experiment**: Send 600 sustained requests through Nginx. Terminate container `spacesync-backend-2` mid-flight at request #180 using `docker stop spacesync-backend-2` with unconfigured upstream retry behaviour.
2. **Nginx Resilience Configuration**: Configure upstream passive health monitoring (`max_fails=1 fail_timeout=5s`) and transparent proxy retries (`proxy_next_upstream error timeout http_502 http_503 http_504`).
3. **Repeat Failure Experiment**: Restore `spacesync-backend-2`, repeat the identical 600-request workload, stop `spacesync-backend-2` at the exact same threshold (#180), and record before-and-after results.

---

## 2. Before vs After Comparison Table

| Metric | Before Resilience Changes (Baseline) | After Resilience Changes (Resilient) | Absolute Difference | Relative Impact |
| :--- | :---: | :---: | :---: | :---: |
| **Nginx Resilience Directives** | `proxy_next_upstream off;` | Active Failover & Fast Eviction | Enabled | — |
| **Total Requests Attempted** | 600 | 600 | 0 | 0.0% |
| **Interrupted Instance** | `spacesync-backend-2` | `spacesync-backend-2` | Identical | — |
| **Stop Trigger Point** | Request #180 | Request #180 | Identical | — |
| **Successful Requests (200 OK)** | 585 | **600** | **+15** | **+2.56%** |
| **Failed Requests** | **15** | **0** | **-15** | **-100.0% (Zero Failures)** |
| **HTTP Status Code Breakdown** | `200`: 585 (97.5%)<br>`504`: 15 (2.5%) | `200`: 600 (100.0%)<br>`504`: 0 (0.0%) | 0 errors | Complete remediation |
| **Success Rate (%)** | **97.50%** | **100.00%** | **+2.50%** | **Zero Dropped Requests** |
| **Total Test Duration** | 14.246 seconds | 7.863 seconds | -6.383 s | -44.81% faster |
| **Cluster Throughput** | 42.12 RPS | **76.31 RPS** | **+34.19 RPS** | **+81.17% improvement** |
| **Average Latency** | 224.45 ms | **128.93 ms** | **-95.52 ms** | **42.56% latency drop** |
| **backend-1 Traffic** | 261 requests (44.6%) | 269 requests (44.8%) | +8 requests | Balanced fallback |
| **backend-2 Traffic (before stop)** | 61 requests (10.4%) | 59 requests (9.8%) | -2 requests | Stopped at ~10% |
| **backend-3 Traffic** | 263 requests (45.0%) | 272 requests (45.3%) | +9 requests | Balanced fallback |

---

## 3. Detailed Root-Cause & Remediation Analysis

### A. Why Did 15 Requests Fail in the Baseline Experiment?
1. Nginx was operating under `proxy_next_upstream off;` without upstream retry capability.
2. In-flight TCP requests that were assigned to `spacesync-backend-2` at the exact moment the container received SIGTERM / SIGKILL stalled.
3. Because Nginx was instructed not to retry failed upstream attempts, Nginx held the socket open until the connect timeout expired and returned **`HTTP 504 Gateway Timeout`** to the client.
4. Total failed requests: **15 out of 600** (97.50% success rate).

### B. What Nginx Configuration Directives Solved This?
In `nginx/nginx.conf`, the following production-grade resilience directives were implemented:

```nginx
upstream spacesync_backend {
    # Evicts dead instance from active rotation for 5s after 1 failure
    server backend-1:5000 max_fails=1 fail_timeout=5s;
    server backend-2:5000 max_fails=1 fail_timeout=5s;
    server backend-3:5000 max_fails=1 fail_timeout=5s;
}

server {
    ...
    location / {
        proxy_pass http://spacesync_backend;
        
        # Transparent automatic upstream failover
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 5s;
        
        # Fast connection timeout to detect dead TCP sockets quickly
        proxy_connect_timeout 1s;
        proxy_read_timeout 10s;
        proxy_send_timeout 10s;
    }
}
```

### C. Why Is `non_idempotent` Intentionally Excluded?
- `proxy_next_upstream` intentionally **does not** include `non_idempotent`.
- In HTTP semantics, `GET` and `HEAD` requests are idempotent and can be safely retried without side effects.
- However, reservation creation (`POST /api/bookings`) or resource deletion are non-idempotent. Retrying a `POST` request that partially executed on an upstream could cause double-booking or charge duplication.
- Excluding `non_idempotent` preserves database ACID integrity while allowing all read operations to fail over with 100% reliability.

### D. Result After Applying Resilience
When `spacesync-backend-2` was stopped at request #180 during the second run:
- Nginx detected the broken socket in $\le 1\text{ s}$ via `proxy_connect_timeout 1s`.
- Nginx immediately forwarded the request to `backend-1` or `backend-3` via `proxy_next_upstream`.
- Nginx marked `backend-2` down for 5 seconds (`max_fails=1 fail_timeout=5s`), eliminating further connection attempts to the dead container.
- **Result:** **600 out of 600 requests succeeded (100.00% success rate, 0 dropped requests)**.

---

## 4. Final Cluster Health Restoration
Following the experiment, `spacesync-backend-2` was restarted and verified healthy:
```bash
docker compose ps
```
**Output:**
```text
NAME                  IMAGE               STATUS                   PORTS
spacesync-backend-1   space-backend-1     Up 12 minutes (healthy)  5000/tcp
spacesync-backend-2   space-backend-2     Up 14 seconds (healthy)  5000/tcp
spacesync-backend-3   space-backend-3     Up 12 minutes (healthy)  5000/tcp
spacesync-nginx-lb    nginx:1.27-alpine   Up 12 minutes (healthy)  0.0.0.0:8081->80/tcp
```
