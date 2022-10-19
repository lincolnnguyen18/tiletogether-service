const express = require('express');
const { Schema } = require('mongoose');
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

async function setFileLike (req, res) {
  const { id, likedByUser } = req.body;

  const handleError = function (err) {
    res.status(400).json({ err });
  };
  const Like = new Schema({
    index: { type: Number, required: true },
    tileset: { type: Schema.Types.ObjectId, ref: 'File', required: true },
  });

  const like = await Like.create({ likedByUser }, handleError);

  File.update(
    { _id: id },
    { $push: { likes: like } },
    handleError,
  );

  res.json({
    message: 'Like created successfully',
    id,
    likedByUser: like.authorUsername,
  });
}

async function addCommentToFile (req, res) {
  const { id, author, content } = req.body;

  const handleError = function (err) {
    res.status(400).json({ err });
  };

  const Comment = new Schema({
    authorUsername: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  });

  const comment = await Comment.create({ author, content }, handleError);

  File.update(
    { _id: id },
    { $push: { comments: comment } },
    handleError,
  );

  res.json({
    message: 'Comment created successfully',
    id,
    comment: comment.content,
  });
}

module.exports = { FileRouter };
