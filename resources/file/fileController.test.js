const { setupApp, teardownApp, apiClient } = require('../../utils/testingUtils');
const { app } = require('../../app');
const mongoose = require('mongoose');
const { User } = require('../user/userSchema');
const { File } = require('./fileSchema');

let server;

// Set long Jest timeout to allow for debugging
jest.setTimeout(100000);

describe('Connect to MongoDB', () => {
  beforeAll(async () => {
    server = await setupApp(app, mongoose);
    await File.deleteTestFiles();
    await User.deleteTestUsers();
  });

  afterAll(async () => {
    await File.deleteTestFiles();
    await User.deleteTestUsers();
    await teardownApp(server, mongoose);
  });

  describe('File API lets user', () => {
    test('upload file', async () => {
      // setup
      const user = User.newTestUser();
      const userInstance = await User.create(user);

      // test status 200
      const validFile = await File.newTestFile(user.username);
      function test200 () {
        return apiClient.post('/api/files', validFile, {
          headers: {
            withCredentials: true,
            Authorization: `Bearer ${userInstance.generateAuthToken()}`,
          },
        });
      }
      const res = await test200();
      expect(res.status).toBe(200);

      const fileInDb = await File.findOne({ name: validFile.name, authorUsername: user.username });
      expect(fileInDb).not.toBeNull();

      // test status 400
      const invalidFile = await File.newTestFile(user.username);
      invalidFile.name = '';
      function test400 () {
        return apiClient.post('/api/files', invalidFile, {
          headers: {
            withCredentials: true,
            Authorization: `Bearer ${userInstance.generateAuthToken()}`,
          },
        });
      }
      const res400 = await test400().catch(err => err.response);
      expect(res400.status).toBe(400);
      expect(res400.data.error.name).toBe('Name is required');

      // teardown
      await User.deleteOne({ _id: userInstance._id });
      await File.deleteOne({ _id: validFile._id });
    });

    test('like a file', async () => {
      // setup
      const user = User.newTestUser();
      const userInstance = await User.create(user);

      const file = await File.newTestFile(user.username);
      const fileInstance = await File.create(file);

      // test status 200
      const validFileId = fileInstance._id;
      function test200 () {
        return apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, {
          headers: {
            withCredentials: true,
            Authorization: `Bearer ${userInstance.generateAuthToken()}`,
          },
        });
      }

      const res = await test200();
      expect(res.status).toBe(200);

      const fileInDb = await File.findOne({ name: file.name, authorUsername: user.username });
      expect(fileInDb.likes).toContainEqual(
        expect.objectContaining({ authorUsername: user.username }),
      );

      // test status 404
      const invalidFileId = '5e9b9b9b9b9b9b9b9b9b9b9b';
      function test404 () {
        return apiClient.post(`/api/files/${invalidFileId}/like`, { liked: true }, {
          headers: {
            withCredentials: true,
            Authorization: `Bearer ${userInstance.generateAuthToken()}`,
          },
        });
      }

      const error = await test404().catch(err => err.response);
      expect(error.status).toBe(404);

      // teardown
      await User.deleteOne({ _id: userInstance._id });
      await File.deleteOne({ _id: file._id });
    });
  });
});
