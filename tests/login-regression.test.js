import { describe, it, expect, vi, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';

const { mockDb, prismaMock, supabaseMock } = vi.hoisted(() => {
  const db = {
    adminUser: [
      {
        id: '732b6e75-2e39-4243-97be-5f2ed8c4a55f',
        email: 'admin@leathermart.local',
        passwordHash: '$2b$10$wN1QGg0W9Kx3Z0Q0/9B.Pe9Y3oZ1q7G2/6V4qH8uX7J0kL2.M4N6u',
        firstName: 'Alessandro',
        lastName: 'Valenti',
        role: 'super_admin',
        permissions: ['*'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    refreshToken: [],
  };

  const pMock = {
    adminUser: {
      findUnique: vi.fn(async ({ where }) => {
        if (where.email) {
          return db.adminUser.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null;
        }
        if (where.id) {
          return db.adminUser.find((u) => u.id === where.id) || null;
        }
        return null;
      }),
      update: vi.fn(async ({ where, data }) => {
        const u = db.adminUser.find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return u;
      }),
    },
    refreshToken: {
      create: vi.fn(async ({ data }) => {
        db.refreshToken.push(data);
        return data;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return db.refreshToken.find((t) => t.token === where.token) || null;
      }),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  };

  return { mockDb: db, prismaMock: pMock, supabaseMock: {} };
});

vi.mock('../src/lib/prisma.js', () => ({
  prisma: prismaMock,
  checkPrismaConnection: async () => ({ connected: true }),
}));

vi.mock('../src/config/supabase.js', () => ({
  supabase: supabaseMock,
  getSupabase: () => supabaseMock,
  checkSupabaseConnection: async () => ({ connected: true }),
}));

import request from 'supertest';
import { app } from '../src/app.js';

describe('Admin Login Validation & Regression Tests', () => {
  beforeAll(async () => {
    // Generate valid hash for ChangeMe_Admin_2026!
    const hash = await bcrypt.hash('ChangeMe_Admin_2026!', 10);
    mockDb.adminUser[0].passwordHash = hash;
  });

  it('1. should succeed with standard application/json payload', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Content-Type', 'application/json')
      .send({
        email: 'admin@leathermart.local',
        password: 'ChangeMe_Admin_2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.admin.email).toBe('admin@leathermart.local');
  });

  it('2. should succeed with URL-encoded form data', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=admin%40leathermart.local&password=ChangeMe_Admin_2026!');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('3. should succeed with raw JSON string under urlencoded (curl -d default without header)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('{"email":"admin@leathermart.local","password":"ChangeMe_Admin_2026!"}');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('4. should reject with 422 ERR_VALIDATION_FAILED when email or password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ERR_VALIDATION_FAILED');
    expect(res.body.errors.email).toContain('Required');
    expect(res.body.errors.password).toContain('Required');
  });

  it('5. should reject with 422 when email is invalid format', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Content-Type', 'application/json')
      .send({
        email: 'not-an-email',
        password: 'ChangeMe_Admin_2026!',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ERR_VALIDATION_FAILED');
    expect(res.body.errors.email).toContain('Please provide a valid email address');
  });

  it('6. should reject with 401 when password is wrong', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Content-Type', 'application/json')
      .send({
        email: 'admin@leathermart.local',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('ERR_INVALID_CREDENTIALS');
  });
});
