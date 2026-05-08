/**
 * Smoke test — verifies the app is up and public endpoints respond.
 * No auth token required.
 *
 * Run: k6 run k6/smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // Health / root
  const root = http.get(`${BASE_URL}/`);
  check(root, { 'root 200': (r) => r.status === 200 });

  // Unauthenticated API call should redirect to Keycloak login (302) or 401
  const api = http.get(`${BASE_URL}/api/user/info`, { redirects: 0 });
  check(api, { 'api requires auth': (r) => r.status === 302 || r.status === 401 || r.status === 403 });

  sleep(1);
}
