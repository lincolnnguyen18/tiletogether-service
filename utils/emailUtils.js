const { hashCode } = require('./stringUtils');
const AWS = require('aws-sdk');
// Set Region
AWS.config.update({ region: 'us-east-1' });

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
  delete pendingEmails[hash];
}

function sendSESEmail (from, to, url, callback) {
  // Create sendEmail params
  const params = {
    Destination: {
      CcAddresses: [],
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `<!DOCTYPE html>
                <html>
                <body>
                <h1>Your have requested to reset your password. Follow <a href="${url}">${url}</a> to reset your password. </h1>
                </body>
                </html>`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Your Password Reset Request For TileTogether',
      },
    },
    Source: from,
    ReplyToAddresses: [from],
  };

  // Create the promise and SES service object
  const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
  // Handle promise's fulfilled/rejected states
  sendPromise.then(data => callback(data, null)).catch(err => callback(null, err));
};

module.exports = { addPendingEmail, getPendingEmail, clearExpired, sendSESEmail };
