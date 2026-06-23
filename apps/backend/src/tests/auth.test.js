import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index.js';
import { User } from '../models/User.js';

describe('Authentication API', () => {
  let mongoServer;

  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  beforeAll(async () => {
    process.env.RETURN_PASSWORD_RESET_LINK = 'true';

    // If we have a real URI and it's not a local one, try to use it if requested
    // Otherwise, use memory server for safety and speed
    if (process.env.USE_REAL_DB === 'true' && process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    } else {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
    }
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

  it('should sign up a new user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testUser.email);
  });

  it('should not sign up a user with duplicate email', async () => {
    await request(app).post('/api/auth/signup').send(testUser);
    
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists');
  });

  it('should log in an existing user', async () => {
    await request(app).post('/api/auth/signup').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should not log in with wrong password', async () => {
    await request(app).post('/api/auth/signup').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should generate a password reset link for an existing user', async () => {
    await request(app).post('/api/auth/signup').send(testUser);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('resetToken');
    expect(res.body).toHaveProperty('resetUrl');
  });

  it('should not reveal whether a password reset email exists', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).not.toHaveProperty('resetToken');
  });

  it('should reset a password with a valid reset token', async () => {
    await request(app).post('/api/auth/signup').send(testUser);

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: forgotRes.body.resetToken,
        password: 'newpassword123'
      });

    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'newpassword123'
      });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body).toHaveProperty('token');
  });

  it('should reject an invalid password reset token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'invalid-token',
        password: 'newpassword123'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it('should allow CORS preflight from the Railway frontend', async () => {
    const res = await request(app)
      .options('/api/auth/forgot-password')
      .set('Origin', 'https://bijlitrack.up.railway.app')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://bijlitrack.up.railway.app');
  });
});
