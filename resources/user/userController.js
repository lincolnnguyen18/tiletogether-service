const { identifyIfLoggedIn, isNotLoggedIn } = require('./userMiddleWare.js');
const express = require('express');
const { User } = require('./userSchema.js');
const { mapErrors, handleError } = require('../../utils/errorUtils');

const UserRouter = express.Router();

UserRouter.get('/', identifyIfLoggedIn, getUser);
UserRouter.post('/', isNotLoggedIn, postUser);
UserRouter.delete('/', deleteUser);

async function getUser (req, res) {
  const { email, password } = req.query;

  if (email == null || password == null) {
    if (req.user != null) {
      res.json({ username: req.user.username, email: req.user.email });
    } else {
      handleError(res, 401);
    }
    return;
  }

  const userInstance = await User.authenticate(email, password);
  if (userInstance == null) {
    handleError(res, 401);
    return;
  }

  req.user = userInstance.user;
  res.json({
    message: 'Login successful',
    token: userInstance.generateAuthToken(),
    username: userInstance.username,
    email: userInstance.email,
  });
}

async function deleteUser (req, res) {
  const { email, password } = req.query;

  const user = await User.authenticate(email, password);
  if (user == null) {
    handleError(res, 401);
    return;
  }
  user.remove();
  res.json({ message: 'Deregisration successful' });
}

async function postUser (req, res) {
  const { username, password, confirmPassword, email } = req.body;
  let errors = {};

  if (confirmPassword == null || confirmPassword.trim() === '') {
    errors.confirmPassword = 'Confirm password is required';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (await User.findOne({ username })) {
    errors.username = 'Username already exists';
  }

  if (await User.findOne({ email })) {
    errors.email = 'Email already in use';
  }

  if (Object.keys(errors).length > 0) {
    handleError(res, 400, errors);
    return;
  }

  const user = new User({ username, password, email });
  const createRes = await User.create(user).catch(err => err);
  errors = mapErrors(createRes.errors, errors);

  if (Object.keys(errors).length > 0) {
    handleError(res, 400, mapErrors(createRes.errors, errors));
    return;
  }

  req.user = user;
  res.json({
    message: 'Registration successful',
    token: user.generateAuthToken(),
    username: user.username,
    email: user.email,
  });
}

module.exports = { UserRouter };
