const { setupApp, teardownApp, apiClient } = require('../../utils/testingUtils');
const { app } = require('../../app');
const mongoose = require('mongoose');
const { User } = require('../user/userSchema');
const { File, editFileFields, viewFileFields, Layer } = require('./fileSchema');
const _ = require('lodash');

let server;

// Set long Jest timeout to allow for debugging
jest.setTimeout(100000);

describe('Connect to MongoDB', () => {
  let user, apiClientConfig;

  beforeAll(async () => {
    server = await setupApp(app, mongoose);
    await File.deleteTestFiles();
    await User.deleteTestUsers();

    user = await User.create(User.newTestUser());
    apiClientConfig = {
      headers: {
        withCredentials: true,
        Authorization: `Bearer ${user.generateAuthToken()}`,
      },
    };
  });

  afterAll(async () => {
    await File.deleteTestFiles();
    await User.deleteTestUsers();
    await teardownApp(server, mongoose);
  });

  describe('File API lets user', () => {
    describe('create a file', () => {
      test('status 200', async () => {
        const validFile = await File.newTestFile(user.username);
        const res = await apiClient.post('/api/files', validFile, apiClientConfig);
        expect(res.status).toBe(200);
        const fileInDb = await File.findById(res.data.file.id);
        expect(fileInDb).not.toBe(null);

        const fileFields = Object.keys(res.data.file);
        const difference = _.difference(editFileFields, fileFields);
        expect(difference).toEqual([]);
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
      let file, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        file = await File.create(file);
        validFileId = file._id;
      });

      test('status 200', async () => {
        const res = await apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig);
        expect(res.status).toBe(200);
        file = await File.findById(validFileId);

        const likedFile = await File.findOne({ _id: file._id, 'likes.authorUsername': user.username });
        expect(likedFile).not.toBeNull();

        user = await User.findById(user._id);
        expect(user.likedFiles).toContainEqual(validFileId);
      });

      test('status 400', async () => {
        const res400 = await apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig).catch(err => err.response);
        expect(res400.status).toBe(400);
      });

      test('status 200 for unliking', async () => {
        const res200Unliking = await apiClient.post(`/api/files/${validFileId}/like`, { liked: false }, apiClientConfig);
        expect(res200Unliking.status).toBe(200);
        file = await File.findById(validFileId);

        const unlikedFile = await File.findOne({ _id: file._id, 'likes.authorUsername': user.username });
        expect(unlikedFile).toBeNull();

        user = await User.findById(user._id);
        expect(user.likedFiles).not.toContainEqual(validFileId);
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

        const commentedFile = await File.findOne({ _id: validFileId, 'comments.authorUsername': user.username });
        expect(commentedFile).not.toBeNull();
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

        const fileFields = Object.keys(res.data.file);
        const difference = _.difference(viewFileFields, fileFields);
        expect(difference).toEqual([]);
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

        const fileFields = Object.keys(res.data.file);
        const difference = _.difference(editFileFields, fileFields);
        expect(difference).toEqual([]);
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

    describe('query files', () => {
      const numUsers = 3;
      const numFiles = 30;

      const users = [];
      const files = [];

      beforeAll(async () => {
        await User.deleteMany({});
        await File.deleteMany({});
        await Layer.deleteMany({});

        for (let i = 0; i < numUsers; i++) {
          const user = await User.create(User.newTestUser());
          users.push(user);
        }

        // Create files
        for (let i = 0; i < numFiles; i++) {
          const randomUser = _.sample(users);
          const file = await File.newTestFile(randomUser.username);
          const fileInstance = await File.create(file);
          files.push(fileInstance);
        }
      });

      beforeEach(async () => {
        apiClientConfig.params = {};
      });

      test('status 200 for all files without any search options', async () => {
        const res = await apiClient.get('/api/files', apiClientConfig);
        expect(res.status).toBe(200);
      });

      test('status 200 for all files with some search options', async () => {
        apiClientConfig.params = {
          keywords: `${_.sample(users).username} ${_.sample(files).name}`,
          tile_dimension: '16',
        };
        const res = await apiClient.get('/api/files', apiClientConfig);
        expect(res.status).toBe(200);
      });

      test('status 200 for files of a user', async () => {
        const randomUser = _.sample(users);
        apiClientConfig.params = {
          author_username: randomUser.username,
        };
        const res = await apiClient.get('/api/files', apiClientConfig);
        expect(res.status).toBe(200);
        res.data.files.forEach(file => {
          expect(file.authorUsername).toBe(randomUser.username);
        });
      });
    });
  });
});
