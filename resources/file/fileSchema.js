const { Schema } = require('mongoose');
const { faker } = require('@faker-js/faker');
const _ = require('lodash');
const mongoose = require('mongoose');
const { createRandomTree } = require('../../utils/treeUtils');

const tags = ['furniture', 'trees', 'buildings', 'vehicles', 'people', 'animals', 'plants', 'food', 'weapons', 'misc'];
const tileDimensions = [4, 8, 16, 32, 64];

const editFileFields = ['id', 'height', 'name', 'rootLayer', 'sharedWith', 'tags', 'tileDimension', 'tilesets', 'type', 'publishedAt', 'width'];
const viewFileFields = ['id', 'authorUsername', 'comments', 'likeCount', 'commentCount', 'height', 'name', 'tags', 'tileDimension', 'tilesets', 'type', 'updatedAt', 'width', 'publishedAt', 'likes'];

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
});
layerSchema.add({ layers: [{ type: layerSchema }] });

layerSchema.statics.newTestLayer = function () {
  return {
    name: faker.random.words(_.random(1, 5)) + ' test_layer',
  };
};

const fileSchema = Schema({
  authorUsername: { type: String, required: true, index: true },
  comments: [new Schema({
    username: { type: String, required: true, index: true },
    content: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  })],
  commentCount: { type: Number, min: 0, required: true, default: 0 },
  likes: [new Schema({
    username: { type: String, required: true, index: true },
    createdAt: { type: Date, required: true, default: Date.now },
  })],
  likeCount: { type: Number, min: 0, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now, required: true },
  height: { type: Number, min: 1, required: [true, 'Height is required'] },
  imageUrl: String,
  name: { type: String, required: [true, 'Name is required'] },
  rootLayer: { type: Schema.Types.ObjectId, ref: 'Layer' },
  sharedWith: [String],
  tags: { type: String, required: true, index: true },
  tileDimension: { type: Number, required: [true, 'Tile dimension is required'], index: true },
  tilesets: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  type: { type: String, required: true, enum: ['map', 'tileset'], index: true },
  updatedAt: { type: Date, default: Date.now, required: true },
  publishedAt: { type: Date, sparse: true },
  width: { type: Number, min: 1, required: [true, 'Width is required'] },
});

fileSchema.index({ authorUsername: 'text', name: 'text', tags: 'text' });

fileSchema.statics.newTestFile = async function (authorUsername) {
  const createdAt = faker.date.past();
  const updatedAt = faker.date.between(createdAt, new Date());
  const tileDimension = _.sample(tileDimensions);
  const width = _.random(1, 10);
  const height = _.random(1, 10);
  const type = _.sample(['map', 'tileset']);
  const rootLayer = await Layer.create({ name: 'test_root_layer', type: 'group' });

  rootLayer.layers = createRandomTree(3);
  await rootLayer.save();

  return {
    name: faker.random.words(_.random(1, 5)) + ' test file',
    authorUsername,
    tileDimension,
    tags: _.sampleSize(tags, _.random(1, 4)).join(' '),
    createdAt,
    updatedAt,
    rootLayer: rootLayer._id,
    type,
    publishedAt: _.sample([null, faker.date.between(createdAt, updatedAt)]),
    width,
    height,
    likeCount: _.random(0, 100),
    commentCount: _.random(0, 100),
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

module.exports = { File, Layer, editFileFields, viewFileFields, tags };
