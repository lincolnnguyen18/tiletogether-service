const { app } = require('../app');
const mongoose = require('mongoose');
const { setupApp, teardownApp } = require('./testingUtils');
const { User } = require('../resources/user/userSchema');
const { File } = require('../resources/file/fileSchema');
const _ = require('lodash');
const numUsers = 10;
const numFiles = 30;

const users = [];
const files = [];

async function main () {
  const server = await setupApp(app, mongoose);

  // Create users
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

  await teardownApp(server, mongoose);

  console.log('Done!');
}

main().catch(console.error);
