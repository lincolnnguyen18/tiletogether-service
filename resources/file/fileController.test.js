const { setupApp, teardownApp, apiClient } = require('../../utils/testingUtils');
const { app } = require('../../app');
const mongoose = require('mongoose');
const { User } = require('../user/userSchema');
const { File, editFileFields, viewFileFields, Layer, tags } = require('./fileSchema');
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

        const likedFile = await File.findOne({ _id: file._id, 'likes.username': user.username });
        expect(likedFile).not.toBeNull();

        const res400 = await apiClient.post(`/api/files/${validFileId}/like`, { liked: true }, apiClientConfig).catch(err => err.response);
        expect(res400.status).toBe(400);
      });

      test('status 200 for unliking', async () => {
        file.likes.push({ username: user.username, createdAt: new Date() });
        await file.save();

        const res200Unliking = await apiClient.post(`/api/files/${validFileId}/like`, { liked: false }, apiClientConfig);
        expect(res200Unliking.status).toBe(200);
        file = await File.findById(validFileId);

        const unlikedFile = await File.findOne({ _id: file._id, 'likes.username': user.username });
        expect(unlikedFile).toBeNull();
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

        const commentedFile = await File.findOne({ _id: validFileId, 'comments.username': user.username });
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
      const numUsers = 5;
      const numFiles = 50;

      const users = [];
      let files = [];

      const defaultPageLimit = 10;

      beforeAll(async () => {
        await User.deleteMany({});
        await File.deleteMany({});
        await Layer.deleteMany({});

        for (let i = 0; i < numUsers; i++) {
          const user = await User.create(User.newTestUser());
          users.push(user);
        }

        for (let i = 0; i < numFiles; i++) {
          const randomUser = _.sample(users);
          const file = await File.newTestFile(randomUser.username);
          files.push(file);
        }
        files.sort((a, b) => a.createdAt - b.createdAt);

        const newFiles = [];
        for (let i = 0; i < numFiles; i++) {
          const file = await File.create(files[i]);
          newFiles.push(file);
        }
        files = newFiles;
      });

      beforeEach(async () => {
        apiClientConfig.params = {};
      });

      test('status 200 for getting files of type tileset', async () => {
        // db.files.find({publishedAt: {$ne: null}, type: "tileset"}).sort({publishedAt: -1, _id: -1}).skip(0).limit(10)
        let continuationToken = null;
        let pageCount = 0;
        let page = [];
        apiClientConfig.params.type = 'tileset';

        do {
          apiClientConfig.params.continuation_token = continuationToken;
          const res = await apiClient.get('/api/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, type: 'tileset' })
            .sort({ publishedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          continuationToken = page[page.length - 1];
          pageCount++;
        } while (true);
      });

      test('status 200 for keywords = random tag and random user, sorted by likes', async () => {
        // db.files.find({publishedAt: {$ne: null}, $text: {$search: 'buildings male_test_user'}}).sort({likeCount: -1, _id: -1}).skip(0).limit(10)
        let continuationToken = null;
        let pageCount = 0;
        let page = [];
        const randomTag = _.sample(tags);
        const randomUsername = _.sample(users).username;
        const keywords = `${randomTag} ${randomUsername}`;
        apiClientConfig.params.keywords = keywords;
        apiClientConfig.params.sort_by = 'likes';

        do {
          apiClientConfig.params.continuation_token = continuationToken;
          const res = await apiClient.get('/api/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, $text: { $search: keywords } })
            .sort({ likeCount: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          continuationToken = page[page.length - 1];
          pageCount++;
        } while (true);
      });

      test('status 200 for another user\'s files', async () => {
        // db.files.find({publishedAt: {$ne: null}, authorUsername: "testuser2"}).sort({publishedAt: -1, _id: -1}).skip(0).limit(10)
        let continuationToken = null;
        let pageCount = 0;
        let page = [];
        const randomUsername = _.sample(users).username;
        apiClientConfig.params.authorUsername = randomUsername;

        do {
          apiClientConfig.params.continuation_token = continuationToken;
          const res = await apiClient.get('/api/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, authorUsername: randomUsername })
            .sort({ publishedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          continuationToken = page[page.length - 1];
          pageCount++;
        } while (true);
      });

      test('status 200 for signed in user\'s likes', async () => {
        // get random user
        const randomUser = _.sample(users);
        // get 25 random files
        const randomFiles = _.sampleSize(files, 25);
        // like the randomFiles
        for (let i = 0; i < randomFiles.length; i++) {
          const randomFile = randomFiles[i];
          randomFile.likes.push({ username: randomUser.username, createdAt: Date.now() });
          await randomFile.save();
        }

        // db.files.find({publishedAt: {$ne: null}, likes: {$elemMatch: {username: "testuser2"}}}).sort({publishedAt: -1, _id: -1}).skip(0).limit(10)
        let continuationToken = null;
        let pageCount = 0;
        let page = [];
        apiClientConfig.params.username = randomUser.username;
        apiClientConfig.params.mode = 'likes';
        apiClientConfig.headers = { Authorization: `Bearer ${randomUser.generateAuthToken()}` };

        do {
          apiClientConfig.params.continuation_token = continuationToken;
          const res = await apiClient.get('/api/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, likes: { $elemMatch: { username: randomUser.username } } })
            .sort({ publishedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          continuationToken = page[page.length - 1];
          pageCount++;
        } while (true);
      });

      test('status 200 for signed in user\'s files', async () => {
        // db.files.find({authorUsername: "bedfordshi_test_user"}).sort({updatedAt: -1, _id: -1}).skip(0).limit(10)
        let continuationToken = null;
        let pageCount = 0;
        let page = [];
        const randomUser = _.sample(users);
        apiClientConfig.params.authorUsername = randomUser.username;
        apiClientConfig.headers = { Authorization: `Bearer ${randomUser.generateAuthToken()}` };

        do {
          apiClientConfig.params.continuation_token = continuationToken;
          const res = await apiClient.get('/api/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ authorUsername: randomUser.username })
            .sort({ updatedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          continuationToken = page[page.length - 1];
          pageCount++;
        } while (true);
      });

      test('status 200 for files that have been shared with signed in user', async () => {
        // get random user
        const randomUser = _.sample(users);
        // get 25 random files
        const randomFiles = _.sampleSize(files, 25);
        // add user to sharedWith all files in randomFiles
        for (let i = 0; i < randomFiles.length; i++) {
          const randomFile = randomFiles[i];
          randomFile.sharedWith.push(randomUser.username);
          await randomFile.save();
        }

        // db.files.find({sharedWith: {$elemMatch: {$eq: "minivan_test_user"}}}).sort({updatedAt: -1, _id: -1}).skip(0).limit(10)
        let continuationToken = null;
        let pageCount = 0;
        let page = [];
        apiClientConfig.params.username = randomUser.username;
        apiClientConfig.params.mode = 'shared';
        apiClientConfig.headers = { Authorization: `Bearer ${randomUser.generateAuthToken()}` };

        do {
          apiClientConfig.params.continuation_token = continuationToken;
          const res = await apiClient.get('/api/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ sharedWith: { $elemMatch: { $eq: randomUser.username } } })
            .sort({ updatedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          continuationToken = page[page.length - 1];
          pageCount++;
        } while (true);
      });
    });
  });
});
