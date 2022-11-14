const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIAX4X6VWC3BEZWRTBD',
    secretAccessKey: '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',
  },
});

module.exports = {
  s3Client,
};
