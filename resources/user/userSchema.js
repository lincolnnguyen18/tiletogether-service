import bcrypt from 'bcrypt';
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';

function hashPassword (password) {
  if (password && password.length >= 8) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
  return password;
}

export const UserSchema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase alphanumeric characters and underscores'],
    minLength: [3, 'Username must be at least 3 characters long'],
    maxLength: [20, 'Username can be at most 20 characters long'],
    set: v => v.toLowerCase(),
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters long'],
    set: hashPassword,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
  },
});

UserSchema.statics.authenticate = function (email, password) {
  return this.findOne({ email })
    .then(user => {
      if (user && bcrypt.compareSync(password, user.password)) {
        return user;
      } else {
        return null;
      }
    });
};

UserSchema.statics.findByToken = function (token) {
  const secret = process.env.SECRET;
  try {
    const decoded = jwt.verify(token, secret);
    return this.findOne({ username: decoded.username });
  } catch (err) {
    return null;
  }
};

UserSchema.methods.generateAuthToken = function () {
  const payload = {
    username: this.username,
  };
  const secret = process.env.SECRET;
  const options = {
    expiresIn: '1d',
  };
  return jwt.sign(payload, secret, options);
};

export const User = mongoose.model('User', UserSchema);
