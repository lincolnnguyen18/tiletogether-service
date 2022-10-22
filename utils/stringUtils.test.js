const { mapKeysToCamelCase } = require('./stringUtils');

describe('String utils', () => {
  test('mapKeysToCamelCase', () => {
    const obj = { test_key: 'test_value', test_key_2: 'test_value_2' };
    const expectedObj = { testKey: 'test_value', testKey2: 'test_value_2' };
    expect(mapKeysToCamelCase(obj)).toEqual(expectedObj);
  });
});
