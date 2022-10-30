const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { UserRouter } = require('./resources/user/userController.js');
const { FileRouter } = require('./resources/file/fileController.js');
const { mapKeysToCamelCase } = require('./utils/stringUtils');

dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function convertQueryParamsToCamelCase (req, _, next) {
  if (req.query) {
    req.query = mapKeysToCamelCase(req.query);
  }
  next();
}

app.use('/api/users', convertQueryParamsToCamelCase, UserRouter);
app.use('/api/files', convertQueryParamsToCamelCase, FileRouter);

app.get('/api/health', (_, res) => {
  res.status(200).send('OK');
});

module.exports = { app };
