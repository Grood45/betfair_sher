const fs = require('fs');
const path = require('path');

const routes = {};

fs.readdirSync(__dirname)
  .filter(file => file !== 'routeWrapper.js')
  .forEach(file => {
    const routeName = path.basename(file, '.js');
    routes[routeName] = require(`./${file}`);
  });

module.exports = routes;