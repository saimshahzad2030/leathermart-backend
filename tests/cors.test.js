import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('CORS and Market Header Configuration', () => {
  const allowedOrigin = 'http://localhost:3000';
  const customHeaders = 'x-market,content-type,authorization';

  describe('OPTIONS Preflight Handling', () => {
    it('should return 204 and allow x-market header on /api/v1/products', async () => {
      const res = await request(app)
        .options('/api/v1/products?category=biker&gender=men&sort=featured&market=IT')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', customHeaders);

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-headers']).toBeDefined();
      expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('x-market');
      expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('content-type');
      expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('authorization');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
    });

    it('should return 204 and allow x-market header on /api/v1/settings/branding', async () => {
      const res = await request(app)
        .options('/api/v1/settings/branding')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', customHeaders);

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('x-market');
    });

    it('should return 204 and allow x-market header on /api/v1/settings/shipping', async () => {
      const res = await request(app)
        .options('/api/v1/settings/shipping')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', customHeaders);

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('x-market');
    });

    it('should return 204 and allow x-market header on /api/v1/content/navigation', async () => {
      const res = await request(app)
        .options('/api/v1/content/navigation')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', customHeaders);

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('x-market');
    });
  });

  describe('CORS Headers on Requests and Error Responses', () => {
    it('should include CORS origin and credentials on GET /health', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', allowedOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('should include CORS origin and credentials on 404 error responses', async () => {
      const res = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .set('Origin', allowedOrigin)
        .set('x-market', 'IT');

      expect(res.status).toBe(404);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
