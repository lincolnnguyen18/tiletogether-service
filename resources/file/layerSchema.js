import mongoose, { Schema } from 'mongoose';

const tileSchema = new Schema({
  index: {
    type: Number,
    required: [true, 'Tile index is required'],
    default: -1,
  },
  tileset: {
    type: mongoose.ObjectId,
    required: [true, 'Tileset reference is required'],
    ref: 'File',
  },
});

const LayerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Layer name is required'],
  },
  opacity: {
    type: Number,
    required: [true, 'Layer opacity is required'],
    default: 1,
    min: 0,
    max: 1,
  },
  tiles: {
    type: [tileSchema],
    required: [true, 'Tiles are required'],
  },
  type: {
    type: String,
    required: [true, 'Layer type is required'],
    enum: ['tileLayer', 'group'],
    default: 'tileLayer',
  },
  visible: {
    type: Boolean,
    required: [true, 'Layer visibility is required'],
    default: true,
  },
});

const Layer = mongoose.model('Layer', LayerSchema);

module.exports = { LayerSchema, Layer };
