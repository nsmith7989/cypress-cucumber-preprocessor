/* eslint-disable prefer-template */
const moment = require("moment");
const { resolveAndRunStepDefinition } = require("./resolveStepDefinition");

const handleDynamicValue = value => {
  let returnValue = value;

  if (
    typeof value === "string" &&
    value.startsWith("{{") &&
    value.endsWith("}}")
  ) {
    const args = value
      .slice(2, -2)
      .trim()
      .split(" ");

    if (args[0] === "today") {
      returnValue = moment()
        .utc()
        .add(args[1] ? parseInt(args[1], 10) : 0, "days")
        .format(args.length > 2 ? args.slice(2).join(" ") : "YYYY-MM-DD");
    }

    if (args[0] === "timestamp") {
      returnValue = moment()
        .utc()
        .add(args[1] ? parseInt(args[1], 10) : 0)
        .valueOf();
    }
  }

  return returnValue;
};

const replaceParameterTags = (rowData, text) =>
  Object.keys(rowData).reduce(
    (value, key) => value.replace(`<${key}>`, rowData[key]),
    text
  );

const stepTest = function(stepDetails, exampleRowData) {
  cy.log(`${stepDetails.keyword} ${stepDetails.text}`);
  resolveAndRunStepDefinition.call(
    this,
    stepDetails,
    replaceParameterTags,
    exampleRowData
  );
};

const createTestFromScenario = (scenario, backgroundSection) => {
  if (scenario.examples) {
    scenario.examples.forEach(example => {
      const exampleValues = [];

      example.tableBody.forEach((row, rowIndex) => {
        example.tableHeader.cells.forEach((header, headerIndex) => {
          exampleValues[rowIndex] = Object.assign({}, exampleValues[rowIndex], {
            [header.value]: handleDynamicValue(row.cells[headerIndex].value)
          });
        });
      });

      exampleValues.forEach((rowData, index) => {
        // eslint-disable-next-line prefer-arrow-callback
        const scenarioName = replaceParameterTags(rowData, scenario.name);
        it(`${scenarioName} (example #${index + 1})`, function() {
          if (backgroundSection) {
            backgroundSection.steps.forEach(step => {
              const newStep = Object.assign({}, step);
              newStep.text = replaceParameterTags(rowData, newStep.text);

              stepTest.call(this, newStep, rowData);
            });
          }

          scenario.steps.forEach(step => {
            const newStep = Object.assign({}, step);
            newStep.text = replaceParameterTags(rowData, newStep.text);

            stepTest.call(this, newStep, rowData);
          });
        });
      });
    });
  } else {
    it(scenario.name, function() {
      if (backgroundSection) {
        backgroundSection.steps.forEach(step => stepTest.call(this, step));
      }
      scenario.steps.forEach(step => stepTest.call(this, step));
    });
  }
};

module.exports = {
  createTestFromScenario
};
