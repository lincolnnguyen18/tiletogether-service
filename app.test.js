import { apiClient, setupApp, teardownApp } from './utils/testing-utils.js';
import { app } from './app.js';
import mongoose from 'mongoose';

let server;

describe('App', () => {
  beforeAll(async () => {
    server = await setupApp(app, mongoose);
  });

  afterAll(async () => {
    await teardownApp(server, mongoose);
  });

  test('returns 200 on /health', async () => {
    const response = await apiClient.get('/health');
    expect(response.status).toBe(200);
  });
});
