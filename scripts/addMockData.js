const { app } = require('../app');
const mongoose = require('mongoose');
const { setupApp, teardownApp } = require('../utils/testingUtils');
const { User } = require('../resources/user/userSchema');
const { File } = require('../resources/file/fileSchema');
const _ = require('lodash');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env.development' });

const numUsers = 5;
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
    const file = await File.newTestFile(randomUser.username);
    const fileInstance = await File.create(file);
    files.push(fileInstance);
  }

  await teardownApp(server, mongoose);

  console.log('Done!');
}

main().catch(console.error);
