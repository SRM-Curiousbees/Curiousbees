#!/usr/bin/env bash
# ==============================================================================
# CuriousBees V2 — Load Testing Runner
# ==============================================================================
# Usage:
#   ./scripts/testing/run-load-test.sh [TARGET_URL] [AUTH_TOKEN]
# Example:
#   ./scripts/testing/run-load-test.sh https://api-staging.curiousbees.srmist.edu.in "Bearer eyJhbGci..."
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-http://localhost:4000}"
AUTH_TOKEN="${2:-Bearer mock-token}"

echo "=============================================================================="
echo "🐝 CuriousBees V2 — Staging Load Testing Execution"
echo "=============================================================================="
echo "Target URL:  ${TARGET_URL}"
echo "Test File:   scripts/testing/load-test.js"
echo "Concurrency: Stages (500 -> 1000 -> 2500 -> 5000 peak -> 7500 stress)"
echo "Targets:     p95 < 500ms, 5xx error rate < 0.5%"
echo "=============================================================================="

if ! command -v k6 &> /dev/null; then
    echo "⚠️  k6 load testing tool not found in PATH."
    echo "Install via Homebrew: brew install k6"
    echo "Or Docker: docker run --rm -i -v \$(pwd):/app grafana/k6 run /app/scripts/testing/load-test.js"
    exit 1
fi

TARGET_URL="${TARGET_URL}" AUTH_TOKEN="${AUTH_TOKEN}" k6 run scripts/testing/load-test.js
