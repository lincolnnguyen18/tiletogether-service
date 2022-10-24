const { Schema } = require('mongoose');
const { faker } = require('@faker-js/faker');
const _ = require('lodash');
const mongoose = require('mongoose');

const tags = ['furniture', 'trees', 'buildings', 'vehicles', 'people', 'animals', 'plants', 'food', 'weapons', 'misc'];
const tileDimensions = [16, 32, 64, 128, 256];

const editFileFields = ['id', 'height', 'name', 'rootLayer', 'sharedWith', 'tags', 'tileDimension', 'tilesets', 'type', 'publishedAt', 'width'];
const viewFileFields = ['id', 'authorUsername', 'comments', 'likeCount', 'commentCount', 'height', 'name', 'tags', 'tileDimension', 'tilesets', 'type', 'updatedAt', 'width', 'publishedAt'];

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
  type: { type: String, required: true, enum: ['tilelayer', 'group'] },
  visible: { type: Boolean, default: true, required: true },
});
layerSchema.add({ layers: [{ type: layerSchema }] });

layerSchema.methods.newRandomLayer = function () {
  return new this({
    name: faker.random.words(_.random(1, 5)),
  });
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

  return {
    name: faker.random.words(_.random(1, 5)) + '_test_file',
    authorUsername,
    tileDimension,
    tags: _.sampleSize(tags, _.random(1, 4)).join(' '),
    createdAt,
    updatedAt,
    rootLayer: (await Layer.create({ name: faker.random.words(_.random(1, 5)), type: 'group' }))._id,
    type: _.sample(['map', 'tileset']),
    publishedAt: _.sample([null, faker.date.between(createdAt, updatedAt)]),
    width: _.random(1, 50) * tileDimension,
    height: _.random(1, 50) * tileDimension,
    likeCount: _.random(0, 100),
    commentCount: _.random(0, 100),
  };
};

fileSchema.statics.deleteTestFiles = async function () {
  await this.deleteMany({ name: /_test_file/ });
};

const Layer = mongoose.model('Layer', layerSchema);
const File = mongoose.model('File', fileSchema);

module.exports = { File, Layer, editFileFields, viewFileFields, tags };
