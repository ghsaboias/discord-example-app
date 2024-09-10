const Anthropic = require("@anthropic-ai/sdk");
const { performance } = require("perf_hooks");
const { searchNews } = require('./newsSearch.js');
const moment = require('moment');
const config = require('./config.js');
const { countTokens, calculateCost } = require('./utils.js');
const ConversationManager = require('./conversationManager.js');

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const conversationManager = new ConversationManager();

async function determineSearchNeed(userHistory, currentDateTime) {
  console.log("Sending initial request to Claude Sonnet");
  
  // Ensure the first message has a "user" role
  const messages = userHistory.length > 0 && userHistory[0].role === "user" 
    ? userHistory 
    : [{ role: "user", content: "Hello" }, ...userHistory];

  const initialResponse = await anthropic.messages.create({
    model: config.INITIAL_MODEL,
    max_tokens: config.INITIAL_MAX_TOKENS,
    system: `You are an AI assistant. The current date and time is ${currentDateTime}. Determine if the user's query requires current or future information that would benefit from a web search. If so, respond with 'SEARCH:query', where 'query' is a concise search term. Otherwise, respond with 'NO_SEARCH'.`,
    messages: messages,
  });
  return initialResponse.content[0].text;
}

async function performNewsSearch(searchQuery) {
  console.log(`Performing news search for: ${searchQuery}`);
  try {
    const newsResults = await searchNews(searchQuery);
    return newsResults.map((result, index) => 
      `[${index + 1}] ${result.title}\nSource: ${result.source}\nPublished: ${result.publishedAt}\nURL: ${result.link}\nSummary: ${result.snippet || 'No summary available.'}\n`
    ).join('\n').trim();
  } catch (searchError) {
    console.error("News search failed:", searchError);
    throw new Error(`News search failed for query: "${searchQuery}"`);
  }
}

async function askClaude(userId, message) {
  const startTime = performance.now();

  try {
    let userHistory = conversationManager.getUserHistory(userId, message);
    
    // Ensure there's at least one user message in the history
    if (userHistory.length === 0 || userHistory[0].role !== "user") {
      userHistory.unshift({ role: "user", content: message });
    }

    const initialInputTokens = countTokens(JSON.stringify(userHistory));
    console.log(`Initial input tokens: ${initialInputTokens}`);

    const currentDateTime = moment().format('MMMM D, YYYY HH:mm:ss');
    const initialResponse = await determineSearchNeed(userHistory, currentDateTime);

    let searchSummary = 'No web search performed';
    let webSearchPerformed = false;
    let webSearchTokens = 0;
    if (initialResponse.startsWith("SEARCH:")) {
      const searchQuery = initialResponse.slice(7).trim();
      const formattedResults = await performNewsSearch(searchQuery);
      userHistory[userHistory.length - 1].content += `\n\n\nWeb search results for "${searchQuery}":\n\n${formattedResults}`;
      searchSummary = `Search results for "${searchQuery}":\n${formattedResults}`;
      webSearchPerformed = true;
      webSearchTokens = countTokens(formattedResults);
    } else {
      searchSummary = `No web search performed. Initial response: ${initialResponse.trim()}`;
    }

    const finalInputTokens = countTokens(JSON.stringify(userHistory));
    console.log(`Final input tokens: ${finalInputTokens}`);

    const claudeResponse = await anthropic.messages.create({
      model: config.FINAL_MODEL,
      max_tokens: config.FINAL_MAX_TOKENS,
      system: config.SYSTEM_PROMPT(currentDateTime),
      messages: userHistory.map(msg => ({ ...msg, content: msg.content.trim() })),
    });

    if (!claudeResponse.content || claudeResponse.content.length === 0) {
      throw new Error("Empty response from Claude API");
    }

    const outputTokens = countTokens(claudeResponse.content[0].text);
    console.log(`Output tokens: ${outputTokens}`);

    const initialCost = calculateCost(initialInputTokens, 0);
    const webSearchCost = calculateCost(webSearchTokens, 0);
    const finalCost = calculateCost(finalInputTokens, outputTokens);
    const totalCost = initialCost + webSearchCost + finalCost;

    const finalResponse = claudeResponse.content[0].text.trim();
    conversationManager.updateUserHistory(userId, finalResponse);

    const endTime = performance.now();
    const processingTime = (endTime - startTime).toFixed(2);
    console.log(`Request processed in ${processingTime}ms`);

    return {
      text: finalResponse,
      initialInputTokens,
      webSearchTokens,
      finalInputTokens,
      outputTokens,
      initialCost,
      webSearchCost,
      finalCost,
      totalCost,
      processingTime,
      model: config.FINAL_MODEL,
      webSearchPerformed,
      searchSummary,
    };
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return "Sorry, I encountered an error while processing your request. Please try again later.";
  }
}

module.exports = { askClaude, clearHistory: conversationManager.clearHistory };
