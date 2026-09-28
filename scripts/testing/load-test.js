import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics
const error5xxRate = new Rate('rate_5xx_errors');
const error4xxRate = new Rate('rate_4xx_errors');
const feedLatency = new Trend('latency_feed_ms');
const searchLatency = new Trend('latency_search_ms');
const researchersLatency = new Trend('latency_researchers_ms');
const healthLatency = new Trend('latency_health_ready_ms');

// Target Configuration
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'Bearer mock-test-token';

export const options = {
  // Staged Ramp-up up to 5,000 concurrent users with 7,500 stress peak
  stages: [
    { duration: '2m', target: 500 },   // Warm up to 500 users
    { duration: '3m', target: 500 },   // Steady state: 500 users
    { duration: '3m', target: 1000 },  // Ramp to 1,000 users
    { duration: '4m', target: 1000 },  // Steady state: 1,000 users
    { duration: '4m', target: 2500 },  // Scale to 2,500 users
    { duration: '5m', target: 2500 },  // Steady state: 2,500 users
    { duration: '5m', target: 5000 },  // Peak target: 5,000 concurrent users
    { duration: '5m', target: 5000 },  // Sustained peak test: 5,000 users
    { duration: '2m', target: 7500 },  // Stress spike to test degradation
    { duration: '3m', target: 0 },     // Graceful ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1500'], // 95% of requests under 500ms
    'rate_5xx_errors': ['rate<0.005'],                  // Less than 0.5% 5xx errors
    'rate_4xx_errors': ['rate<0.05'],                   // Less than 5% 4xx errors
  },
};

const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': AUTH_TOKEN,
};

export default function () {
  // 1. ALB Health Check (Simulates ALB pinging /health/ready)
  group('01_ALB_Health_Ready', function () {
    const res = http.get(`${BASE_URL}/health/ready`);
    healthLatency.add(res.timings.duration);
    check(res, {
      'health ready is 200': (r) => r.status === 200,
    });
    recordErrors(res);
  });

  sleep(0.5);

  // 2. Feed Browsing (Paginated research threads)
  group('02_Feed_Browsing', function () {
    const res = http.get(`${BASE_URL}/api/threads?limit=20&sort=latest`, { headers: authHeaders });
    feedLatency.add(res.timings.duration);
    check(res, {
      'feed status is 200': (r) => r.status === 200,
    });
    recordErrors(res);
  });

  sleep(1);

  // 3. Search (Full-text term query across researchers, publications, threads)
  group('03_Academic_Search', function () {
    const queryTerms = ['quantum', 'machine learning', 'bioinformatics', 'nanotechnology', 'cybersecurity'];
    const randomTerm = queryTerms[Math.floor(Math.random() * queryTerms.length)];
    const res = http.get(`${BASE_URL}/api/feed/search?q=${encodeURIComponent(randomTerm)}`, { headers: authHeaders });
    searchLatency.add(res.timings.duration);
    check(res, {
      'search status is 200': (r) => r.status === 200,
    });
    recordErrors(res);
  });

  sleep(1);

  // 4. Researcher Discovery (Directory listing with pagination)
  group('04_Researcher_Directory', function () {
    const res = http.get(`${BASE_URL}/api/users/supervisors`, { headers: authHeaders });
    researchersLatency.add(res.timings.duration);
    check(res, {
      'supervisors directory status is 200': (r) => r.status === 200,
    });
    recordErrors(res);
  });

  sleep(1);

  // 5. Publications List
  group('05_Publications_Browsing', function () {
    const res = http.get(`${BASE_URL}/api/publications?limit=20`, { headers: authHeaders });
    check(res, {
      'publications status is 200': (r) => r.status === 200,
    });
    recordErrors(res);
  });

  sleep(1);

  // 6. Direct S3 Presigned Upload URL Generation
  group('06_S3_Presigned_Upload_Request', function () {
    const payload = JSON.stringify({
      filename: `loadtest-paper-${Date.now()}.pdf`,
      contentType: 'application/pdf',
      sizeBytes: 2500000,
      prefix: 'load-testing',
    });
    const res = http.post(`${BASE_URL}/api/files/presigned-upload`, payload, { headers: authHeaders });
    check(res, {
      'presigned upload status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    });
    recordErrors(res);
  });

  sleep(2);
}

function recordErrors(res) {
  if (res.status >= 500) {
    error5xxRate.add(1);
  } else {
    error5xxRate.add(0);
  }

  if (res.status >= 400 && res.status < 500) {
    error4xxRate.add(1);
  } else {
    error4xxRate.add(0);
  }
}
