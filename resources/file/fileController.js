const express = require('express');
const { identifyIfLoggedIn, isLoggedIn } = require('../user/userMiddleWare');
const { File } = require('./fileSchema.js');
const { handleError, mapErrors } = require('../../utils/errorUtils');
const _ = require('lodash');
const { mapKeysToCamelCase } = require('../../utils/stringUtils');
const { editFileFields, viewFileFields } = require('./fileSchema');

const FileRouter = express.Router();

// search files
FileRouter.get('/', identifyIfLoggedIn, getFiles);
// get a file to view
FileRouter.get('/:id', getFileToView);
// get a file to edit
FileRouter.get('/:id/edit', isLoggedIn, getFileToEdit);
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

async function getFiles (req, res) {
  req.query = mapKeysToCamelCase(req.query);
  const { keywords, lastId, lastComment, lastLikes, lastPublish, lastUpdate } = req.query;

  const query = {};

  if (keywords != null) {
    query.$text = { $search: keywords };
  }

  ['tileDimension', 'type', 'width', 'height', 'authorUsername', 'visibility'].forEach(key => {
    if (req.query[key] != null) {
      query[key] = req.query[key];
    }
  });

  if (lastId != null) query._id = { $lt: lastId };
  if (lastComment != null) query.commentCount = getPagingCondition(lastComment);
  if (lastLikes != null) query.likeCount = getPagingCondition(lastLikes);
  if (lastPublish != null) query.createdAt = getPagingCondition(lastPublish);
  if (lastUpdate != null) query.updatedAt = getPagingCondition(lastUpdate);

  const sortCondition = [];
  ['commentCount', 'likeCount', 'createdAt', 'updatedAt'].forEach(sortKey => {
    if (req.query[sortKey] != null) {
      sortCondition.push([sortKey, req.query[sortKey]]);
    }
  });
  sortCondition.push(['_id', -1]);
  const files = await File.find(query)
    .sort(sortCondition)
    .limit(10)
    .select(viewFileFields.join(' '))
    .catch(() => []);

  res.json({ files });
}

async function getFileToView (req, res) {
  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  const pickedFile = _.pick(file, viewFileFields);
  res.json({ file: pickedFile });
}

async function getFileToEdit (req, res) {
  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  if (file.authorUsername !== req.user.username && !file.sharedWith.includes(req.user.username)) {
    handleError(res, 403);
    return;
  }

  const pickedFile = _.pick(file, editFileFields);
  res.json({ file: pickedFile });
}

async function postFile (req, res) {
  let file = req.body;

  file.authorUsername = req.user.username;
  file = new File(file);
  const createRes = await File.create(file).catch(err => err);

  if (createRes.errors != null) {
    handleError(res, 400, mapErrors(createRes.errors));
    return;
  }

  const pickedFile = _.pick(file, editFileFields);
  res.json({ message: 'File created', file: pickedFile });
}

async function patchFile () {
  // TODO: implement
  throw new Error('Not implemented');
}

async function deleteFile () {
  // TODO: implement
  throw new Error('Not implemented');
}

async function setFileLike (req, res) {
  const { liked } = req.body;

  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  const currentlyLiked = file.likes.find(l => l.authorUsername === req.user.username) != null;

  if (liked === currentlyLiked) {
    handleError(res, 400, { liked: `File is already ${liked ? 'liked' : 'unliked'}` });
    return;
  }

  if (liked) {
    file.likes.push({ authorUsername: req.user.username, createdAt: Date.now() });
    req.user.likedFiles.push(file.id);
  } else if (!liked) {
    file.likes = file.likes.filter(like => like.authorUsername !== req.user.username);
    req.user.likedFiles.pull(file.id);
  }

  const saveRes = await Promise.all([file.save(), req.user.save()]).catch(() => {});
  if (saveRes.length === 0) {
    handleError(res, 500);
    return;
  }

  res.json({ message: 'Like set successfully' });
}

async function addCommentToFile (req, res) {
  const { content } = req.body;

  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  file.comments.push({ authorUsername: req.user.username, content, createdAt: Date.now() });

  const saveRes = await file.save().catch(() => {});
  if (saveRes == null) {
    handleError(res, 500);
    return;
  }

  res.json({ message: 'Comment added successfully' });
}

function getPagingCondition (condition) {
  const { direction, value } = JSON.parse(condition);
  return direction > 0 ? { $gte: value } : { $lte: value };
}

module.exports = { FileRouter };
