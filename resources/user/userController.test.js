const mongoose = require('mongoose');
const { User } = require('./userSchema.js');
const _ = require('lodash');
const { apiClient, setupApp, teardownApp } = require('../../utils/testingUtils.js');
const { app } = require('../../app.js');
const { wait } = require('../../utils/testingUtils');

let user;
let server;

describe('Connect to MongoDB', () => {
  beforeAll(async () => {
    server = await setupApp(app, mongoose);
  });

  afterAll(async () => {
    await User.deleteOne({ username: user.username });
    await teardownApp(server, mongoose);
  });

  beforeEach(async () => {
    user = {
      username: 'valid_username',
      password: 'valid_password',
      confirmPassword: 'valid_password',
      email: 'valid@email.com',
    };
    await User.deleteMany({ $or: [{ username: user.username }, { email: user.email }] });
  });

  describe('User API lets user', () => {
    test('register', async () => {
      const res = (await apiClient.post('/users', user)).data;
      expect(await User.findOne({ username: user.username })).not.toBeNull();
      expect(res.token).not.toBeNull();
      expect(res.username).toBe(user.username);
      expect(res.email).toBe(user.email);
    });

    test('login and get token', async () => {
      await User.create(user);
      const res = (await apiClient.get('/users', {
        params: {
          email: user.email,
          password: user.password,
        },
      })).data;
      expect(await User.findByToken(res.token)).not.toBeNull();
      const compareAttributes = (object) => _.pick(object, ['username', 'email']);
      expect(compareAttributes(res)).toEqual(compareAttributes(user));
    });

    test('login using token', async () => {
      const userObject = await User.create(user);
      const token = userObject.generateAuthToken();
      const res = (await apiClient.get('/users', {
        headers: {
          withCredentials: true,
          Authorization: `Bearer ${token}`,
        },
      })).data;
      expect(res).toEqual({ username: user.username, email: user.email });
    });

    test('deregister', async () => {
      await User.create(user);
      await apiClient.delete('/users', {
        params: {
          email: user.email,
          password: user.password,
        },
      });
      await wait(100);
      expect(await User.findOne({ username: user.username })).toBeNull();
    });
  });

  describe('User API does not let user', () => {
    test('deregister non-existent user', async () => {
      try {
        await apiClient.delete('/users', {
          params: {
            email: user.email,
            password: user.password,
          },
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(401);
      }
    });

    test('login with invalid credentials', async () => {
      await User.create(user);
      try {
        await apiClient.get('/users', {
          params: {
            email: user.email,
            password: 'invalid_password',
          },
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(401);
      }
    });

    test('login using invalid token', async () => {
      try {
        await apiClient.get('/users', {
          headers: {
            withCredentials: true,
            Authorization: 'Bearer invalid_token',
          },
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(401);
      }
    });

    test.each([
      ['username', ''],
      ['password', ''],
      ['confirmPassword', ''],
      ['email', ''],
    ])('register with empty %s', async (field, value) => {
      user[field] = value;
      try {
        await apiClient.post('/users', user);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(400);
      }
    });

    test('register with mismatched passwords', async () => {
      user.confirmPassword = 'mismatching_password';
      try {
        await apiClient.post('/users', user);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.error.confirmPassword).toBe('Passwords do not match');
      }
    });

    test('register with invalid email', async () => {
      user.email = 'invalid_email';
      try {
        await apiClient.post('/users', user);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.error.email).toBe('Invalid email');
      }
    });

    test('register with existing username and email', async () => {
      await User.create(user);
      try {
        await apiClient.post('/users', user);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.error).toEqual({
          username: 'Username already exists',
          email: 'Email already in use',
        });
      }
    });

    test('register with username containing invalid characters', async () => {
      user.username = 'invalid username!';
      try {
        await apiClient.post('/users', user);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.error.username).toBe('Username can only contain lowercase alphanumeric characters and underscores');
      }
    });

    test('register with username with less than 3 characters', async () => {
      user.username = 'ab';
      try {
        await apiClient.post('/users', user);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.response.status).toBe(400);
        expect(err.response.data.error.username).toBe('Username must be at least 3 characters long');
      }
    });
  });
});
