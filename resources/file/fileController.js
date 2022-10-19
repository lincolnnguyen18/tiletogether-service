import express from 'express';
import { File, Like, Comment } from './fileSchema.js';

export const FileRouter = express.Router();

/* FileRouter.post('/', getCommunityFiles);
FileRouter.get('/search/', search);
FileRouter.get('/user', getUserFiles);

async function getCommunityFiles (req, res) {

}

async function search (req, res) {

}

async function getUserFiles (req, res) {

} */

FileRouter.post('/', postFileLike);
FileRouter.post('/', postFileComment);

async function postFileLike (req, res) {
  const { id, likedByUser } = req.body;

  const handleError = function (err) {
    res.status(400).json({ err });
  };

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

async function postFileComment (req, res) {
  const { id, author, content } = req.body;

  const handleError = function (err) {
    res.status(400).json({ err });
  };

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
