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
  let { keywords, continuationToken, authorUsername, limit, sortBy, mode } = req.query;
  continuationToken = continuationToken ? JSON.parse(continuationToken) : null;

  const findQuery = {};
  const sortByQuery = [];

  if (keywords != null) {
    findQuery.$text = { $search: keywords };
  }

  if ((mode === 'likes' || mode === 'shared') && req.user == null) {
    handleError(res, 401);
    return;
  }

  // mode
  if (mode === 'likes') {
    findQuery.likes = { $elemMatch: { username: req.user.username } };
  } else if (mode === 'shared') {
    findQuery.sharedWith = { $elemMatch: { $eq: req.user.username } };
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
      if (continuationToken != null) {
        findQuery.publishedAt = { $lt: continuationToken.publishedAt };
      }
      sortByQuery.push(['publishedAt', -1]);
      break;
    case 'update_date':
      if (continuationToken != null) {
        findQuery.updatedAt = { $lt: continuationToken.updatedAt };
      }
      sortByQuery.push(['updatedAt', -1]);
      break;
    case 'likes':
      if (continuationToken != null) {
        findQuery.likeCount = { $lt: continuationToken.likeCount };
      }
      sortByQuery.push(['likeCount', -1]);
      break;
    default:
      if ((authorUsername != null && req.user && authorUsername === req.user.username) || mode === 'shared') {
        sortByQuery.push(['updatedAt', -1]);
        if (continuationToken != null) {
          findQuery.updatedAt = { $lt: continuationToken.updatedAt };
        }
      } else {
        sortByQuery.push(['publishedAt', -1]);
        if (continuationToken != null) {
          findQuery.publishedAt = { $lt: continuationToken.publishedAt };
        }
      }
      break;
  }
  sortByQuery.push(['_id', -1]);

  // show private files only if
  // 1. user is logged in and is author OR
  // 2. mode is 'shared'
  // else
  if (!((mode === 'shared') || (req.user && authorUsername === req.user.username))) {
    if (findQuery.publishedAt == null) {
      findQuery.publishedAt = { $ne: null };
    } else {
      findQuery.publishedAt.$ne = null;
    }
  }

  const files = await File
    .find(findQuery)
    .sort(sortByQuery)
    .limit(limit ?? 10)
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

async function patchFile (req, res) {
  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  if (file.authorUsername !== req.user.username && !file.sharedWith.includes(req.user.username)) {
    handleError(res, 403);
    return;
  }

  const updateRes = await File.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).catch(err => err);
  if (updateRes.errors != null) {
    handleError(res, 400, mapErrors(updateRes.errors));
    return;
  }

  const pickedFile = _.pick(updateRes, editFileFields);
  res.json({ message: 'File updated', file: pickedFile });
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

  const currentlyLiked = await File.findOne({ _id: req.params.id, likes: { $elemMatch: { username: req.user.username } } }) != null;

  if (liked === currentlyLiked) {
    handleError(res, 400, { liked: `File is already ${liked ? 'liked' : 'unliked'}` });
    return;
  }

  try {
    if (liked) {
      await File.updateOne({ _id: req.params.id }, { $push: { likes: { username: req.user.username, createdAt: Date.now() } } });
    } else if (!liked) {
      await File.updateOne({ _id: req.params.id }, { $pull: { likes: { username: req.user.username } } });
    }
  } catch (err) {
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

  file.comments.push({ username: req.user.username, content, createdAt: Date.now() });

  const saveRes = await file.save().catch(() => {});
  if (saveRes == null) {
    handleError(res, 500);
    return;
  }

  res.json({ message: 'Comment added successfully' });
}

module.exports = { FileRouter };
