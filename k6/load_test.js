import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 100 }, // Ramp up to 100 users
        { duration: '30s', target: 500 }, // Stay at 500 users
        { duration: '10s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'], // http errors should be less than 1%
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    },
};

export default function () {
    const res = http.get('http://localhost:8080/[...path]');

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(0.01); // 10ms wait time for higher RPS
}
