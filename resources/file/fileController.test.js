const { setupApp, teardownApp, apiClient } = require('../../utils/testingUtils');
const { app } = require('../../app');
const mongoose = require('mongoose');
const { User } = require('../user/userSchema');
const { File } = require('./fileSchema');
const _ = require('lodash');

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
    test('upload file', async () => {
      // test status 200
      const validFile = await File.newTestFile(user.username);
      function test200 () {
        return apiClient.post('/api/files', validFile, apiClientConfig);
      }
      const res = await test200();
      expect(res.status).toBe(200);

      const fileInDb = await File.findOne({ name: validFile.name, authorUsername: user.username });
      expect(fileInDb).not.toBeNull();

      // test status 400
      const invalidFile = await File.newTestFile(user.username);
      invalidFile.name = '';
      function test400 () {
        return apiClient.post('/api/files', invalidFile, apiClientConfig);
      }
      const res400 = await test400().catch(err => err.response);
      expect(res400.status).toBe(400);
      expect(res400.data.error.name).toBe('Name is required');
    });

    test('like a file', async () => {
      const file = await File.newTestFile(user.username);
      const fileInstance = await File.create(file);

      // test status 200
      const validFileId = fileInstance._id;
      function test200 () {
        return apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig);
      }

      const res = await test200();
      expect(res.status).toBe(200);

      const fileInDb = await File.findOne({ name: file.name, authorUsername: user.username });
      expect(fileInDb.likes.find(like => like.authorUsername === user.username) != null).toBe(true);

      // test status 400
      function test400 () {
        return apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig);
      }

      const res400 = await test400().catch(err => err.response);
      expect(res400.status).toBe(400);

      // test status 200 for unliking
      function test200Unliking () {
        return apiClient.post(`/api/files/${validFileId}/like`, { liked: false }, apiClientConfig);
      }

      const res200Unliking = await test200Unliking();
      expect(res200Unliking.status).toBe(200);

      const fileInDbUnliking = await File.findOne({ name: file.name, authorUsername: user.username });
      expect(fileInDbUnliking.likes.find(l => l.authorUsername === user.username) == null).toBe(true);

      // test status 404
      const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
      function test404 () {
        return apiClient.post(`/api/files/${invalidFileId}/like`, { liked: true }, apiClientConfig);
      }

      const error = await test404().catch(err => err.response);
      expect(error.status).toBe(404);
    });

    test('comment on a file', async () => {
      const file = await File.newTestFile(user.username);
      const fileInstance = await File.create(file);

      // test status 200
      const validFileId = fileInstance._id;
      function test200 () {
        return apiClient.post(`/api/files/${validFileId}/comment`, { content: 'test comment' }, apiClientConfig);
      }

      const res = await test200();
      expect(res.status).toBe(200);

      const fileInDb = await File.findOne({ name: file.name, authorUsername: user.username });
      expect(fileInDb.comments.find(c => c.content === 'test comment') != null).toBe(true);

      // test status 404
      const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
      function test404 () {
        return apiClient.post(`/api/files/${invalidFileId}/comment`, { content: 'test comment' }, apiClientConfig);
      }

      const error = await test404().catch(err => err.response);
      expect(error.status).toBe(404);
    });

    test('get a file to view', async () => {
      const file = await File.newTestFile(user.username);
      const fileInstance = await File.create(file);

      // test status 200
      const validFileId = fileInstance._id;
      function test200 () {
        return apiClient.get(`/api/files/${validFileId}`, apiClientConfig);
      }

      const res = await test200();
      expect(res.status).toBe(200);

      const fields = ['id', 'authorUsername', 'comments', 'createdAt', 'height', 'name', 'tags', 'tileDimension', 'tilesets', 'type', 'updatedAt', 'width'];
      const fileFields = Object.keys(res.data.file);
      const difference = _.difference(fields, fileFields);
      expect(difference).toEqual([]);

      // test status 404
      const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
      function test404 () {
        return apiClient.get(`/api/files/${invalidFileId}`, apiClientConfig);
      }

      const error = await test404().catch(err => err.response);
      expect(error.status).toBe(404);
    });
  });
});
