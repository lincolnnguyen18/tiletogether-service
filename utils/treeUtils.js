const _ = require('lodash');
const { faker } = require('@faker-js/faker');

function randomLayer ({ width, height }) {
  const type = _.sample(['group', 'layer']);
  const imageUrls = _.range(1, 30).map((i) => `/mock-layer-images/${i}.png`);
  const imageUrl = _.sample(imageUrls);
  let position = { x: 0, y: 0 };

  if (type === 'layer') {
    // place layer at random location inside grid
    position = { x: _.random(0, width - width * 0.25), y: _.random(0, height - height * 0.25) };
  }

  return {
    type,
    name: faker.lorem.word(),
    layers: [],
    tilesetLayerUrl: type === 'layer' ? imageUrl : undefined,
    position,
  };
}

// create random recursive tree structure
// Example usage
// const tree = createRandomTree(3, 3, 3);
// console.log(JSON.stringify(tree));
function createRandomTree (maxDepth, width, height) {
  const layers = [];
  const layerCount = _.random(3, 5);

  // create layers
  for (let i = 0; i < layerCount; i++) {
    layers.push(randomLayer({ width, height }));
  }

  // create tree helper
  const createTree = (layers, depth) => {
    if (depth === maxDepth) {
      return;
    }

    layers.forEach(layer => {
      if (layer.type === 'group') {
        const childCount = _.random(1, 5);
        for (let i = 0; i < childCount; i++) {
          layer.layers.push(randomLayer({ width, height }));
        }
        createTree(layer.layers, depth + 1);
      }
    });
  };

  // create tree
  createTree(layers, 0);

  return layers;
}

module.exports = { createRandomTree };
