const { identifyIfLoggedIn, isNotLoggedIn } = require('./userMiddleWare.js');
const express = require('express');
const { User } = require('./userSchema.js');
const { mapErrors, handleError } = require('../../utils/errorUtils');
const { addPendingEmail, getPendingEmail, clearExpired, sendSESEmail, verifyUserEmail } = require('../../utils/emailUtils.js');

const UserRouter = express.Router();

UserRouter.get('/', identifyIfLoggedIn, getUser);
UserRouter.post('/', isNotLoggedIn, postUser);
UserRouter.post('/sendemail', isNotLoggedIn, sendEmail);
UserRouter.post('/password', isNotLoggedIn, resetPassword);
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

async function sendEmail (req, res) {
  const { email } = req.body;
  if (!email) {
    handleError(res, 401, { email: 'Email address can not be empty' });
    return;
  }

  const user = await User.findOne({ email }).catch(() => null);
  if (!user) {
    handleError(res, 401, { email: 'Email address does not exist' });
    return;
  }

  const hash = addPendingEmail(email);
  const url = `${process.env.CLIENT_ORIGIN}/users/password/${hash}`;

  sendSESEmail(process.env.SES_SENDER_EMAIL, email, url, (_, err) => { // Ignore the first parameter(data): it's a message id
    if (err !== null) {
      handleError(res, 401, { email: 'Invalid Email Address! Failed to send an email' });
      return;
    }
    res.json('Email Sent Succefully');
  });
}

async function resetPassword (req, res) {
  const { password, confirmPassword, hash } = req.body;

  if (password !== confirmPassword) {
    handleError(res, 401, { confirmPassword: 'Passwords do not match' });
    return;
  }

  const email = getPendingEmail(hash);
  if (!email) {
    handleError(res, 401, { confirmPassword: 'Link is expired' });
    return;
  }

  const updateRes = await User.updateOne({ email: { $eq: email } }, { password }, { runValidators: true }).catch(err => err);
  if (updateRes.errors) {
    handleError(res, 400, mapErrors(updateRes.errors));
    return;
  }
  clearExpired(hash);

  res.json('Password Set Successfully');
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

  if (password !== confirmPassword) {
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

  // Only verify email with AWS ses when email passes validator in User Schema
  try {
    await verifyUserEmail(email);
  } catch (err) {
    errors.email = 'Failed to verify email';
    handleError(res, 400, errors);
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
