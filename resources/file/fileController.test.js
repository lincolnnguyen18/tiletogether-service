const { setupApp, teardownApp, apiClient } = require('../../utils/testingUtils');
const { app } = require('../../app');
const mongoose = require('mongoose');
const { User } = require('../user/userSchema');
const { File, editFileFields, Layer, tags, viewFileFieldsFull } = require('./fileSchema');
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
    await Layer.deleteTestLayers();

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
    await Layer.deleteTestLayers();
    await teardownApp(server, mongoose);
  });

  // No schema is created in db
  describe('File Generation Test', () => {
    let users;
    let file;

    beforeAll(async () => {
      users = _.times(3, () => User.newTestUser());
    });

    test('File without likes & comments', async () => {
      file = await File.newTestFile(user.username);
      expect(file.likeCount).toBe(0);
      expect(file.likes.length).toBe(0);
      expect(file.commentCount).toBe(0);
      expect(file.comments.length).toBe(0);
    });

    test('File with likes & comments posted by other users', async () => {
      file = await File.newTestFile(user.username, users);
      expect(file.likeCount).toBe(file.likes.length);
      expect(file.commentCount).toBe(file.comments.length);

      file.likes.forEach(l => {
        expect(users.some(u => u.username === l.username)).toBe(true);
      });

      file.comments.forEach(c => {
        expect(users.some(u => u.username === c.username)).toBe(true);
      });
    });
  });

  describe('File API lets user', () => {
    describe('create a file', () => {
      test('status 200', async () => {
        const validFile = await File.newTestFile(user.username);
        const res = await apiClient.post('/files', validFile, apiClientConfig);
        const fileInDb = await File.findById(res.data.fileId);
        expect(fileInDb).not.toBe(null);
        await File.findByIdAndDelete(res.data.fileId);
        await Layer.findByIdAndDelete(fileInDb.rootLayer._id);
      });

      test('status 400', async () => {
        const invalidFile = await File.newTestFile(user.username);
        invalidFile.name = '';
        const res400 = await apiClient.post('/files', invalidFile, apiClientConfig).catch(err => err.response);
        expect(res400.status).toBe(400);
        expect(res400.data.error.name).toBe('Name is required');
      });
    });

    describe('delete a file', () => {
      test('status 200', async () => {
        let file = await File.newTestFile(user.username);
        const fileInDb = await File.create(file);

        await apiClient.delete(`/files/${fileInDb._id}`, apiClientConfig);
        file = await File.findById(fileInDb._id);
        expect(file).toBe(null);
      });

      test('status 404', async () => {
        const error = await apiClient.delete('/files/1234', apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
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
        const likeCount = file.likeCount;
        await apiClient.post(`/files/${validFileId}/like`, { liked: true }, apiClientConfig);
        file = await File.findById(validFileId);

        const likedFile = await File.findOne({ _id: file._id, 'likes.username': user.username });
        expect(likedFile).not.toBeNull();
        expect(file.likeCount).toBe(likeCount + 1);
      });

      test('status 200 for unliking', async () => {
        const likeCount = file.likeCount;
        file.likes.push({ username: user.username, createdAt: Date.now() });
        await file.save();

        await apiClient.post(`/files/${validFileId}/like`, { liked: false }, apiClientConfig);
        file = await File.findById(validFileId);

        const unlikedFile = await File.findOne({ _id: file._id, 'likes.username': user.username });
        expect(unlikedFile).toBeNull();
        expect(file.likeCount).toBe(likeCount - 1);
      });

      test('status 404', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.post(`/files/${invalidFileId}/like`, { liked: true }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });

    describe('patch a file', () => {
      let file, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        file = await File.create(file);
        validFileId = file._id;
      });

      test('status 200 for renaming', async () => {
        const newName = 'rename test file';
        await apiClient.patch(`/files/${validFileId}`, { name: newName }, apiClientConfig);
        file = await File.findById(validFileId);
        expect(file.name).toBe(newName);
      });

      test('status 200 for modifying sharedWith', async () => {
        let newSharedWith = await Promise.all(_.times(3, () => User.create(User.newTestUser())));
        newSharedWith = newSharedWith.map(u => u.username);

        expect(file.sharedWith.length).toBe(0);
        await apiClient.patch(`/files/${validFileId}`, { sharedWith: newSharedWith }, apiClientConfig);
        file = await File.findById(validFileId);
        expect(file.sharedWith.sort()).toEqual(newSharedWith.sort());
      });

      // since publishedAt is set server side, for user to publish all they need to put in publishedAt is a non-null value
      test('status 200 for publishing file', async () => {
        // set file publishedAt to null
        file.publishedAt = null;
        await file.save();

        await apiClient.patch(`/files/${validFileId}`, { publishedAt: true }, apiClientConfig);
        file = await File.findById(validFileId);
        expect(file.publishedAt).not.toBeNull();
      });

      test('status 400 for modifying sharedWith', async () => {
        const newSharedWith = ['invalidUsername'];

        const sharedWithLength = file.sharedWith.length;
        const error = await apiClient.patch(`/files/${validFileId}`, { sharedWith: newSharedWith }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(400);
        file = await File.findById(validFileId);
        expect(file.sharedWith.length).toBe(sharedWithLength);
      });

      test('status 400', async () => {
        const res400 = await apiClient.patch(`/files/${validFileId}`, { name: '' }, apiClientConfig).catch(err => err.response);
        expect(res400.status).toBe(400);
        expect(res400.data.error.name).toBe('Name is required');
      });

      test('status 404', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.patch(`/files/${invalidFileId}`, { name: 'new name' }, apiClientConfig).catch(err => err.response);
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
        const commentCount = fileInstance.commentCount;
        await apiClient.post(`/files/${validFileId}/comment`, { content: 'test comment' }, apiClientConfig);

        const commentedFile = await File.findOne({ _id: validFileId, 'comments.username': user.username });
        expect(commentedFile).not.toBeNull();
        expect(commentedFile.commentCount).toBe(commentCount + 1);
      });

      test('status 404', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.post(`/files/${invalidFileId}/comment`, { content: 'test comment' }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });

    describe('reply to a comment on a file', () => {
      let file, fileInstance, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;
      });

      test('status 200', async () => {
        // test comment
        const commentCount = fileInstance.commentCount;
        await apiClient.post(`/files/${validFileId}/comment`, { content: 'test comment' }, apiClientConfig);
        const commentedFile = await File.findOne({ _id: validFileId, 'comments.username': user.username });
        expect(commentedFile).not.toBeNull();
        expect(commentedFile.commentCount).toBe(commentCount + 1);

        // test reply
        const comment = commentedFile.comments[commentCount];
        await apiClient.post(`/files/${validFileId}/comment`, { content: 'test reply', parentId: comment._id }, apiClientConfig);
        const repliedFile = await File.findOne({ _id: validFileId, 'comments.username': user.username });
        expect(repliedFile.commentCount).toBe(commentCount + 2);
      });

      test('status 404', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.post(`/files/${invalidFileId}/reply`, { content: 'test comment' }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });
    describe('like a comment', () => {
      let file, fileInstance, validFileId, commentCount, commentedFile;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;
        commentCount = fileInstance.commentCount;
        await apiClient.post(`/files/${validFileId}/comment`, { content: 'test comment' }, apiClientConfig);
        commentedFile = await File.findOne({ _id: validFileId, 'comments.username': user.username });
      });

      test('status 200', async () => {
        // test like comment
        const comment = commentedFile.comments[commentCount];
        const likeCount = comment.likeCount;
        await apiClient.post(`/files/${validFileId}/${comment._id}/like`, { liked: true }, apiClientConfig);
        const fileWithLikedComment = await File.findOne({ _id: validFileId, 'comments.username': user.username });
        expect(fileWithLikedComment.comments[commentCount].likes).not.toBeNull();
        expect(fileWithLikedComment.comments[commentCount].likeCount).toBe(likeCount + 1);
      });
      test('status 200 for unliking', async () => {
        // test unlike comment
        commentedFile = await File.findOne({ _id: validFileId, 'comments.username': user.username });
        const comment = commentedFile.comments[commentCount];
        const likeCount = comment.likeCount;
        await apiClient.post(`/files/${validFileId}/${comment._id}/like`, { liked: false }, apiClientConfig);
        const fileWithUnLikedComment = await File.findOne({ _id: validFileId, 'comments.username': user.username });
        expect(fileWithUnLikedComment.comments[commentCount].likes).toEqual([]);
        expect(fileWithUnLikedComment.comments[commentCount].likeCount).toBe(likeCount - 1);
      });

      test('status 404', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.post(`/files/${invalidFileId}/reply`, { content: 'test comment' }, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });
    });
    describe('get a file to view', () => {
      let file, fileInstance, validFileId;

      beforeAll(async () => {
        file = await File.newTestFile(user.username);
        file.publishedAt = Date.now();
        fileInstance = await File.create(file);
        validFileId = fileInstance._id;
      });

      test('status 200', async () => {
        const viewCount = file.views;
        const res = await apiClient.get(`/files/${validFileId}`, apiClientConfig);

        const fileFields = Object.keys(res.data.file);
        // remove imageUrl from viewFileFieldsFull (since not available in test env)
        const viewFileFieldsFull2 = _.without(viewFileFieldsFull, 'imageUrl');
        const difference = _.difference(viewFileFieldsFull2, fileFields);
        expect(difference).toEqual([]);
        const viewedFile = await File.findOne({ _id: validFileId });
        expect(viewedFile.views).toEqual(viewCount + 1);
      });

      test('status 404', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.get(`/files/${invalidFileId}`, apiClientConfig).catch(err => err.response);
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
        // db.files.find({ _id: ObjectId("63569bd9638fc94060324fdf"), $or: [ { authorUsername: 'car_test_user' }, { sharedWith: { $elemMatch: { $eq: 'car_test_user' } } } ] }).count() === 1
        const res = await apiClient.get(`/files/${validFileId}/edit`, apiClientConfig);
        const file = res.data.file;

        // this is testing to see if mongoose's populate() is working
        expect(file.rootLayer.layers.length).toBeGreaterThan(1);

        const fileFields = Object.keys(file);
        const difference = _.difference(editFileFields, fileFields);
        expect(difference).toEqual([]);
      });

      test('status 404 for non-existent file', async () => {
        const invalidFileId = 'abc';
        const error = await apiClient.get(`/files/${invalidFileId}/edit`, apiClientConfig).catch(err => err.response);
        expect(error.status).toBe(404);
      });

      test('status 200 for not logged in user', async () => {
        const error = await apiClient.get(`/files/${validFileId}/edit`).catch(err => err.response);
        expect(error.status).toBe(200);
      });

      test('status 200 for not owner', async () => {
        const error = await apiClient.get(`/files/${validFileId}/edit`, apiClientConfig2).catch(err => err.response);
        expect(error.status).toBe(200);
      });
      // modified getFileToEdit to allow all users (needed to allow tmx map exporting)

      test('status 200 for shared user', async () => {
        fileInstance.sharedWith.push(user2.username);
        await fileInstance.save();
        const res = await apiClient.get(`/files/${validFileId}/edit`, apiClientConfig2);

        const fileFields = Object.keys(res.data.file);
        const difference = _.difference(editFileFields, fileFields);
        expect(difference).toEqual([]);
      });
    });

    describe('query files', () => {
      const numUsers = 3;
      const numFiles = 10;

      const users = [];
      let files = [];

      const defaultPageLimit = 10;

      beforeAll(async () => {
        await User.deleteTestUsers();
        await File.deleteTestFiles();
        await Layer.deleteTestLayers();

        for (let i = 0; i < numUsers; i++) {
          const user = await User.create(User.newTestUser());
          users.push(user);
        }

        for (let i = 0; i < numFiles; i++) {
          const randomUser = _.sample(users);
          const file = await File.newTestFile(randomUser.username, users);
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
        let pageCount = 0;
        let page = [];
        apiClientConfig.params.type = 'tileset';

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get('/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, type: 'tileset' })
            .sort({ publishedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          pageCount++;
        } while (true);
      });

      test('status 200 for keywords = random tag and random user, sorted by likes', async () => {
        // db.files.find({publishedAt: {$ne: null}, $text: {$search: 'buildings male_test_user'}}).sort({likeCount: -1, _id: -1}).skip(0).limit(10)
        let pageCount = 0;
        let page = [];
        const randomTag = _.sample(tags);
        const randomUsername = _.sample(users).username;
        const keywords = `${randomTag} ${randomUsername}`;
        apiClientConfig.params.keywords = keywords;
        apiClientConfig.params.sort_by = 'likes';

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get('/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, $text: { $search: keywords } })
            .sort({ likeCount: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          pageCount++;
        } while (true);
      });

      test('status 200 for another user\'s files', async () => {
        // db.files.find({publishedAt: {$ne: null}, authorUsername: "testuser2"}).sort({publishedAt: -1, _id: -1}).skip(0).limit(10)
        let pageCount = 0;
        let page = [];
        const randomUsername = _.sample(users).username;
        apiClientConfig.params.authorUsername = randomUsername;

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get('/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, authorUsername: randomUsername })
            .sort({ publishedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
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
        let pageCount = 0;
        let page = [];
        apiClientConfig.params.username = randomUser.username;
        apiClientConfig.params.mode = 'likes';
        apiClientConfig.headers = { Authorization: `Bearer ${randomUser.generateAuthToken()}` };

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get('/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ publishedAt: { $ne: null }, likes: { $elemMatch: { username: randomUser.username } } })
            .sort({ publishedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          pageCount++;
        } while (true);
      });

      test('status 200 for signed in user\'s files', async () => {
        // db.files.find({authorUsername: "bedfordshi_test_user"}).sort({updatedAt: -1, _id: -1}).skip(0).limit(10)
        let pageCount = 0;
        let page = [];
        const randomUser = _.sample(users);
        apiClientConfig.params.authorUsername = randomUser.username;
        apiClientConfig.headers = { Authorization: `Bearer ${randomUser.generateAuthToken()}` };

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get('/files?mode=your_files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ authorUsername: randomUser.username })
            .sort({ updatedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
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
        let pageCount = 0;
        let page = [];
        apiClientConfig.params.username = randomUser.username;
        apiClientConfig.params.mode = 'shared';
        apiClientConfig.headers = { Authorization: `Bearer ${randomUser.generateAuthToken()}` };

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get('/files', apiClientConfig);
          page = res.data.files;
          const expectedPage = await File
            .find({ sharedWith: { $elemMatch: { $eq: randomUser.username } } })
            .sort({ updatedAt: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          pageCount++;
        } while (true);
      });

      test('status 200 for recommended files', async () => {
        // db.files.find({publishedAt: {$ne: null}, $text: {$search: 'file tags'}, _id: {$ne: ObjectId("635e892aa0b16365dca5602b")}}, {name: 1, likeCount: 1, authorUsername: 1}).sort({likeCount: -1, _id: -1}).limit(10)
        let pageCount = 0;
        let page = [];

        const randomFile = _.sample(files);

        do {
          apiClientConfig.params.page = pageCount + 1;
          const res = await apiClient.get(`/files/${randomFile.id}/recommend`, apiClientConfig);
          page = res.data.files;
          let expectedPage = await File
            .find({ publishedAt: { $ne: null }, _id: { $ne: randomFile.id }, $text: { $search: randomFile.tags } })
            .sort({ likeCount: -1, _id: -1 })
            .skip(pageCount * defaultPageLimit)
            .limit(defaultPageLimit);
          if (expectedPage.length === 0) {
            expectedPage = await File
              .find({ publishedAt: { $ne: null }, _id: { $ne: randomFile.id } })
              .sort({ likeCount: -1, _id: -1 })
              .skip(pageCount * defaultPageLimit)
              .limit(defaultPageLimit);
          }
          expect(page.map(file => file._id)).toEqual(expectedPage.map(file => file.id));
          if (page.length !== defaultPageLimit) break;
          pageCount++;
        } while (true);
      });
    });
  });
});
