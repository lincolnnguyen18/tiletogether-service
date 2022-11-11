const { Schema } = require('mongoose');
const { faker } = require('@faker-js/faker');
const _ = require('lodash');
const mongoose = require('mongoose');
const { createRandomTree } = require('../../utils/treeUtils');

const tags = ['furniture', 'trees', 'buildings', 'vehicles', 'people', 'animals', 'plants', 'food', 'weapons', 'misc'];
const tileDimensions = [4, 8, 16, 32, 64];

const editFileFields = ['id', 'height', 'name', 'rootLayer', 'sharedWith', 'tags', 'tileDimension', 'tilesets', 'type', 'publishedAt', 'width'];
const viewFileFields = ['id', 'authorUsername', 'likeCount', 'commentCount', 'height', 'name', 'tags', 'tileDimension', 'tilesets', 'type', 'updatedAt', 'width', 'publishedAt', 'likes', 'views'];
const viewFileFieldsFull = ['id', 'authorUsername', 'likes', 'likeCount', 'comments', 'commentCount', 'height', 'name', 'tags', 'tileDimension', 'tilesets', 'type', 'updatedAt', 'width', 'publishedAt', 'likes', 'description', 'views'];

const layerSchema = Schema({
  name: { type: String, required: true },
  opacity: { type: Number, default: 1, required: true, min: 0, max: 1 },
  properties: new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: String, required: true },
  }),
  tiles: new Schema({
    index: { type: Number, required: true },
    tileset: { type: Schema.Types.ObjectId, ref: 'File', required: true },
  }),
  tilesetLayerUrl: { type: String },
  type: { type: String, required: true, enum: ['layer', 'group'] },
  visible: { type: Boolean, default: true, required: true },
  // set _id manually to allow client side to set id later on (when creating new layers)
  _id: { type: Schema.Types.ObjectId, default: mongoose.Types.ObjectId },
});
layerSchema.add({ layers: [{ type: layerSchema }] });

layerSchema.statics.newTestLayer = function () {
  return {
    name: faker.random.words(_.random(1, 5)) + ' test_layer',
  };
};

const fileSchema = Schema({
  authorUsername: { type: String, required: true, index: true },
  name: { type: String, required: [true, 'Name is required'] },
  type: { type: String, required: true, enum: ['map', 'tileset'], index: true },
  description: { type: String },
  tileDimension: { type: Number, required: [true, 'Tile dimension is required'], index: true },
  width: { type: Number, min: 1, required: [true, 'Width is required'] },
  height: { type: Number, min: 1, required: [true, 'Height is required'] },
  rootLayer: { type: Schema.Types.ObjectId, ref: 'Layer' },
  tilesets: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  imageUrl: String,
  views: { type: Number, min: 0, required: true, default: 0 },
  tags: { type: String, required: true, index: true },
  publishedAt: { type: Date, sparse: true },
  createdAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true },
  comments: [new Schema({
    username: { type: String, required: true, index: true },
    content: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    parentId: { type: Schema.Types.ObjectId },
  })],
  commentCount: { type: Number, min: 0, required: true, default: 0 },
  likes: [new Schema({
    username: { type: String, required: true, index: true },
    createdAt: { type: Date, required: true, default: Date.now },
  })],
  likeCount: { type: Number, min: 0, required: true, default: 0 },
  sharedWith: [String],
});

fileSchema.index({ authorUsername: 'text', name: 'text', tags: 'text' });

fileSchema.statics.newTestFile = async function (authorUsername, users = []) {
  const createdAt = faker.date.past();
  const updatedAt = faker.date.between(createdAt, Date.now());
  const tileDimension = _.sample(tileDimensions);
  const width = _.random(1, 10);
  const height = _.random(1, 10);
  const type = _.sample(['map', 'tileset']);
  const rootLayer = await Layer.create({ name: 'test_root_layer', type: 'group' });

  rootLayer.layers = createRandomTree(3);
  await rootLayer.save();

  const likes = _
    .sampleSize(users, _.random(0, users.length))
    .map((user) => ({
      username: user.username,
      createdAt: faker.date.between(createdAt, Date.now()),
    }));

  const comments = _
    .sampleSize(users, _.random(0, users.length))
    .map((user) => ({
      username: user.username,
      content: faker.lorem.paragraphs(_.random(1, 2)),
      createdAt: faker.date.between(createdAt, Date.now()),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  return {
    name: faker.random.words(_.random(1, 5)) + ' test file',
    authorUsername,
    description: faker.lorem.paragraphs(_.random(3, 6)),
    tileDimension,
    width,
    height,
    tags: _.sampleSize(tags, _.random(1, 4)).join(' '),
    createdAt,
    updatedAt,
    rootLayer: rootLayer._id,
    type,
    publishedAt: _.sample([null, faker.date.between(createdAt, updatedAt)]),
    views: _.random(0, 100),
    likes,
    likeCount: likes.length,
    comments,
    commentCount: comments.length,
  };
};

fileSchema.statics.deleteTestFiles = async function () {
  await this.deleteMany({ name: /test file/ });
};

layerSchema.statics.deleteTestLayers = async function () {
  await this.deleteMany({ name: /test_root_layer/ });
};
const Layer = mongoose.model('Layer', layerSchema);
const File = mongoose.model('File', fileSchema);

module.exports = { File, Layer, editFileFields, viewFileFields, viewFileFieldsFull, tags };
