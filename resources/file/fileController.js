const express = require('express');
const { identifyIfLoggedIn, isLoggedIn } = require('../user/userMiddleWare');
const { File } = require('./fileSchema.js');
const { handleError, mapErrors } = require('../../utils/errorUtils');
const _ = require('lodash');

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

async function getFiles () {
  throw new Error('Not implemented');
}

async function getFileToView (req, res) {
  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  const pickedFile = _.pick(file, ['id', 'authorUsername', 'comments', 'createdAt', 'height', 'imageUrl', 'name', 'tags', 'tileDimension', 'tilesets', 'type', 'updatedAt', 'width']);
  res.json({ file: pickedFile });
}

async function getFileToEdit () {
  throw new Error('Not implemented');
}

async function postFile (req, res) {
  const file = req.body;

  file.authorUsername = req.user.username;
  const fileInstance = new File(file);
  const createRes = await File.create(fileInstance).catch(err => err);

  if (createRes.errors != null) {
    handleError(res, 400, mapErrors(createRes.errors));
    return;
  }
  res.json({ message: 'File created', file: fileInstance });
}

async function patchFile () {
  throw new Error('Not implemented');
}

async function deleteFile () {
  throw new Error('Not implemented');
}

async function setFileLike (req, res) {
  const { liked } = req.body;

  const file = await File.findById(req.params.id);
  if (file == null) {
    handleError(res, 404);
    return;
  }

  if (liked) {
    file.likes.push({ authorUsername: req.user.username, createdAt: Date.now() });
  } else {
    file.likes = file.likes.filter(like => like.authorUsername !== req.user.username);
  }

  const saveRes = await file.save().catch(() => {});
  if (saveRes == null) {
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

module.exports = { FileRouter };
