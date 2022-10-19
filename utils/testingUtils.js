const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config({ path: './.env.testing' });

function wait (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT;
const BASE_URL = `http://localhost:${PORT}`;
const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

async function setupApp (app, mongoose) {
  const server = await app.listen(PORT);
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  return server;
}

async function teardownApp (server, mongoose) {
  await mongoose.connection.close();
  await server.close();
}

module.exports = {
  wait,
  apiClient,
  setupApp,
  teardownApp,
};
