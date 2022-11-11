const express = require('express');
const { identifyIfLoggedIn, isLoggedIn } = require('../user/userMiddleWare');
const { File, viewFileFieldsFull, editFileFields, viewFileFields } = require('./fileSchema');
const { handleError, mapErrors } = require('../../utils/errorUtils');
const _ = require('lodash');
const { User } = require('../user/userSchema');

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
// add reply to a comment
FileRouter.post('/:id/reply', isLoggedIn, addReplyToComment);

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

  const files = await File
    .find(findQuery)
    .sort(sortByQuery)
    .skip(skip)
    .limit(limit)
    .select(viewFileFields.join(' '))
    .catch(() => []);

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

  // update file updatedAt field
  req.body.updatedAt = Date.now();

  const updateRes = await File.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).catch(err => err);
  if (updateRes.errors != null) {
    handleError(res, 400, mapErrors(updateRes.errors));
    return;
  }

  const pickedFile = _.pick(updateRes, editFileFields);
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
  const { content } = req.body;

  const file = await File.findById(req.params.id).catch(() => null);
  if (file == null) {
    handleError(res, 404);
    return;
  }
  const comment = { username: req.user.username, content, createdAt: Date.now() };
  let editedFile;

  try {
    editedFile = await File.findByIdAndUpdate(req.params.id, { $push: { comments: { $each: [comment], $position: 0 } }, $inc: { commentCount: 1 } }, { new: true });
  } catch (err) {
    handleError(res, 500);
    return;
  }

  res.json({ file: editedFile });
}

async function addReplyToComment (req, res) {
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

module.exports = { FileRouter };
