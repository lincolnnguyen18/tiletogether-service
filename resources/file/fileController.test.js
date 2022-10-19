const { setupApp, teardownApp, apiClient } = require('../../utils/testing-utils');
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
      const user = User.newTestUser();
      const userInstance = await User.create(user);

      const file = await File.newTestFile(user.username);

      const res = (await apiClient.post('/api/files', file, {
        headers: {
          withCredentials: true,
          Authorization: `Bearer ${userInstance.generateAuthToken()}`,
        },
      }));

      expect(res.status).toBe(200);
      const fileInDb = await File.findOne({ filename: file.filename, authorUsername: user.username });
      expect(fileInDb).not.toBeNull();

      await User.deleteOne({ _id: userInstance._id });
      await File.deleteOne({ _id: file._id });
    });
  });
});
