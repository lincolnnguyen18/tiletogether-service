const { app } = require('../app');
const mongoose = require('mongoose');
const { setupApp, teardownApp } = require('./testingUtils');
const { User } = require('../resources/user/userSchema');
const { File } = require('../resources/file/fileSchema');

async function main () {
  const server = await setupApp(app, mongoose);

  // Delete all test files and test users
  await File.deleteTestFiles();
  await User.deleteTestUsers();

  await teardownApp(server, mongoose);

  console.log('Done!');
}

main().catch(console.error);
