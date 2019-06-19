const path = require("path");

module.exports = {
  getStepDefinitionPathsFrom: filePath => path.dirname(filePath)
};
