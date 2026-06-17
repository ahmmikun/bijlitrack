import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index.js';

// Mock the scraper
vi.mock('../scraper/feeder.scraper.js', () => ({
  scrapeFeederPage: vi.fn(() => Promise.resolve({
    pageTitle: 'Mock Page',
    tableData: { 
      headers: ['Name', 'CNIC', 'Address'], 
      rows: [['John Doe', '12345-1234567-1', 'House 123, Street 45, Lahore']] 
    },
    timestamp: new Date().toISOString()
  }))
}));

// Mock the browser utils to avoid launching browser
vi.mock('../utils/browser.js', () => ({
  launchBrowser: vi.fn(() => Promise.resolve({
    browser: { close: vi.fn() },
    page: {}
  })),
  closeBrowser: vi.fn(() => Promise.resolve())
}));

describe('Reference API', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, 30000);

  describe('POST /api/reference/lookup', () => {
    it('should reject empty reference number', async () => {
      const res = await request(app)
        .post('/api/reference/lookup')
        .send({ referenceNo: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject reference number with invalid length', async () => {
      const res = await request(app)
        .post('/api/reference/lookup')
        .send({ referenceNo: '12345' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/14-digit/i);
    });

    it('should reject non-numeric reference number', async () => {
      const res = await request(app)
        .post('/api/reference/lookup')
        .send({ referenceNo: 'abc12345678901' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/numeric/i);
    });

    it('should accept valid 14-digit reference number and return masked data', async () => {
      const res = await request(app)
        .post('/api/reference/lookup')
        .send({ referenceNo: '12345678901234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // referenceNo should be masked (only last 4 visible)
      expect(res.body.data.referenceNo).toBe('**********1234');
      
      // Table data should be masked
      const row = res.body.data.tableData.rows[0];
      expect(row[0]).toBe('Jo*****e'); // Name masked (5 stars for 8-char name)
      expect(row[1]).toBe('12***-*******-1'); // CNIC masked
      expect(row[2]).toBe('House **** Lahore'); // Address masked
    });
  });
});
