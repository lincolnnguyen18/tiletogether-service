const { app } = require('../app');
const mongoose = require('mongoose');
const { setupApp, teardownApp } = require('../utils/testingUtils');
const { User } = require('../resources/user/userSchema');
const { File, Layer } = require('../resources/file/fileSchema');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env.development' });

async function main () {
  const server = await setupApp(app, mongoose);

  // Delete all test files and test users
  await File.deleteTestFiles();
  await User.deleteTestUsers();
  await Layer.deleteTestLayers();

  await teardownApp(server, mongoose);

  console.log('Done!');
}

main().catch(console.error);
