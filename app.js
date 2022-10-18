import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { UserRouter } from './resources/user/userController.js';
dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', UserRouter);
app.use('/api/files', UserRouter);

app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

module.exports = app;
