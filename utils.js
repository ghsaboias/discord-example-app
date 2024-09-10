const config = require('./config');

function countTokens(text) {
  return text.split(/\s+/).length;
}

function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000000) * config.COST_PER_1M_TOKENS.input;
  const outputCost = (outputTokens / 1000000) * config.COST_PER_1M_TOKENS.output;
  return inputCost + outputCost;
}

module.exports = {
  countTokens,
  calculateCost,
};