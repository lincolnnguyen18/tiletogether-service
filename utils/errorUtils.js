const _ = require('lodash');

function handleError (res, code, userMessage = null, internalMessage = null) {
  if (internalMessage) {
    console.error(internalMessage);
  }

  switch (code) {
    case 400:
      res.status(400).json({ error: userMessage || 'Bad request' });
      break;
    case 401:
      res.status(401).json({ error: userMessage || 'Unauthorized' });
      break;
    case 403:
      res.status(403).json({ error: userMessage || 'Forbidden' });
      break;
    case 404:
      res.status(404).json({ error: userMessage || 'Not found' });
      break;
    case 500:
      res.status(500).json({ error: userMessage || 'Internal server error' });
      break;
    default:
      res.status(code).json({ error: 'Unknown error' });
      break;
  }
}

function mapErrors (errors, errorsToMerge = {}) {
  const mappedErrors = _.mapValues(errors, e => e.message);
  return _.merge(mappedErrors, errorsToMerge);
}

module.exports = { handleError, mapErrors };
