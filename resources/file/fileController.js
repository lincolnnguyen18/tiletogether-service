const express = require('express');
const { identifyIfLoggedIn, isLoggedIn } = require('../user/userMiddleWare');
const { File, viewFileFieldsFull, editFileFields, viewFileFields, Layer } = require('./fileSchema');
const { handleError, mapErrors } = require('../../utils/errorUtils');
const _ = require('lodash');
const { User } = require('../user/userSchema');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../../utils/s3Utils');
const { GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const FileRouter = express.Router();

// search files
FileRouter.get('/', identifyIfLoggedIn, getFiles);
// get a file to view
FileRouter.get('/:id', getFileToView);
// get a file to edit
FileRouter.get('/:id/edit', isLoggedIn, getFileToEdit);
// get file recommendations
FileRouter.get('/:id/recommend', identifyIfLoggedIn, getFileRecommendations);
// create a file
FileRouter.post('/', isLoggedIn, postFile);
// update a file
FileRouter.patch('/:id', isLoggedIn, patchFile);
// delete a file
FileRouter.delete('/:id', isLoggedIn, deleteFile);

// set like for a file
FileRouter.post('/:id/like', isLoggedIn, setFileLike);
// add comment to a file
FileRouter.post('/:id/comment', isLoggedIn, addCommentToFile);
// add like for a comment
FileRouter.post('/:id/:comment_id/like', isLoggedIn, setCommentLike);

async function getFiles (req, res) {
  // query = { keywords, tile_dimension, type, sort_by, mode, limit, authorUsername }
  let { keywords, limit, page, sortBy, mode } = req.query;

  const findQuery = {};
  const sortByQuery = [];

  if (keywords != null) {
    findQuery.$text = { $search: keywords };
  }

  if ((mode === 'likes' || mode === 'shared' || mode === 'your_files') && req.user == null) {
    handleError(res, 401);
    return;
  }

  // mode
  if (mode === 'likes') {
    findQuery.likes = { $elemMatch: { username: req.user.username } };
  } else if (mode === 'shared') {
    findQuery.sharedWith = { $elemMatch: { $eq: req.user.username } };
  }

  if (mode === 'your_files') {
    findQuery.authorUsername = req.user.username;
  }

  // filters
  ['tileDimension', 'type', 'authorUsername'].forEach(key => {
    if (req.query[key] != null) {
      findQuery[key] = req.query[key];
    }
  });

  // sort by's
  switch (sortBy) {
    case 'publish_date':
      sortByQuery.push(['publishedAt', -1]);
      break;
    case 'update_date':
      sortByQuery.push(['updatedAt', -1]);
      break;
    case 'likes':
      sortByQuery.push(['likeCount', -1]);
      break;
    default:
      if (mode === 'shared' || mode === 'your_files') {
        sortByQuery.push(['updatedAt', -1]);
      } else {
        sortByQuery.push(['publishedAt', -1]);
      }
      break;
  }
  sortByQuery.push(['_id', -1]);

  if (mode !== 'shared' && mode !== 'your_files') {
    _.set(findQuery, 'publishedAt.$ne', null);
  }

  limit = limit == null ? 10 : parseInt(limit);
  page = page == null ? 1 : parseInt(page);
  const skip = (page - 1) * limit;

  let files = await File
    .find(findQuery)
    .sort(sortByQuery)
    .skip(skip)
    .limit(limit)
    .select(viewFileFields.join(' '))
    .catch(() => []);

  // get pre-signed urls for file images
  // TODO: use cloudfront to cache images and get presigned urls from cloudfront not s3
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
    files = await Promise.all(files.map(async file => {
      const imageUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${file._id}/image.png`,
      }), { expiresIn: 60 * 60 });
      return { ...file.toObject(), imageUrl };
    }));
  }

  res.json({ files });
}

async function getFileRecommendations (req, res) {
  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  let { limit, page } = req.query;

  const findQuery = {
    $text: { $search: file.tags },
    _id: { $ne: file._id },
    publishedAt: { $ne: null },
  };

  limit = limit == null ? 10 : parseInt(limit);
  page = page == null ? 1 : parseInt(page);
  const skip = (page - 1) * limit;

  const files = await File
    .find(findQuery)
    .sort([['likeCount', -1], ['_id', -1]])
    .limit(limit)
    .skip(skip)
    .select(viewFileFields.join(' '))
    .catch(() => []);

  res.json({ files });
}

async function getFileToView (req, res) {
  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null || file.publishedAt == null) {
    handleError(res, 404);
    return;
  }

  // get pre-signed url for file
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
    file.imageUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `${file._id}/image.png`,
    }), { expiresIn: 60 * 60 });
  }

  await File.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });

  const pickedFile = _.pick(file, viewFileFieldsFull);
  res.json({ file: pickedFile });
}

async function getFileToEdit (req, res) {
  const file = await File.findById(req.params.id).populate('rootLayer').exec().catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  const hasAccess = (await File.countDocuments({
    _id: file._id,
    $or: [
      { authorUsername: req.user.username },
      { sharedWith: { $elemMatch: { $eq: req.user.username } } },
    ],
  }).catch(() => 0) === 1);

  if (!hasAccess) {
    handleError(res, 404);
    return;
  }

  const pickedFile = _.pick(file, editFileFields);
  const signedUrls = {};

  // TODO: use cloudfront to cache images and get presigned urls from cloudfront not s3
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
    // for tilesets only
    // get presigned urls for all layers
    if (file.type === 'tileset') {
      async function traverseLayer (layer) {
        // console.log('traversing layer', layer._id);
        const key = `${file._id}/${layer._id}.png`;
        // console.log('key', key);

        if (layer.type === 'layer') {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
          });
          signedUrls[layer._id] = await getSignedUrl(s3Client, command, { expiresIn: 60 * 60 });
          // console.log('got url', signedUrls[layer._id]);
          // console.log('signedUrls', signedUrls);
        } else if (layer.layers != null) {
          // traverse children and await for all of them
          await Promise.all(layer.layers.map(traverseLayer));
        }
      }
      await traverseLayer(pickedFile.rootLayer);
      // console.log('signedUrls', signedUrls);
    }

    // for maps only
    // get presigned url for all tilesets
    if (file.type === 'map') {
      await Promise.all(pickedFile.tilesets.map(async tileset => {
        const key = `${file._id}/${tileset.file}.png`;
        // console.log('key', key);
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        });
        signedUrls[tileset.file] = await getSignedUrl(s3Client, command, { expiresIn: 60 * 60 });
      }));
    }
  }

  res.json({ file: pickedFile, signedUrls });
}

async function postFile (req, res) {
  let file = req.body;

  // check if width * tileDimension or height * tileDimension is greater than 10,000 pixels
  const { width, height, tileDimension } = file;
  const errors = {};
  if (width != null && tileDimension != null) {
    if (width * tileDimension > 10000) {
      errors.width = 'Width cannot be greater than 10,000 pixels';
    }
    if (height * tileDimension > 10000) {
      errors.height = 'Height cannot be greater than 10,000 pixels';
    }
  }
  if (Object.keys(errors).length > 0) {
    handleError(res, 400, errors);
    return;
  }

  file.authorUsername = req.user.username;
  file = new File(file);
  const createRes = await File.create(file).catch(err => err);

  if (createRes.errors != null) {
    handleError(res, 400, mapErrors(createRes.errors));
    return;
  }

  // create rootLayer
  const rootLayer = await Layer.create({ name: 'root_layer', type: 'group' });
  const updatedFile = await File.findByIdAndUpdate(createRes._id, { rootLayer: rootLayer._id }, { new: true }).catch(() => null);

  res.json({ message: 'File created', fileId: updatedFile._id });
}

async function patchFile (req, res) {
  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  if (file.authorUsername !== req.user.username && !file.sharedWith.includes(req.user.username)) {
    handleError(res, 404);
    return;
  }

  const newSharedWith = req.body.sharedWith;

  if (newSharedWith != null) {
    if (file.authorUsername !== req.user.username) {
      handleError(res, 401, 'You cannot change the sharedWith field unless you are the original author');
      return;
    } else {
      // verify user not already shared with (sharedWith list is not unique)
      const alreadySharedWith = _.uniq(newSharedWith).length !== newSharedWith.length;
      if (alreadySharedWith) {
        handleError(res, 400, { sharedWith: 'You have already shared the file with this user' });
        return;
      }

      // verify user is not the author
      const isAuthor = newSharedWith.includes(req.user.username);
      if (isAuthor) {
        handleError(res, 400, { sharedWith: 'You cannot share the file with yourself' });
        return;
      }

      // get difference between old and new sharedWith
      const oldSharedWith = file.sharedWith;
      const addedSharedWith = _.difference(newSharedWith, oldSharedWith);

      // verify all added users exist
      const usersExist = await User.countDocuments({ username: { $in: addedSharedWith } }).catch(() => 0) === addedSharedWith.length;
      if (!usersExist) {
        handleError(res, 400, { sharedWith: 'Invalid username' });
        return;
      }
    }
  }

  // check if width * tileDimension or height * tileDimension is greater than 10,000 pixels
  const { width, height, tileDimension } = req.body;
  const errors = {};
  if (width != null && tileDimension != null) {
    if (width * tileDimension > 10000) {
      errors.width = 'Width cannot be greater than 10,000 pixels';
    }
    if (height * tileDimension > 10000) {
      errors.height = 'Height cannot be greater than 10,000 pixels';
    }
  }
  if (Object.keys(errors).length > 0) {
    handleError(res, 400, errors);
    return;
  }

  if (req.body.publishedAt != null) {
    if (file.authorUsername !== req.user.username) {
      handleError(res, 401, 'You cannot change the publishedAt field unless you are the original author');
      return;
    } else {
      if (!req.body.publishedAt) {
        req.body.publishedAt = null;
      // if publishedAt not already set, set it to now
      } else if (file.publishedAt == null) {
        req.body.publishedAt = Date.now();
      }
    }
  }

  if (req.body.description != null) {
    if (file.authorUsername !== req.user.username) {
      handleError(res, 401, 'You cannot change the description field unless you are the original author');
      return;
    }
  }

  if (req.body.tags != null) {
    if (file.authorUsername !== req.user.username) {
      handleError(res, 401, 'You cannot change the tags field unless you are the original author');
      return;
    }
  }

  let newTilesets;
  if (req.body.tilesets != null) {
    if (file.authorUsername !== req.user.username) {
      handleError(res, 401, 'You cannot change the tilesets field unless you are the original author');
      return;
    }

    // verify all tilesets are unique (fileIds are unique)
    const isUnique = _.uniq(req.body.tilesets.map(tileset => tileset.file)).length === req.body.tilesets.length;
    if (!isUnique) {
      handleError(res, 400, { tilesets: 'Tileset already added' });
      return;
    }

    // get difference between existing and new tilesets to determine which tilesets are new
    const oldTilesets = file.tilesets.map(tileset => tileset.file.toString());
    const givenTilesets = req.body.tilesets.map(tileset => tileset.file);
    const addedTilesets = _.difference(givenTilesets, oldTilesets);

    console.log('addTilesets', addedTilesets);

    // verify all new tilesets exist
    const tilesetsExist = await File.countDocuments({ _id: { $in: addedTilesets }, type: 'tileset' }).catch(() => false) === addedTilesets.length;
    if (!tilesetsExist) {
      handleError(res, 400, { tilesets: 'Invalid tileset' });
      return;
    }

    // determine deleted tilesets and delete them from s3
    const deletedTilesets = _.difference(oldTilesets, givenTilesets);
    console.log('deleteTilesets', deletedTilesets);
    await Promise.all(deletedTilesets.map(async tilesetId => {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `${file._id}/${tilesetId}.png`,
      });
      await s3Client.send(command);
    }));

    // for each tileset if name not given, use tileset name
    // also add imageUrl to tileset by duplicating the image in s3 and assigning a key of
    // maps/<fileId>/<tilesetFileId>.png
    newTilesets = await Promise.all(req.body.tilesets.map(async tileset => {
      const tilesetFile = await File.findById(tileset.file).catch(() => null);
      if (tilesetFile == null) {
        throw new Error('Invalid tileset');
      }

      // if new tileset, duplicate image in s3
      const key = `${file._id}/${tilesetFile._id}.png`;
      if (addedTilesets.includes(tilesetFile._id.toString())) {
        console.log('newKey', key);
        // use CopyObject to duplicate the tileset image in s3
        const copyCommand = new CopyObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          CopySource: `${process.env.AWS_S3_BUCKET}/${tilesetFile._id}/image.png`,
          Key: key,
        });
        await s3Client.send(copyCommand);
        console.log(`Copied ${tilesetFile._id}/image.png to ${key}`);
      }

      // get signed url for new tileset image
      const imageUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      }), { expiresIn: 60 * 60 });

      return {
        file: tileset.file,
        imageUrl,
        name: tileset.name || tilesetFile.name,
      };
    }));

    console.log('newTilesets', newTilesets);
  }

  // set req.body.tilesets to newTilesets but without imageUrl field (since this will be generated on demand using presigned urls)
  if (newTilesets != null) {
    req.body.tilesets = newTilesets.map(tileset => _.omit(tileset, 'imageUrl'));
  }

  let allowabledPatchFields;
  if (req.body.type === 'tileset') {
    allowabledPatchFields = ['name', 'width', 'height', 'tileDimension', 'sharedWith', 'publishedAt', 'description', 'tags'];
  } else {
    allowabledPatchFields = ['name', 'width', 'height', 'sharedWith', 'publishedAt', 'tilesets', 'description', 'tags'];
  }
  req.body = _.pick(req.body, allowabledPatchFields);

  // update file updatedAt field
  req.body.updatedAt = Date.now();
  console.log(req.body);

  const updateRes = await File.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).catch(err => err);
  if (updateRes.errors != null) {
    handleError(res, 400, mapErrors(updateRes.errors));
    return;
  }

  const pickedFile = _.pick(updateRes, editFileFields);
  // if newTilesets is defined, add imageUrl field to each tileset
  if (newTilesets != null) {
    pickedFile.tilesets = pickedFile.tilesets.map((tileset, i) => ({
      ...tileset.toObject(),
      imageUrl: newTilesets[i].imageUrl,
    }));
  }
  res.json({ message: 'File updated', file: pickedFile });
}

async function deleteFile (req, res) {
  const file = await File.findById(req.params.id).catch(() => null);

  if (file == null) {
    return handleError(res, 404);
  }

  await file.delete();
  const pickedFile = _.pick(file, viewFileFields);
  res.json({ file: pickedFile });
}

async function setFileLike (req, res) {
  const { liked } = req.body;

  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  try {
    if (liked) {
      await File.findByIdAndUpdate(req.params.id, { $push: { likes: { username: req.user.username, createdAt: Date.now() } }, $inc: { likeCount: 1 } }, { new: true });
    } else if (!liked) {
      await File.findByIdAndUpdate(req.params.id, { $pull: { likes: { username: req.user.username } }, $inc: { likeCount: -1 } }, { new: true });
    }
  } catch (err) {
    handleError(res, 500);
    return;
  }

  res.json({ message: 'File like set to ' + liked });
}

async function addCommentToFile (req, res) {
  const { content, parentId } = req.body;

  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }
  const comment = { username: req.user.username, content, createdAt: Date.now(), parentId };
  let editedFile;

  try {
    editedFile = await File.findByIdAndUpdate(req.params.id, { $push: { comments: { $each: [comment], $position: 0 } }, $inc: { commentCount: 1 } }, { new: true });
  } catch (err) {
    handleError(res, 500);
    return;
  }

  res.json({ file: editedFile });
}

async function setCommentLike (req, res) {
  const { liked } = req.body;

  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  try {
    if (liked) {
      await File.findOneAndUpdate({ _id: req.params.id, 'comments._id': req.params.comment_id }, { $push: { 'comments.$.likes': { username: req.user.username, createdAt: Date.now() } }, $inc: { 'comments.$.likeCount': 1 } }, { new: true });
    } else if (!liked) {
      await File.findOneAndUpdate({ _id: req.params.id, 'comments._id': req.params.comment_id }, { $pull: { 'comments.$.likes': { username: req.user.username } }, $inc: { 'comments.$.likeCount': -1 } }, { new: true });
    }
  } catch (err) {
    console.log(err);
    handleError(res, 500);
    return;
  }

  res.json({ message: 'Comment like set to ' + liked });
}

module.exports = { FileRouter };
