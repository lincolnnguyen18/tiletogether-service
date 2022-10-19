const { Schema } = require('mongoose');
const { faker } = require('@faker-js/faker');
const _ = require('lodash');
const mongoose = require('mongoose');

const tags = ['furniture', 'trees', 'buildings', 'vehicles', 'people', 'animals', 'plants', 'food', 'weapons', 'misc'];
const tileSizes = [16, 32, 64, 128, 256];

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
  authorUsername: { type: String, required: true },
  comments: [new Schema({
    authorUsername: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  })],
  createdAt: { type: Date, default: Date.now, required: true },
  height: { type: Number, required: true, min: 1 },
  imageUrl: String,
  likes: { type: Number, default: 0, required: true, min: 0 },
  name: { type: String, required: true },
  rootLayer: { type: Schema.Types.ObjectId, ref: 'Layer' },
  sharedWith: [String],
  tags: [String],
  tileDimension: { type: Number, required: true },
  tilesets: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  type: { type: String, required: true, enum: ['map', 'tileset'] },
  updatedAt: { type: Date, default: Date.now, required: true },
  visibility: { type: String, required: true, enum: ['public', 'private'] },
  width: { type: Number, required: true, min: 1 },
});

fileSchema.statics.newTestFile = async function (authorUsername) {
  const createdAt = faker.date.past();
  const updatedAt = faker.date.between(createdAt, new Date());

  return {
    name: faker.random.words(_.random(1, 5)) + '_test_file',
    authorUsername,
    tileDimension: _.sample(tileSizes),
    tags: _.sampleSize(tags, _.random(1, 4)),
    createdAt,
    updatedAt,
    rootLayer: (await Layer.create({ name: faker.random.words(_.random(1, 5)), type: 'group' }))._id,
    type: _.sample(['map', 'tileset']),
    visibility: _.sample(['public', 'private']),
    width: _.random(1, 100),
    height: _.random(1, 100),
  };
};

fileSchema.statics.deleteTestFiles = async function () {
  await this.deleteMany({ name: /_test_file/ });
};

const Layer = mongoose.model('Layer', layerSchema);
const File = mongoose.model('File', fileSchema);

module.exports = { fileSchema, File };
