const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAX4X6VWC3FTYWGOHV',
    secretAccessKey: '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',
  },
});

module.exports = {
  s3Client,
};
