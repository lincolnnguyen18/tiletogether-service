const { apiClient, setupApp, teardownApp } = require('./utils/testing-utils.js');
const mongoose = require('mongoose');
const { app } = require('./app');

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
