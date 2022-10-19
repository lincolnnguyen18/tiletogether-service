const { identifyIfLoggedIn, isNotLoggedIn } = require('./userMiddleWare.js');
const express = require('express');
const { User } = require('./userSchema.js');
const { mapErrors } = require('../../utils/errorUtils');

const UserRouter = express.Router();

UserRouter.get('/', identifyIfLoggedIn, getUser);
UserRouter.post('/', isNotLoggedIn, postUser);
UserRouter.delete('/', deleteUser);

async function getUser (req, res) {
  const { email, password } = req.query;
  if (email != null && password != null) {
    try {
      const userObject = await User.authenticate(email, password);
      if (userObject) {
        req.user = userObject.user;
        res.json({
          message: 'Login successful',
          token: userObject.generateAuthToken(),
          username: userObject.username,
          email: userObject.email,
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    if (req.user != null) {
      res.json({ username: req.user.username, email: req.user.email });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}

function deleteUser (req, res) {
  const { email, password } = req.query;
  User.authenticate(email, password)
    .then(user => {
      if (user) {
        user.remove();
        res.json({ message: 'Deregisration successful' });
      } else {
        res.status(401).json({ error: 'User not found' });
      }
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
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

  const user = await User.create({ username, password, email })
    .catch(err => {
      errors = mapErrors(err.errors, errors);
    });

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ errors });
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
