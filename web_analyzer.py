import os
from typing import List, Dict, Any
from crawl4ai import WebCrawler
from pydantic import BaseModel
import anthropic

class CrawlResult(BaseModel):
    url: str
    content: str
    summary: str
    sentiment: str
    key_topics: List[str]
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_write_tokens: int
    cost_input: float
    cost_output: float
    cost_cache_read: float
    cost_cache_write: float
    cost_total: float

class LLMCrawler:
    def __init__(self, api_key: str):
        self.crawler = WebCrawler()
        self.crawler.warmup()
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def crawl_and_analyze(self, url: str) -> CrawlResult:
        result = self.crawler.run(url=url, word_count_threshold=10, bypass_cache=True)
        
        # Save the crawled content to a file
        # self._save_content_to_file(url, result.markdown)
        
        analysis = self._analyze_content(result.markdown)

        return CrawlResult(
            url=url,
            content=result.markdown,
            summary=analysis['summary'],
            sentiment=analysis['sentiment'],
            key_topics=analysis['key_topics'],
            input_tokens=analysis['input_tokens'],
            output_tokens=analysis['output_tokens'],
            cache_read_tokens=analysis['cache_read_tokens'],
            cache_write_tokens=analysis['cache_write_tokens'],
            cost_input=analysis['cost_input'],
            cost_output=analysis['cost_output'],
            cost_cache_read=analysis['cost_cache_read'],
            cost_cache_write=analysis['cost_cache_write'],
            cost_total=analysis['cost_total']
        )

    # def _save_content_to_file(self, url: str, content: str):
    #     # Create a valid filename from the URL
    #     filename = "".join(c if c.isalnum() else "_" for c in url)
    #     filename = f"crawled_content_{filename[:50]}.txt"  # Limit filename length
        
    #     # Save the content to a file
    #     with open(filename, "w", encoding="utf-8") as f:
    #         f.write(f"URL: {url}\n\n")
    #         f.write(content)
        
    #     print(f"Crawled content saved to {filename}")

    def _analyze_content(self, content: str) -> Dict[str, Any]:
        try:
            response = self.client.beta.prompt_caching.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                system=[
                    {"type": "text", "text": "Analyze web content: provide a summary (if there's real-time data, include it), sentiment analysis, and list of key topics."},
                    {"type": "text", "text": content, "cache_control": {"type": "ephemeral"}}
                ],
                messages=[{"role": "user", "content": "Format your response as JSON with keys: summary, sentiment, key_topics."}]
            )

            analysis = self._parse_response(response)
            costs = self._calculate_costs(response.usage)
            return {**analysis, **costs}
        except Exception as e:
            print(f"Error in _analyze_content: {str(e)}")
            print(f"Content length: {len(content)}")
            return {
                "summary": "Error occurred during analysis.",
                "sentiment": "Unknown",
                "key_topics": ["Error"],
                "input_tokens": 0,
                "output_tokens": 0,
                "cache_read_tokens": 0,
                "cache_write_tokens": 0,
                "cost_input": 0,
                "cost_output": 0,
                "cost_cache_read": 0,
                "cost_cache_write": 0,
                "cost_total": 0
            }

    def _parse_response(self, response) -> Dict[str, Any]:
        import json
        return json.loads(response.content[0].text)

    def _calculate_costs(self, usage) -> Dict[str, Any]:
        prices = {
            'input': 0.25,     # $0.25 per 1M tokens
            'output': 1.25,    # $1.25 per 1M tokens
            'cache_read': 0.03,  # $0.03 per 1M tokens
            'cache_write': 0.30  # $0.30 per 1M tokens
        }

        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens
        cache_read_tokens = getattr(usage, 'cache_read_input_tokens', 0)
        cache_write_tokens = getattr(usage, 'cache_creation_input_tokens', 0)

        cost_input = (input_tokens / 1_000_000) * prices['input']
        cost_output = (output_tokens / 1_000_000) * prices['output']
        cost_cache_read = (cache_read_tokens / 1_000_000) * prices['cache_read']
        cost_cache_write = (cache_write_tokens / 1_000_000) * prices['cache_write']
        cost_total = cost_input + cost_output + cost_cache_read + cost_cache_write

        return {
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cache_read_tokens': cache_read_tokens,
            'cache_write_tokens': cache_write_tokens,
            'cost_input': cost_input,
            'cost_output': cost_output,
            'cost_cache_read': cost_cache_read,
            'cost_cache_write': cost_cache_write,
            'cost_total': cost_total
        }

if __name__ == "__main__":
    api_key = os.getenv("ANTHROPIC_API_KEY")
    crawler = LLMCrawler(api_key)
    result = crawler.crawl_and_analyze("https://www.firecrawl.dev/")
    print(
        f"Summary: {result.summary}\n"
        f"Sentiment: {result.sentiment}\n"
        f"Key Topics: {result.key_topics}\n"
        f"Input Tokens: {result.input_tokens}\n"
        f"Output Tokens: {result.output_tokens}\n"
        f"Cache Read Tokens: {result.cache_read_tokens}\n"
        f"Cache Write Tokens: {result.cache_write_tokens}\n"
        f"Cost Input: {result.cost_input}\n"
        f"Cost Output: {result.cost_output}\n"
        f"Cost Cache Read: {result.cost_cache_read}\n"
        f"Cost Cache Write: {result.cost_cache_write}\n"
        f"Cost Total: {result.cost_total}\n"
    )