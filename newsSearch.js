const axios = require('axios');
const { RateLimiter } = require('limiter');

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: 'minute' });
const NEWS_API_KEY = process.env.NEWS_API_KEY; // Add this to your .env file

async function searchNews(query) {
  if (!await limiter.removeTokens(1)) {
    console.log('[DEBUG] Rate limit exceeded for news searches');
    throw new Error('Rate limit exceeded for news searches');
  }

  try {
    console.log(`[DEBUG] Sending request to NewsAPI for query: "${query}"`);
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        apiKey: NEWS_API_KEY,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 5 // Limit to 5 results
      }
    });

    console.log(`[DEBUG] Received response from NewsAPI`);

    const articles = response.data.articles.map(article => ({
      title: article.title,
      link: article.url,
      snippet: article.description,
      source: article.source.name,
      publishedAt: article.publishedAt
    }));

    console.log(`[DEBUG] Parsed ${articles.length} news articles`);
    console.log(JSON.stringify(articles, null, 2));
    return articles;
  } catch (error) {
    console.error('Error searching for news:', error);
    return [];
  }
}

module.exports = { searchNews };