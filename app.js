const { Client, GatewayIntentBits } = require("discord.js");
const dotenv = require("dotenv");
const { askClaude, clearHistory } = require("./claudeApi.js");
const { sendSplitMessage } = require("./messageSplitter.js");

require('dotenv').config();

console.log('DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? 'Token is set' : 'Token is not set');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (
    message.guildId === process.env.GUILD_ID &&
    message.author.id === process.env.AUTHORIZED_USER_ID
  ) {
    try {
      if (message.content.toLowerCase() === "!clear") {
        const clearMessage = await clearHistory(message.author.id);
        await message.reply(clearMessage);
        return;
      }

      const response = await askClaude(message.author.id, message.content);

      if (typeof response === "string") {
        console.error("Claude API Error:", response);
        await message.reply(response);
      } else if (response && response.text) {
        console.log("User message received", {
            author: message.author.id,
            content: message.content,
        });
        console.log("Claude response received", {
          text: response.text,
          initialInputTokens: response.initialInputTokens,
          webSearchTokens: response.webSearchTokens,
          finalInputTokens: response.finalInputTokens,
          outputTokens: response.outputTokens,
          initialCost: response.initialCost.toFixed(6),
          webSearchCost: response.webSearchCost.toFixed(6),
          finalCost: response.finalCost.toFixed(6),
          totalCost: response.totalCost.toFixed(6),
          processingTime: `${response.processingTime}ms`,
          webSearchPerformed: response.webSearchPerformed,
          modelUsed: response.model,
        });

        // Send Claude's response
        if (response.text.trim()) {
          let fullResponse = response.text;
          await sendSplitMessage(message.channel, fullResponse);
        } else {
          console.warn("Empty response from Claude, not sending to Discord");
        }
      } else {
        console.error("Unexpected response format from Claude API");
        await message.reply("Sorry, I received an unexpected response format. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error.toString(), "\nStack:", error.stack);
      await message.reply("Sorry, an error occurred.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Failed to log in:', error);
});
