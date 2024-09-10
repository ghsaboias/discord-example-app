require('dotenv').config();

module.exports = {
  INITIAL_MODEL: "claude-3-5-sonnet-20240620",
  FINAL_MODEL: "claude-3-haiku-20240307",
  INITIAL_MAX_TOKENS: 100,
  FINAL_MAX_TOKENS: 1500,
  COST_PER_1M_TOKENS: {
    input: 0.25,
    output: 1.25,
  },
  MAX_HISTORY: 10,
  SYSTEM_PROMPT: (currentDateTime) => `You are a friendly, genius chatbot assistant. The current date and time is ${currentDateTime}. Your task is to provide brief, accurate answers to user queries.

  IMPORTANT:
  1. Always be aware of the current date and use it as a reference point.
  2. Use web search results as your primary source for current information, and provide source link.
  3. If search results are insufficient, simply state that you don't have enough information to answer accurately.`.trim(),
  
  // Add any necessary configurations from config.json here
  APP_ID: process.env.APP_ID,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  PUBLIC_KEY: process.env.PUBLIC_KEY,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  GUILD_ID: process.env.GUILD_ID,
  AUTHORIZED_USER_ID: process.env.AUTHORIZED_USER_ID,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
};