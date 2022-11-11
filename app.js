const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { UserRouter } = require('./resources/user/userController.js');
const { FileRouter } = require('./resources/file/fileController.js');
const { mapKeysToCamelCase } = require('./utils/stringUtils');
const { Server } = require('socket.io');
const http = require('http');
const {
  onLayerPosition,
  handleDisconnect,
  emitChangesSaved,
  onJoinRoom,
  onLeaveRoom,
} = require('./resources/user/userSocketController');

dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

// Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN, credentials: true } });

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

// WebSocket server
io.on('connection', (socket) => {
  console.log('a user connected');

  // Event listeners
  socket.on('joinRoom', (data) => onJoinRoom(socket, data));
  socket.on('leaveRoom', (data) => onLeaveRoom(socket, data));
  socket.on('layerPosition', (data) => onLayerPosition(socket, data));
  socket.on('disconnect', () => handleDisconnect());

  // Emitters
  emitChangesSaved(socket);
});

module.exports = { app: server };
