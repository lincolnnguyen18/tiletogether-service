const _ = require('lodash');

function mapKeysToCamelCase (obj) {
  return _.mapKeys(obj, (__, key) => _.camelCase(key));
}

function hashCode (s) {
  return s.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

module.exports = { mapKeysToCamelCase, hashCode };
