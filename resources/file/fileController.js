const express = require('express');
const { identifyIfLoggedIn, isLoggedIn } = require('../user/userMiddleWare');
const { File } = require('./fileSchema.js');

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

async function getFileToView () {
  throw new Error('Not implemented');
}

async function getFileToEdit () {
  throw new Error('Not implemented');
}

async function postFile (req, res) {
  const file = req.body;
  file.authorUsername = req.user.username;
  const fileInstance = new File(file);
  File.create(fileInstance);
  res.json({ message: 'File created', file: fileInstance });
}

async function patchFile () {
  throw new Error('Not implemented');
}

async function deleteFile () {
  throw new Error('Not implemented');
}

async function setFileLike () {
  throw new Error('Not implemented');
}

async function addCommentToFile () {
  throw new Error('Not implemented');
}

module.exports = { FileRouter };
