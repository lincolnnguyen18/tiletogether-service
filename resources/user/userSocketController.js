const { User } = require('./userSchema');
const { File } = require('../file/fileSchema');
const { getSocketFileId } = require('../../utils/socketUtils');

function handleSocketError (err) {
  console.log(err);
}

async function onJoinRoom (socket, data) {
  const { token, fileId } = data;
  console.log('socketJoinRoom', token, fileId);

  // verify socket has not already joined a room (socket.rooms should only have 1 room, the socket id)
  const rooms = Array.from(socket.rooms);
  if (rooms.length > 1) {
    handleSocketError(`Socket already editing a file ${JSON.stringify(rooms)}`);
    return;
  }

  // verify token
  const user = await User.findByToken(token);
  if (!user) {
    handleSocketError('Invalid token');
    return;
  }

  // verify user has permission to edit file
  const file = await File.findById(fileId);
  const username = user.username;
  if (!file || (!file.sharedWith.includes(username) && !file.authorUsername === username)) {
    handleSocketError('User does not have permission to edit file or file does not exist');
    return;
  }

  socket.join(fileId);
  console.log(`${user.username} joined room ${fileId}`);
}

function onLeaveRoom (socket, data) {
  const fileId = getSocketFileId(socket);
  const { fileId: givenFileId } = data;
  if (fileId === givenFileId) {
    socket.leave(fileId);
    console.log('socket left room', fileId);
  } else {
    handleSocketError(`Socket is not editing file ${givenFileId}`);
  }
}

function onLayerPosition (socket, data) {
  const fileId = getSocketFileId(socket);
  socket.to(fileId).emit('layerPosition', data);
}

function handleDisconnect () {
  console.log('user disconnected');
}

function emitChangesSaved (socket) {
  // emit socketChangesSaved every n seconds
  const interval = setInterval(() => {
    // send to just this one socket
    socket.emit('changesSaved');
  }, 1000);

  socket.on('disconnect', () => clearInterval(interval));
}

module.exports = {
  onJoinRoom,
  onLeaveRoom,
  onLayerPosition,
  handleDisconnect,
  emitChangesSaved,
};
