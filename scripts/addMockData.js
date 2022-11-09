const { app } = require('../app');
const mongoose = require('mongoose');
const { setupApp, teardownApp } = require('../utils/testingUtils');
const { User } = require('../resources/user/userSchema');
const { File, Layer } = require('../resources/file/fileSchema');
const _ = require('lodash');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env.development' });

const numUsers = 10;
const numFiles = 50;

const users = [];
const files = [];

async function main () {
  const server = await setupApp(app, mongoose);

  // Create users
  for (let i = 0; i < numUsers; i++) {
    const user = await User.create(User.newTestUser());
    users.push(user);
  }

  // Create user to login with
  let testUser = User.newTestUser();
  testUser.username = 'test';
  testUser.password = 'password123';
  testUser.email = 'test@email.com';
  testUser = await User.create(testUser);
  users.push(testUser);

  // Create files
  for (let i = 0; i < numFiles; i++) {
    const randomUser = _.sample(users);
    const file = await File.newTestFile(randomUser.username, users);
    const fileInstance = await File.create(file);
    files.push(fileInstance);
  }

  // Create test file
  let testRootLayer = { name: 'test_root_layer', type: 'group' };
  const testLayer1 = { name: 'test_layer_1', type: 'layer' };
  testLayer1.tilesetLayerUrl = '/mock-layer-images/12.png';
  testRootLayer.layers = [testLayer1];
  testRootLayer = await Layer.create(testRootLayer);

  const testFile = await File.newTestFile(testUser.username, users);
  testFile.name = 'Rabbit world test file';
  testFile.rootLayer = testRootLayer._id;
  testFile.tileDimension = 16;
  testFile.width = 9;
  testFile.height = 6;
  testFile.type = 'tileset';
  testFile.updatedAt = Date.now();
  await File.create(testFile);

  await teardownApp(server, mongoose);

  console.log('Done!');
}

main().catch(console.error);
