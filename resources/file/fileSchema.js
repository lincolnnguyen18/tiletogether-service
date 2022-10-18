const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommentSchema = new Schema({
  authorUsername: {
    type: String,
    required: [true, 'Authoer\'s username is required'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase alphanumeric characters and underscores'],
    minLength: [3, 'Username must be at least 3 characters long'],
    maxLength: [20, 'Username can be at most 20 characters long'],
    set: v => v.toLowerCase(),
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    minLength: [1, 'Content must not be empty'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FileSchema = new Schema({
  authorUsername: {
    type: String,
    required: [true, 'Authoer\'s username is required'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase alphanumeric characters and underscores'],
    minLength: [3, 'Username must be at least 3 characters long'],
    maxLength: [20, 'Username can be at most 20 characters long'],
    set: v => v.toLowerCase(),
  },
  name: {
    type: String,
    required: [true, 'File name is required'],
  },
  comments: {
    type: [CommentSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    minimum: 1,
  },
  witdth: {
    type: Number,
    required: [true, 'Width is required'],
    minimum: 1,
  },
  imageUrl: {
    type: String,
  },
  rootLayer: {
    type: [mongoose.ObjectId],
    ref: 'Layer'
  },
  sharedWith: {
    type: [String],
  },
  tags: {
    type: [String],
  },
  tileDimension: {
    type: Number,
    required: [true, 'Height is required'],
    min: 1,
  },
  tilesets: {
    type: [mongoose.ObjectId],
    ref: 'File'
  },
  type: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['map', 'tileset'],
    default: 'map'
  },
  visibility: {
    type: String,
    required: [true, 'File visibility is required'],
    enum: ['public', 'private'],
    default: 'private'
  },
});

const File = mongoose.model('File', FileSchema);

module.exports = { FileSchema, File };
