import re
import logging
from typing import Tuple, Dict, Any, List, Optional

def check_title_query(query: str) -> Tuple[bool, Optional[str]]:
    """
    Check if a query is asking for a specific title
    
    Args:
        query: The user's question or message
        
    Returns:
        Tuple containing (is_title_query, title)
    """
    # Remove question marks from the query for better title extraction
    clean_query = query.replace('?', '')
    
    # Define patterns to detect title queries with specific patterns
    title_patterns = [
        {'regex': r'where can i (find|get|read|watch) ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 2},
        {'regex': r'do you have ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 1},
        {'regex': r'show me ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 1},
        {'regex': r'can i (read|watch) ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 2},
        {'regex': r'i want to (read|watch) ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 2},
        {'regex': r'is there a book (called|titled|named) ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 2},
        {'regex': r'is there a (video|movie) (called|titled|named) ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 3},
        {'regex': r'(find|show|get) ["\'"]?([A-Za-z0-9\s]+)["\'"]?', 'group': 2},
        {'regex': r'is (the|a) ([A-Za-z0-9\s]+) available', 'group': 2},  # Added for "is the big fish little fish available?"
        {'regex': r'do you have (the|a) ([A-Za-z0-9\s]+)', 'group': 2},  # Added for "do you have the xyz book"
        {'regex': r'looking for (the|a) ([A-Za-z0-9\s]+)', 'group': 2}, 
        {'regex': r'how about (the|a|an)? ?([A-Za-z0-9\s]+)', 'group': 2},  
        {'regex': r'what about (the|a|an)? ?([A-Za-z0-9\s]+)', 'group': 2},
    ]
    
    # Check each pattern against the clean query
    for pattern in title_patterns:
        match = re.search(pattern['regex'], clean_query, re.IGNORECASE)
        if match:
            try:
                title = match.group(pattern['group']).strip()
                # Only consider it a title if it's at least 2 words long or 
                # has specific keywords that indicate it's likely a title
                words = title.split()
                if len(words) >= 2 or any(word in title.lower() for word in [
                    "harry", "potter", "peppa", "pig", "disney", "spider", "batman", 
                    "fish", "fairy", "diary", "captain", "star", "wars", "boy", "girl"
                ]):
                    logging.info(f"Detected title query: '{title}' from '{query}'")
                    return True, title
            except IndexError:
                # If group doesn't exist, continue to next pattern
                continue
    
    # If no patterns matched and question contains "is" and "available", extract possible title
    if "is" in clean_query.lower() and "available" in clean_query.lower():
        # Extract the part between "is" and "available"
        match = re.search(r'is\s+(.*?)\s+available', clean_query, re.IGNORECASE)
        if match:
            title = match.group(1).strip()
            # Remove leading "the" or "a" if present
            title = re.sub(r'^(the|a)\s+', '', title, flags=re.IGNORECASE)
            if len(title.split()) >= 2:  # Must be at least 2 words
                logging.info(f"Extracted title from availability question: '{title}'")
                return True, title
    
    # Check if it might be a direct title query
    # This will catch phrases like "Harry Potter" or "Peppa Pig" by themselves
    words = clean_query.split()
    if 2 <= len(words) <= 6:  # Direct title queries are usually 2-6 words
        # Check if it's in quotes
        match = re.search(r'"([^"]+)"', clean_query)
        if match:
            title = match.group(1).strip()
            logging.info(f"Detected quoted title: '{title}'")
            return True, title
            
        # Check if it looks like a title (proper noun sequence)
        title_words = [word for word in words if word[0].isupper() if len(word) > 1]
        if len(title_words) >= 2:
            title = " ".join(title_words)
            logging.info(f"Detected likely title from capitalized words: '{title}'")
            return True, title
    
    return False, None

def search_for_title(title: str, uaid_child: str, supabase_client, get_child_age, is_genre_blocked, content_status) -> Dict[str, Any]:
    """
    Search for a specific title in the database
    
    Args:
        title: The title to search for
        uaid_child: Child's user ID
        supabase_client: Initialized Supabase client
        get_child_age: Function to get child's age
        is_genre_blocked: Function to check if genre is blocked
        content_status: Dictionary of content status values
        
    Returns:
        Dictionary containing search results or error message
    """
    try:
        # Clean up the title for searching (remove question-specific parts)
        clean_title = re.sub(r'(is|are|can|will|do|does)\s+', '', title, flags=re.IGNORECASE)
        clean_title = re.sub(r'\s+(available|here|there|now|yet)', '', clean_title, flags=re.IGNORECASE)
        clean_title = clean_title.strip()
        
        # Log the title search
        logging.info(f"Searching for title: '{clean_title}' (original: '{title}') for child {uaid_child}")
        
        # Get child's age for age filtering
        child_age = get_child_age(uaid_child)
        logging.info(f"Child age for title search: {child_age}")
        
        # Search in the database for content matching the title
        # First try an exact match with ILIKE
        search_query = (
            supabase_client
            .from_("temp_content")
            .select("*")
            .ilike("title", f"%{clean_title}%")
            .eq("status", content_status["APPROVED"])
        )
        
        # Execute the query
        response = search_query.execute()
        
        # If no results with exact title match, try searching for combinations of words
        if not response.data and len(clean_title.split()) >= 2:
            logging.info(f"No exact matches for '{clean_title}', trying phrase combinations")
            
            # Split the title into words and create word pairs for searching
            words = clean_title.split()
            
            # Create pairs of adjacent words for more precise searching
            word_pairs = []
            for i in range(len(words) - 1):
                word_pairs.append(f"{words[i]} {words[i+1]}")
            
            # Try searching for each word pair
            combined_results = []
            for word_pair in word_pairs:
                pair_query = (
                    supabase_client
                    .from_("temp_content")
                    .select("*")
                    .ilike("title", f"%{word_pair}%")
                    .eq("status", content_status["APPROVED"])
                )
                pair_response = pair_query.execute()
                
                if pair_response.data:
                    combined_results.extend(pair_response.data)
            
            # If we found results with word pairs
            if combined_results:
                # Remove duplicates based on cid
                seen_cids = set()
                unique_results = []
                for item in combined_results:
                    if item["cid"] not in seen_cids:
                        seen_cids.add(item["cid"])
                        unique_results.append(item)
                
                # Rank results by number of matching words
                ranked_results = []
                for item in unique_results:
                    matches = sum(1 for word in words if word.lower() in item["title"].lower())
                    ranked_results.append((item, matches))
                
                # Sort by number of matches (descending)
                ranked_results.sort(key=lambda x: x[1], reverse=True)
                
                # Take the top 5 most relevant results
                response.data = [item for item, _ in ranked_results[:5]]
                
                logging.info(f"Found {len(response.data)} results through word pair search (from {len(combined_results)} total matches)")
        
        # If still no results, try one keyword search with the most distinctive word
        if not response.data:
            logging.info(f"No phrase matches found, trying keyword search with most distinctive word")
            
            # Find words with 4+ characters (more likely to be distinctive)
            keywords = [word for word in clean_title.split() if len(word) >= 4]
            
            # If no 4+ character words, use 3+ character words
            if not keywords:
                keywords = [word for word in clean_title.split() if len(word) >= 3]
            
            # If we have keywords, search for the longest one (likely most distinctive)
            if keywords:
                longest_keyword = max(keywords, key=len)
                logging.info(f"Searching for distinctive keyword: '{longest_keyword}'")
                
                keyword_query = (
                    supabase_client
                    .from_("temp_content")
                    .select("*")
                    .ilike("title", f"%{longest_keyword}%")
                    .eq("status", content_status["APPROVED"])
                    .limit(10)  # Limit to 10 results
                )
                
                keyword_response = keyword_query.execute()
                response.data = keyword_response.data
                
                logging.info(f"Found {len(response.data)} results with keyword '{longest_keyword}'")
        
        if not response.data:
            logging.info(f"No results found for title '{clean_title}'")
            return {"error": "No content found with that title"}
        
        logging.info(f"Found {len(response.data)} results for title '{clean_title}'")
        
        # Filter by age appropriateness
        filtered_content = []
        for content in response.data:
            # Skip content that's not age-appropriate
            if "minimumage" in content and content["minimumage"] is not None:
                if int(content["minimumage"]) > child_age:
                    logging.debug(f"Skipping content '{content.get('title')}' due to age restriction")
                    continue
            
            # Check if any genres for this content are blocked
            is_blocked = False
            content_genres_query = (
                supabase_client
                .from_("temp_contentgenres")
                .select("temp_genre!inner(gid, genrename)")
                .eq("cid", content["cid"])
                .execute()
            )
            
            for genre_entry in content_genres_query.data:
                if "temp_genre" in genre_entry and genre_entry["temp_genre"]:
                    genre_id = genre_entry["temp_genre"].get("gid")
                    genre_name = genre_entry["temp_genre"].get("genrename")
                    
                    # Check if this genre is blocked for the child
                    if is_genre_blocked(genre_name, uaid_child):
                        logging.info(f"Content '{content['title']}' has blocked genre '{genre_name}'")
                        is_blocked = True
                        break
            
            # Skip if any genre is blocked
            if is_blocked:
                continue
                
            # Add to filtered content
            filtered_content.append(content)
        
        logging.info(f"After filtering, found {len(filtered_content)} suitable results for '{clean_title}'")
        
        # If no suitable content found
        if not filtered_content:
            return {"error": "No suitable content found with that title"}
        
        # Separate books and videos
        books = [item for item in filtered_content if item["cfid"] == 2]
        videos = [item for item in filtered_content if item["cfid"] == 1]
        
        # Return the filtered content
        return {
            "message": f"Found content matching '{clean_title}'",
            "books": books,
            "videos": videos
        }
        
    except Exception as e:
        logging.error(f"Error searching for title: {e}", exc_info=True)
        return {"error": f"Error searching for title: {str(e)}"}