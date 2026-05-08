/**
 * Load test — 10 VUs with dynamic token generation.
 *
 * Prerequisites:
 *   1. App and Keycloak running (docker compose up)
 *   2. Test user created in Keycloak (testuser/testpass)
 *
 * Run:
 *   k6 run k6/load.js
 *
 * Expected results (10 VUs, 2min total):
 *   - p(95) latency < 1000ms
 *   - p(99) latency < 2000ms
 *   - error rate < 1%
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 VUs
    { duration: '1m',  target: 10 },  // Ramp up to 10 VUs
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors:            ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const KEYCLOAK_URL = 'http://localhost:8180/realms/master';
const CLIENT_ID = 'springboot-app';
const CLIENT_SECRET = 'changeme';
const USERNAME = 'testuser';
const PASSWORD = 'testpass';

function getToken() {
  const res = http.post(`${KEYCLOAK_URL}/protocol/openid-connect/token`, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'password',
    username: USERNAME,
    password: PASSWORD,
  });

  if (res.status !== 200) {
    console.error(`Token request failed: ${res.status}`);
    return null;
  }

  return res.json('access_token');
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export default function () {
  const token = getToken();
  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = authHeaders(token);

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  group('User Info', () => {
    const res = http.get(`${BASE_URL}/api/user/info`, { headers });
    const ok = check(res, {
      'user info 200': (r) => r.status === 200,
      'has username':  (r) => r.json('username') !== undefined,
    });
    errorRate.add(!ok);
    apiDuration.add(res.timings.duration);
  });

  sleep(0.5);

  group('Locations', () => {
    const res = http.get(`${BASE_URL}/api/locations`, { headers });
    const ok = check(res, {
      'locations 200': (r) => r.status === 200,
      'is array':      (r) => Array.isArray(r.json()),
    });
    errorRate.add(!ok);
    apiDuration.add(res.timings.duration);
  });

  sleep(0.5);

  group('Favourites', () => {
    const res = http.get(`${BASE_URL}/api/favourites`, { headers });
    const ok = check(res, {
      'favourites 200': (r) => r.status === 200,
      'is array':       (r) => Array.isArray(r.json()),
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('Files', () => {
    const res = http.get(`${BASE_URL}/api/files`, { headers });
    const ok = check(res, {
      'files 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('Social - Users', () => {
    const res = http.get(`${BASE_URL}/api/social/users`, { headers });
    const ok = check(res, {
      'social users 200': (r) => r.status === 200,
      'is array':         (r) => Array.isArray(r.json()),
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('Social - Friends', () => {
    const res = http.get(`${BASE_URL}/api/social/friends`, { headers });
    const ok = check(res, {
      'friends 200': (r) => r.status === 200,
      'is array':    (r) => Array.isArray(r.json()),
    });
    errorRate.add(!ok);
  });

  sleep(1);
}
