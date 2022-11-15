const { getSocketFileId, handleSocketError } = require('../../utils/socketUtils');
const { s3Client } = require('../../utils/s3Utils');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Layer, File } = require('./fileSchema');
const _ = require('lodash');

function onLayerPosition (socket, data) {
  const fileId = getSocketFileId(socket);
  socket.to(fileId).emit('layerPosition', data);
}

async function onLayerUpdates (socket, data) {
  const fileId = getSocketFileId(socket);
  if (!fileId) handleSocketError('Socket is not editing a file');
  const { newRootLayer, canvasUpdates, layerIds, newImage } = data;
  // console.log(data);

  const file = await File.findById(fileId).catch(() => null);
  const currentLayerIds = file.layerIds;
  if (!file) handleSocketError('File does not exist');
  // console.log('file', file);

  for (const layerId of Object.keys(canvasUpdates)) {
    const arrayBuffer = canvasUpdates[layerId];
    const key = `${fileId}/${layerId}.png`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: arrayBuffer,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command).catch((err) => handleSocketError(err));
    // console.log(`saved layer into s3 bucket with key ${key}`);
  }

  // detect deleted layers and delete them from s3
  const deletedLayerIds = currentLayerIds.filter((id) => !layerIds.includes(id));
  // console.log('deletedLayerIds', deletedLayerIds);

  // delete deleted layers from s3
  for (const layerId of deletedLayerIds) {
    const key = `${fileId}/${layerId}.png`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    };
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command).catch((err) => handleSocketError(err));
    // console.log(`deleted layer from s3 bucket with key ${key}`);
  }

  await Layer.findOneAndReplace({ _id: newRootLayer._id }, newRootLayer, { runValidators: true, new: true }).catch((err) => handleSocketError(err));
  // update file layerIds if currentLayerIds not equal to layerIds
  if (_.isEqual(currentLayerIds, layerIds)) {
    // console.log('no changes to layerIds');
  } else {
    await File.findByIdAndUpdate(fileId, {
      layerIds,
      updatedAt: Date.now(),
    }, { runValidators: true, new: true }).catch((err) => handleSocketError(err));
    // console.log('updated file layerIds');
  }

  // update file image
  if (newImage) {
    const key = `${fileId}/image.png`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: newImage,
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command).catch((err) => handleSocketError(err));
    // console.log(`saved image into s3 bucket with key ${key}`);
  }

  socket.emit('changesSaved', { fileId });
}

module.exports = {
  onLayerPosition,
  onLayerUpdates,
};
