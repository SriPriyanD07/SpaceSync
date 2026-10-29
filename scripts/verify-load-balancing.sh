#!/usr/bin/env bash

# ==============================================================================
# SpaceSync BACSE344 DA3 - Q1(a) Load Balancing Verification (Bash / cURL)
# ==============================================================================

TARGET_URL="${1:-http://localhost:8080/api/health}"
TOTAL_REQUESTS="${2:-15}"

echo "========================================================================"
echo " SpaceSync BACSE344 DA3 - Q1(a) Load Balancing Verification"
echo "========================================================================"
echo " Target:         $TARGET_URL"
echo " Total Requests: $TOTAL_REQUESTS"
echo "------------------------------------------------------------------------"
echo ""

declare -A INSTANCE_COUNTS

echo "Req # | HTTP Code | Handled by Upstream (X-Served-By) | Time Total"
echo "------|-----------|-----------------------------------|------------"

for i in $(seq 1 $TOTAL_REQUESTS); do
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$TARGET_URL" -D -)
  
  HEADERS=$(echo "$RESPONSE" | sed -n '1,/^\r*$/p')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 2 | head -n 1)
  TIME_TOTAL=$(echo "$RESPONSE" | tail -n 1)

  INSTANCE=$(echo "$HEADERS" | grep -i "^x-served-by:" | tr -d '\r' | awk '{print $2}')
  if [ -z "$INSTANCE" ]; then
    INSTANCE=$(echo "$HEADERS" | grep -i "^x-backend-instance:" | tr -d '\r' | awk '{print $2}')
  fi
  if [ -z "$INSTANCE" ]; then
    INSTANCE="unknown"
  fi

  INSTANCE_COUNTS["$INSTANCE"]=$(( ${INSTANCE_COUNTS["$INSTANCE"]:-0} + 1 ))

  printf "%5d | %9s | %-33s | %ss\n" "$i" "$HTTP_CODE" "$INSTANCE" "$TIME_TOTAL"
  sleep 0.05
done

echo ""
echo "------------------------------------------------------------------------"
echo " Summary of Request Distribution Across Backend Instances"
echo "------------------------------------------------------------------------"
for INST in "${!INSTANCE_COUNTS[@]}"; do
  COUNT=${INSTANCE_COUNTS["$INST"]}
  PERCENT=$(awk "BEGIN {printf \"%.1f\", ($COUNT / $TOTAL_REQUESTS) * 100}")
  printf "  • %-15s : %2d requests (%s%%)\n" "$INST" "$COUNT" "$PERCENT"
done
echo "========================================================================"
