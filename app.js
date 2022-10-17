import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

export const app = express();
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use(express.static('../client/build'));
app.get('*', (_, res) => {
  res.sendFile('index.html', { root: '../client/build' });
});
