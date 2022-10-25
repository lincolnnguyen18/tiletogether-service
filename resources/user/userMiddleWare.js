const { User } = require('./userSchema.js');
const { handleError } = require('../../utils/errorUtils');

async function isNotLoggedIn (req, res, next) {
  if (req.headers.authorization == null) {
    next();
    return;
  }
  const token = req.headers.authorization.replace('Bearer ', '');
  if (token) {
    const user = await User.findByToken(token);
    if (user) {
      handleError(res, 403);
    } else {
      next();
    }
  } else {
    next();
  }
}

async function isLoggedIn (req, res, next) {
  if (req.headers.authorization == null) {
    handleError(res, 403);
    return;
  }
  const token = req.headers.authorization.replace('Bearer ', '');
  if (token) {
    const user = await User.findByToken(token);
    if (user) {
      req.user = user;
      next();
      return;
    }
  }
  handleError(res, 403);
}

async function identifyIfLoggedIn (req, _, next) {
  if (req.headers.authorization == null) {
    next();
    return;
  }
  const token = req.headers.authorization.replace('Bearer ', '');
  if (token) {
    const user = await User.findByToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}

module.exports = { isNotLoggedIn, isLoggedIn, identifyIfLoggedIn };
