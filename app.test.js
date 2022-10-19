const { apiClient, setupApp, teardownApp } = require('./utils/testingUtils.js');
const { app } = require('./app.js');
const mongoose = require('mongoose');

let server;

describe('App', () => {
  beforeAll(async () => {
    server = await setupApp(app, mongoose);
  });

  afterAll(async () => {
    await teardownApp(server, mongoose);
  });

  test('returns 200 on /api/health', async () => {
    const response = await apiClient.get('/api/health');
    expect(response.status).toBe(200);
  });
});
