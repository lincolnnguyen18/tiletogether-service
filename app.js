const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const { UserRouter } = require('./resources/user/userController.js');
const { FileRouter } = require('./resources/file/fileController.js');
const { mapKeysToCamelCase } = require('./utils/stringUtils');
const { Server } = require('socket.io');
const http = require('http');
const { User } = require('./resources/user/userSchema');
const { File } = require('./resources/file/fileSchema');

dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });

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

function getSocketFileId (socket) {
  const rooms = Array.from(socket.rooms);
  // room 0 is the default room for every socket (the socket id)
  return rooms[1];
}

function handleSocketError (socket, err) {
  console.log(err);
  socket.disconnect();
}

async function socketJoin (socket, data) {
  const { token, fileId } = data;
  console.log('socketJoin', token, fileId);

  // verify socket has not already joined a room (socket.rooms should only have 1 room, the socket id)
  const rooms = Array.from(socket.rooms);
  if (rooms.length > 1) {
    handleSocketError(socket, 'Socket already editing a file');
    return;
  }

  // verify token
  const user = await User.findByToken(token);
  if (!user) {
    handleSocketError(socket, 'Invalid token');
    return;
  }

  // verify user has permission to edit file
  const file = await File.findById(fileId);
  const username = user.username;
  if (!file || (!file.sharedWith.includes(username) && !file.authorUsername === username)) {
    handleSocketError(socket, 'User does not have permission to edit file or file does not exist');
    return;
  }

  socket.join(fileId);
  console.log('socket joined room', fileId);
}

// force disconnect if socket is not in a room within 5 seconds
function onTimeout (socket) {
  setTimeout(() => {
    const rooms = Array.from(socket.rooms);
    if (rooms.length === 1) {
      handleSocketError(socket, 'Socket did not join a room');
    }
  }, 5000);
}

function onChangesSaved (socket) {
  // emit socketChangesSaved every n seconds
  const interval = setInterval(() => {
    // send to just this one socket
    socket.emit('socketChangesSaved');
  }, 1000);

  socket.on('disconnect', () => clearInterval(interval));
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('socketJoin', (data) => socketJoin(socket, data));

  onTimeout(socket);
  onChangesSaved(socket);

  socket.on('socketUpdateLayerPosition', (data) => {
    const fileId = getSocketFileId(socket);
    socket.to(fileId).emit('socketSynchronizeLayerPosition', data);
  });

  // socket.on('socketSendUnsavedChanges', (data) => {
  //   console.log('socketSendUnsavedChanges', data);
  // });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

module.exports = { app: server };
