const { hashCode } = require('./stringUtils');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const expirationTime = 60000;
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

const sesClient = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIA2MWUFZKM6UC5E47E',
    secretAccessKey: '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',
  },
});

function sendSESEmail (from, to, url, callback) {
  // Create sendEmail params
  const command = new SendEmailCommand({
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
                <p>Dear TileTogether User, </p>
                <br>
                <p>We have received a request from you to reset your password. Please follow the link below to change your password:</p>
                <br>
                <a href="${url}">${url}</a>
                <br>
                <p>If you did not request this password change, please ignore this email.</p>
                <br>
                <p>Thank You</p>
                <br>
                <p>Your Friends At TileTogether</p>
                </body>
                </html>`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'TileTogether - We Have Received A Password Reset Request From You',
      },
    },
    Source: from,
    ReplyToAddresses: [from],
  });

  sesClient.send(command)
    .then((data) => {
      callback(data, null);
    })
    .catch((error) => {
      callback(null, error);
    });
};

module.exports = { addPendingEmail, getPendingEmail, clearExpired, sendSESEmail };
