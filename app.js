const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { UserRouter } = require('./resources/user/userController');
dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

const app = express();
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', UserRouter);

app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

module.exports = { app };
