function getSocketFileId (socket) {
  const rooms = Array.from(socket.rooms);
  // room 0 is the default room for every socket (the socket id)
  return rooms[1];
}

function handleSocketError (err) {
  console.log(err);
}

module.exports = {
  getSocketFileId,
  handleSocketError,
};
