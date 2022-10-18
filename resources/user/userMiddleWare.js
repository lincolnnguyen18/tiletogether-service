const { User } = require('./userSchema.js');

async function isNotLoggedIn (req, res, next) {
  if (req.headers.authorization == null) {
    next();
    return;
  }
  const token = req.headers.authorization.replace('Bearer ', '');
  if (token) {
    const user = await User.findByToken(token);
    if (user) {
      res.redirect('/');
    } else {
      next();
    }
  } else {
    next();
  }
}

async function isLoggedIn (req, res, next) {
  if (req.headers.authorization == null) {
    next();
    return;
  }
  const token = req.headers.authorization.replace('Bearer ', '');
  if (token) {
    const user = await User.findByToken(token);
    if (user) {
      req.user = user;
      next();
    }
  } else {
    res.redirect('/login');
  }
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
