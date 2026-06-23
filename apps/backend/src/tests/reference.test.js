import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index.js';

describe('Reference API', () => {
  let mongoServer;
  const testUser = {
    name: 'Reference User',
    email: 'reference@example.com',
    password: 'password123'
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 30000);

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, 30000);

  const getAuthToken = async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    return res.body.token;
  };

  describe('POST /api/reference/track', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/reference/track')
        .send({ referenceNo: '12345678901234', consentGiven: true });

      expect(res.status).toBe(401);
    });

    it('should require consent before tracking', async () => {
      const token = await getAuthToken();

      const res = await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: '12345678901234', consentGiven: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/consent/i);
    });

    it('should reject empty reference number', async () => {
      const token = await getAuthToken();

      const res = await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: '', consentGiven: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/14-digit/i);
    });

    it('should reject reference number with invalid length', async () => {
      const token = await getAuthToken();

      const res = await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: '12345', consentGiven: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/14-digit/i);
    });

    it('should reject non-numeric reference number', async () => {
      const token = await getAuthToken();

      const res = await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: 'abc12345678901', consentGiven: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/numeric/i);
    });

    it('should track a valid 14-digit reference number', async () => {
      const token = await getAuthToken();

      const res = await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: '12345678901234', consentGiven: true, trackingDays: 14 });

      expect(res.status).toBe(201);
      expect(res.body.referenceNo).toBe('12345678901234');
      expect(res.body.referenceNoLast4).toBe('1234');
      expect(res.body.trackingDays).toBe(14);
      expect(res.body.trackingEnabled).toBe(true);
    });

    it('should reject duplicate references for the same user', async () => {
      const token = await getAuthToken();

      await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: '12345678901234', consentGiven: true });

      const res = await request(app)
        .post('/api/reference/track')
        .set('Authorization', `Bearer ${token}`)
        .send({ referenceNo: '12345678901234', consentGiven: true });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already/i);
    });
  });
});
