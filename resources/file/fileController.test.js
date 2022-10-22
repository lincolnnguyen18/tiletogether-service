const { setupApp, teardownApp, apiClient } = require('../../utils/testingUtils');
const { app } = require('../../app');
const mongoose = require('mongoose');
const { User } = require('../user/userSchema');
const { File } = require('./fileSchema');

let server;

// Set long Jest timeout to allow for debugging
jest.setTimeout(100000);

describe('Connect to MongoDB', () => {
  let user, userInstance, apiClientConfig;

  beforeAll(async () => {
    server = await setupApp(app, mongoose);
    await File.deleteTestFiles();
    await User.deleteTestUsers();

    user = User.newTestUser();
    userInstance = await User.create(user);
    apiClientConfig = {
      headers: {
        withCredentials: true,
        Authorization: `Bearer ${userInstance.generateAuthToken()}`,
      },
    };
  });

  afterAll(async () => {
    await File.deleteTestFiles();
    await User.deleteTestUsers();
    await teardownApp(server, mongoose);
  });

  describe('File API lets user', () => {
    describe('upload file', () => {
      test('status 200', async () => {
        const validFile = await File.newTestFile(user.username);
        const res = await apiClient.post('/api/files', validFile, apiClientConfig);
        expect(res.status).toBe(200);
      });
      test('status 400', async () => {
        const invalidFile = await File.newTestFile(user.username);
        invalidFile.name = '';
        const res400 = await apiClient.post('/api/files', invalidFile, apiClientConfig).catch(err => err.response);
        expect(res400.status).toBe(400);
        expect(res400.data.error.name).toBe('Name is required');
      });
    });

    describe('like a file', () => {
      let file, fileInstance, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;
      });

      test('status 200', async () => {
        const res = await apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig);
        expect(res.status).toBe(200);
      });

      test('status 400', async () => {
        const res400 = await apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig).catch(err => err.response);
        expect(res400.status).toBe(400);
      });

      test('status 200 for unliking', async () => {
        const res200Unliking = await apiClient.post(`/api/files/${validFileId}/like`, { liked: false }, apiClientConfig);
        expect(res200Unliking.status).toBe(200);
      });

      test('status 404', async () => {
        const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
        const error = await apiClient.post(`/api/files/${invalidFileId}/like`, { liked: true }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });

    describe('comment on a file', () => {
      let file, fileInstance, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;
      });

      test('status 200', async () => {
        const res = await apiClient.post(`/api/files/${validFileId}/comment`, { content: 'test comment' }, apiClientConfig);
        expect(res.status).toBe(200);
      });

      test('status 404', async () => {
        const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
        const error = await apiClient.post(`/api/files/${invalidFileId}/comment`, { content: 'test comment' }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });

    describe('get a file to view', () => {
      let file, fileInstance, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;
      });

      test('status 200', async () => {
        const res = await apiClient.get(`/api/files/${validFileId}`, apiClientConfig);
        expect(res.status).toBe(200);
      });

      test('status 404', async () => {
        const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
        const error = await apiClient.get(`/api/files/${invalidFileId}`, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });

    describe('get a file to edit', () => {
      let file, fileInstance, validFileId;
      let user2, user2Instance, apiClientConfig2;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;

        user2 = User.newTestUser();
        user2Instance = await User.create(user2);
        apiClientConfig2 = {
          headers: {
            withCredentials: true,
            Authorization: `Bearer ${user2Instance.generateAuthToken()}`,
          },
        };
      });

      test('status 200', async () => {
        const res = await apiClient.get(`/api/files/${validFileId}/edit`, apiClientConfig);
        expect(res.status).toBe(200);
      });

      test('status 404', async () => {
        const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
        const error = await apiClient.get(`/api/files/${invalidFileId}/edit`, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });

      test('status 403 for not logged in user', async () => {
        const error = await apiClient.get(`/api/files/${validFileId}/edit`).catch(err => err.response);
        expect(error.status).toBe(403);
      });

      test('status 403 for not owner', async () => {
        const error = await apiClient.get(`/api/files/${validFileId}/edit`, apiClientConfig2).catch(err => err.response);
        expect(error.status).toBe(403);
      });

      test('status 200 for shared user', async () => {
        fileInstance.sharedWith.push(user2.username);
        await fileInstance.save();
        const res = await apiClient.get(`/api/files/${validFileId}/edit`, apiClientConfig);
        expect(res.status).toBe(200);
      });
    });
  });
});
