const { hashCode } = require('./stringUtils');
const { SESClient, VerifyEmailIdentityCommand, SendEmailCommand, VerifyDomainIdentityCommand } = require('@aws-sdk/client-ses');

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
    accessKeyId: 'AKIAX4X6VWC3FTYWGOHV',
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
                <p>We have received a request from you to reset your password. Please follow the link below to change your password:</p>
                <a href="${url}">${url}</a>
                <p>If you did not request this password change, please ignore this email.</p>
                <p>Sincerely,</p>
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
}

async function verifyUserEmail (email) {
  const command = new VerifyEmailIdentityCommand({ EmailAddress: email });
  return sesClient.send(command);
}

async function verifyEmailDomain (email) {
  const command = new VerifyDomainIdentityCommand({ Domain: email.split('@')[1] });
  return sesClient.send(command);
}

module.exports = { addPendingEmail, getPendingEmail, clearExpired, sendSESEmail, verifyUserEmail, verifyEmailDomain };
