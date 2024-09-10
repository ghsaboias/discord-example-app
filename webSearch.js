const axios = require('axios');
const cheerio = require('cheerio');
const { RateLimiter } = require('limiter');

const limiter = new RateLimiter({ tokensPerInterval: 5, interval: 'minute' });

async function searchWeb(query) {
  if (!await limiter.removeTokens(1)) {
    console.log('[DEBUG] Rate limit exceeded for web searches');
    throw new Error('Rate limit exceeded for web searches');
  }

  try {
    console.log(`[DEBUG] Sending request to Google for query: "${query}"`);
    const response = await axios.get('https://www.google.com/search', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log(`[DEBUG] Received response from Google`);

    const $ = cheerio.load(response.data);
    const results = [];

    // More generic selector for search result containers
    $('div.g, div[data-hveid]').each((i, element) => {
      if (results.length >= 5) return false; // Limit to 5 results

      const titleElement = $(element).find('h3').first();
      const linkElement = $(element).find('a').first();
      const snippetElement = $(element).find('div[style="-webkit-line-clamp:2"]').first();

      if (titleElement.length && linkElement.length) {
        const title = titleElement.text().trim();
        const link = linkElement.attr('href');
        let snippet = snippetElement.text().trim();

        // If no snippet found, try to extract from other elements
        if (!snippet) {
          snippet = $(element).find('div:not(:has(*))').text().trim();
        }

        if (title && link && link.startsWith('http')) {
          results.push({ title, link, snippet });
        }
      }
    });

    console.log(`[DEBUG] Parsed ${results.length} search results`);
    console.log(JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    console.error('Error searching the web:', error);
    return [];
  }
}

module.exports = { searchWeb };