const { hashCode } = require('./stringUtils');

const expirationTime = 60;
const pendingEmails = {};

function addPendingEmail (email) {
  const hash = hashCode(email);
  pendingEmails[hash] = email;
  setTimeout(clearExpired, expirationTime, hash);
  return hash;
}

function getPendingEmail (hash) {
  return pendingEmails[hash];
}

function clearExpired (hash) {
  pendingEmails[hash] = null;
}

module.exports = { addPendingEmail, getPendingEmail, clearExpired };
