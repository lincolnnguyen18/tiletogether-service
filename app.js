import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { UserRouter } from './resources/user/userController.js';
import { FileRouter } from './resources/file/fileController.js';

dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

export const app = express();
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', UserRouter);
app.use('/api/files', FileRouter);

app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

// TODO: decide to serve static assets from service directly or use S3/CloudFront
// app.use(express.static('../client/build'));
// app.get('*', (_, res) => {
//   res.sendFile('index.html', { root: '../client/build' });
// });
