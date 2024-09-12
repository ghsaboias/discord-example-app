import anthropic
import os
from dotenv import load_dotenv
from config import Config
from datetime import datetime, timezone
from web_analyzer import LLMCrawler, CrawlResult
from search_service import google_search

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))
conversation_history = {}
crawler = LLMCrawler(os.getenv('CLAUDE_API_KEY'))

async def ask_claude(user_id, message):
    print(f"\nReceived message from user {user_id}: {message}")
    if user_id not in conversation_history:
        conversation_history[user_id] = []
        print(f"Created new conversation history for user {user_id}")

    current_time = datetime.now(timezone.utc)
    time_info = f"Current date and time: {current_time.strftime('%Y-%m-%d %H:%M:%S')} UTC"

    search_decision_prompt = f"""{time_info}

    Determine if a web search is needed to answer this query: "{message}"
    Your task is to decide whether current, real-time information from the internet is necessary to provide an accurate and complete answer.
    Respond with ONLY 'Yes' or 'No'.
    'Yes' if a search is needed (e.g., for current events, rapidly changing information, or specific facts you're unsure about).
    'No' if you can confidently answer based on your existing knowledge."""

    try:
        search_decision_response = client.messages.create(
            model=Config.INITIAL_MODEL,
            max_tokens=Config.INITIAL_MAX_TOKENS,
            system="You are an AI assistant tasked with determining if a web search is needed.",
            messages=[
                {"role": "user", "content": search_decision_prompt}
            ]
        )
        
        search_decision = search_decision_response.content[0].text.strip().lower()
        search_needed = (search_decision == 'yes')
        print(f"Search needed: {search_needed}")
    except Exception as e:
        print(f"Error in search decision: {str(e)}. Defaulting to perform search.")
        search_needed = True

    if search_needed:
        try:
            search_results = google_search(message, num_results=3)
            crawl_results = []
            for url in search_results:
                result = crawler.crawl_and_analyze(url)
                crawl_results.append(result)
            
            combined_info = "\n\n".join([
                f"URL: {result.url}\nSummary: {result.summary}\nSentiment: {result.sentiment}\nKey Topics: {result.key_topics}"
                for result in crawl_results
            ])
            
            full_message = f"{time_info}\n\nHere is some relevant information I found:\n\n{combined_info}\n\nBased on this information, please answer the following user query: {message}"
            print(f"Full message: {full_message}")  
        except Exception as e:
            print(f"Error during web analysis: {str(e)}")
            full_message = f"{time_info}\n\nAn error occurred during the web analysis. User query: {message}"
    else:
        full_message = f"{time_info}\n\n{message}"

    conversation_history[user_id].append({"role": "user", "content": full_message})

    print(f"Sending request to Claude API for user {user_id}")
    try:
        response = client.messages.create(
            model=Config.FINAL_MODEL,
            max_tokens=Config.FINAL_MAX_TOKENS,
            messages=conversation_history[user_id]
        )

        conversation_history[user_id].append({"role": "assistant", "content": response.content[0].text})
        print(f"Received response from Claude API for user {user_id}")
        return response.content[0].text
    except Exception as e:
        print(f"Error calling Claude API: {str(e)}")
        return "I'm sorry, but I encountered an error while processing your request. Please try again later."

def clear_history(user_id):
    if user_id in conversation_history:
        conversation_history[user_id] = []
        print(f"Cleared conversation history for user {user_id}")
        return "Conversation history cleared."
    print(f"No conversation history found for user {user_id}")
    return "No conversation history found."

async def analyze_webpage(url: str) -> str:
    try:
        result = crawler.crawl_and_analyze(url)
        return (f"Analysis of {url}:\n"
                f"Summary: {result.summary}\n"
                f"Sentiment: {result.sentiment}\n"
                f"Key Topics: {result.key_topics}\n"
                f"Total Cost: ${result.cost_total:.6f}")
    except Exception as e:
        return f"Error analyzing webpage: {str(e)}"