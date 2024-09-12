from googlesearch import search

def google_search(query, num_results=3):
    try:
        search_results = list(search(query, num_results=num_results))
        return search_results
    except Exception as e:
        print(f"Error during Google search: {str(e)}")
        return []