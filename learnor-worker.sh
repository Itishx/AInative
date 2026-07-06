#!/usr/bin/env bash
# learnor-worker.sh — the continuous loop that stocks the shelf.
#
# Polls the queue; whenever there's a buildable request (pending or
# changes_requested) it runs ONE pass of THE LOOP via the server:
# claim → plan → generate → verify → stage an unlisted preview →
# set pending_review → email Itish. It never publishes and never emails
# the requester — that only happens through the approval gate.
#
# Usage:
#   LEARNOR_WORKER_TOKEN=xxx ./learnor-worker.sh [base_url]
#
#   base_url defaults to http://127.0.0.1:3001 (local `npm run dev:server`).
#   Point it at production instead if the worker should build against the
#   deployed API (note: Vercel functions cap at 60s — a full build pass is
#   several LLM calls, so run the worker against a long-lived server:
#   local, Railway, or `node server.mjs` anywhere).
#
# Survives closing your editor: all state lives in course_requests.status.
# Crashed builds (stuck in 'building' >30 min) are auto-reset each pass.

set -u

BASE_URL="${1:-http://127.0.0.1:3001}"
TOKEN="${LEARNOR_WORKER_TOKEN:-${LEARNOR_ADMIN_TOKEN:-}}"
SLEEP_SECONDS="${LEARNOR_WORKER_SLEEP:-600}"

if [ -z "$TOKEN" ]; then
  echo "Set LEARNOR_WORKER_TOKEN (or LEARNOR_ADMIN_TOKEN) first." >&2
  exit 1
fi

echo "learnor-worker → $BASE_URL (poll every ${SLEEP_SECONDS}s)"

while true; do
  BUILDABLE=$(curl -sf "$BASE_URL/api/learnor/health" | sed -n 's/.*"buildable":\([0-9]*\).*/\1/p')
  BUILDABLE="${BUILDABLE:-0}"

  if [ "$BUILDABLE" -gt 0 ]; then
    echo "[$(date '+%H:%M:%S')] $BUILDABLE buildable request(s) — running one pass…"
    RESULT=$(curl -s -X POST "$BASE_URL/api/learnor/worker/pass" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --max-time 900 \
      -d '{}')
    echo "[$(date '+%H:%M:%S')] $RESULT"

    # Halted after 3 consecutive failures → stop and surface the pattern.
    if echo "$RESULT" | grep -q '"status":"halted"'; then
      echo "Loop halted after repeated failures — investigate, then POST {\"resume\":true} to /api/learnor/worker/pass." >&2
      exit 2
    fi
    # Keep grinding immediately while there's a queue.
    continue
  fi

  echo "[$(date '+%H:%M:%S')] queue empty — sleeping ${SLEEP_SECONDS}s"
  sleep "$SLEEP_SECONDS"
done
