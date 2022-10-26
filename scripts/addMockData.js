const { app } = require('../app');
const mongoose = require('mongoose');
const { setupApp, teardownApp } = require('../utils/testingUtils');
const { User } = require('../resources/user/userSchema');
const { File, Layer } = require('../resources/file/fileSchema');
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

  // Create test file
  let testRootLayer = { name: 'test_root_layer', type: 'group' };
  const testLayer1 = { name: 'test_layer_1', type: 'layer' };
  testLayer1.tilesetLayerUrl = 'https://tiletogether-user-pngs.s3.us-east-1.amazonaws.com/01b9d74d-2945-4f4e-8dcf-d87f0f60374c?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBcaCXVzLWVhc3QtMSJHMEUCIDzQ%2BlRmSCuReJr2IzKmXmeogIomcy%2BS8NwrUHQCSCxpAiEA2GAskwgkpGXan5Z755djQz0%2FyeVLL2Fxdj%2BfFTysuWMqhAMI8P%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw1NDI3NzM3MTkyMjIiDLHokf3aMYiRbjD6pyrYAjMJrXe3%2FRH6SKIFVf5VzSqnNhwT4hBTID78Q6KmmykEoi7%2BWRcK5CBSRSDIeG0IMx9uEO0Cny952vTVMAMhASnW40p2HVZb8iAwQX%2FUDA6Hg%2BO9uqGnL9B%2B6jZkG%2BSoY1COLeSG%2BdZSuiVROUemFFJUafeniGBBunh6LJMLdMxQgu38%2Bo%2FE7wKCz5bQfSREGOAqsUOIvu4xQdFPzk%2BRy1Ul1TTujBhX3L8bx0LCZblyPT%2BdyyH5VILWdnVBGp7tzGrPPeqRnzp%2BP1tlO%2BST%2FwIr9KoNdUwSA9o4rfyQ8j%2FGaybYzIzdBT48vwBz2aYxpFmUGNMKsX7Kb7FMUF0TGTcOIPoqnmFXHQI%2Fz%2Feq6%2FXG0qLZ4HO7RvKV6cSwsmjLCV6AIZhwq%2B1%2FS6%2BryIPE5eX2c2g3davenSuJvf%2BRv9PNv4G6PI%2Bp3tIEUQRORFCHmHQGnEn%2FWnitML6Q5ZoGOrMCv87VNJsrIGvEAez1Yi1qQFaq00lVBkammHNfAGWPUhsSmmTIcPahDOXEIuNxTSk%2Fw3UZVz1jsFBMQz9Llre9WpYveHlJP3Eh2Zt7WbxNLv%2FkiLUXZ8H1Z0hb7Dj3VxjGpxGFf%2BZTRC7zRRlF6RRshQZF4aKbMpvrOWrAae69tGEK0jG42hkO7EzAPYoOumUcyUT5s8giIDyTBtVCNw5sL3NoBoG5e4ji0WhG94caGNYUAPaFixrU5CQI7YCCM6f702vDbKQptstcV9z83xtT4I5nYl5lheQoD%2FSjhQF3%2FOYgROZvFMTH8FiTtdqq%2BG8Buowj2L1XaC4%2F7h2Rdl3mzXwRVKtnORcOah46gJSrp2JD0mAQDxn8doFhAWZFLZRZFB35XGEbY4pGLIAQsZO8NYpAmg%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20221026T173122Z&X-Amz-SignedHeaders=host&X-Amz-Expires=43200&X-Amz-Credential=ASIAX4X6VWC3PO7J3V5R%2F20221026%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=dc9fafd4b720191c2c806ec59b2567668a80d9f228decf31f8025e02cb330319';
  testRootLayer.layers = [testLayer1];
  testRootLayer = await Layer.create(testRootLayer);

  const testFile = await File.newTestFile(testUser.username);
  testFile.name = 'Rabbit world test file';
  testFile.rootLayer = testRootLayer._id;
  testFile.tileDimension = 16;
  testFile.width = 9;
  testFile.height = 6;
  testFile.type = 'tileset';
  testFile.updatedAt = new Date();
  await File.create(testFile);

  await teardownApp(server, mongoose);

  console.log('Done!');
}

main().catch(console.error);
