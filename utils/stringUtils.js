const _ = require('lodash');

function mapKeysToCamelCase (obj) {
  return _.mapKeys(obj, (__, key) => _.camelCase(key));
}

module.exports = { mapKeysToCamelCase };
