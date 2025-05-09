import re
import logging
from typing import Tuple, Dict, Any, List, Optional

def check_title_query(query: str) -> Tuple[bool, Optional[str]]:
    # Remove question marks from the query for better title extraction
    if query.lower().startswith("recommend") and any(word in query.lower() for word in ["books", "videos"]):
            return False, None
        
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
        {'regex': r'is (the|a) ([A-Za-z0-9\s]+) available', 'group': 2},
        {'regex': r'do you have (the|a) ([A-Za-z0-9\s]+)', 'group': 2},
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
                
                # NEW: Remove content type words from the end of extracted titles
                title = re.sub(r'\s+(book|books|video|videos|story|stories)$', '', title, flags=re.IGNORECASE)
                
                # Only consider it a title if it's at least 2 words long or 
                # has specific keywords that indicate it's likely a title
                words = title.split()
                
                # Expanded list of character keywords
                character_keywords = [
                    "harry", "potter", "peppa", "pig", "disney", "spider", "batman", 
                    "fish", "fairy", "diary", "captain", "star", "wars", "boy", "girl",
                    "tom", "jerry", "mickey", "mouse", "spongebob", "dora", "elsa",
                    "frozen", "paw", "patrol", "bluey", "cocomelon", "marvel", "pokemon"
                ]
                
                if len(words) >= 2 or any(word.lower() in character_keywords for word in words):
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
            
            # NEW: Remove content type words from the end of extracted titles
            title = re.sub(r'\s+(book|books|video|videos|story|stories)$', '', title, flags=re.IGNORECASE)
            
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
            
            # NEW: Remove content type words from the end of extracted titles
            title = re.sub(r'\s+(book|books|video|videos|story|stories)$', '', title, flags=re.IGNORECASE)
            
            logging.info(f"Detected quoted title: '{title}'")
            return True, title
            
        # Check if it looks like a title (proper noun sequence)
        title_words = [word for word in words if word[0].isupper() if len(word) > 1]
        if len(title_words) >= 2:
            title = " ".join(title_words)
            
            # NEW: Remove content type words from the end of extracted titles
            title = re.sub(r'\s+(book|books|video|videos|story|stories)$', '', title, flags=re.IGNORECASE)
            
            logging.info(f"Detected likely title from capitalized words: '{title}'")
            return True, title
    
    return False, None

def search_for_title(title: str, uaid_child: str, supabase_client, get_child_age, is_genre_blocked, content_status) -> Dict[str, Any]:
    try:
        # Clean up the title for searching
        clean_title = re.sub(r'(is|are|can|will|do|does)\s+', '', title, flags=re.IGNORECASE)
        clean_title = re.sub(r'\s+(available|here|there|now|yet)', '', clean_title, flags=re.IGNORECASE)
        
        # Store the original cleaned title before removing content type words
        original_clean_title = clean_title.strip()
        
        # Remove common content type words from the end of the title
        clean_title = re.sub(r'\s+(book|books|video|videos|story|stories)$', '', clean_title, flags=re.IGNORECASE)
        clean_title = clean_title.strip()
        
        # Flag to track if we removed content type words
        has_content_type_word = original_clean_title != clean_title
        
        logging.info(f"Searching for title: '{clean_title}' (original: '{title}') for child {uaid_child}")
        
        # Get child's age for age filtering
        child_age = get_child_age(uaid_child)
        
        # Determine content type (video or book)
        content_type = None
        if "video" in title.lower() or "videos" in title.lower() or "episode" in title.lower():
            content_type = 1  # Video
        elif "book" in title.lower() or "books" in title.lower() or "story" in title.lower():
            content_type = 2  # Book
        
        # Detect specific character searches
        character_pairs = {
            "tom and jerry": ["tom", "jerry"],
            "mickey mouse": ["mickey", "mouse"],
            "peppa pig": ["peppa", "pig"],
            "paw patrol": ["paw", "patrol"],
            "harry potter": ["harry", "potter"]
        }
        
        active_character = None
        for char_name, char_parts in character_pairs.items():
            if all(part in clean_title.lower() for part in char_parts):
                active_character = char_name
                logging.info(f"Detected character search: {active_character}")
                break
        
        # ----------- COMBINED SEARCH STRATEGY -----------
        # Keep track of all results to rank them later
        all_results = []
        
        # 1. Try exact title match
        exact_query = (
            supabase_client
            .from_("temp_content")
            .select("*")
            .ilike("title", f"%{clean_title}%")
            .eq("status", content_status["APPROVED"])
        )
        
        # Apply content type filter if specified
        if content_type is not None:
            exact_query = exact_query.eq("cfid", content_type)
            
        exact_response = exact_query.execute()
        if exact_response.data:
            # Add with high relevance score (10)
            for item in exact_response.data:
                all_results.append((item, 10))
        
        # 2. Character-specific search in both title and description
        if active_character:
            # Split character name into parts for matching
            char_parts = character_pairs[active_character]
            
            # Search title with character parts
            char_title_query = supabase_client.from_("temp_content").select("*").eq("status", content_status["APPROVED"])
            for part in char_parts:
                char_title_query = char_title_query.ilike("title", f"%{part}%")
            
            # Apply content type filter if specified
            if content_type is not None:
                char_title_query = char_title_query.eq("cfid", content_type)
                
            char_title_response = char_title_query.execute()
            if char_title_response.data:
                # Add with high relevance score (9)
                for item in char_title_response.data:
                    all_results.append((item, 9))
            
            # Search description with character parts if title search found nothing
            if not char_title_response.data:
                char_desc_query = supabase_client.from_("temp_content").select("*").eq("status", content_status["APPROVED"])
                for part in char_parts:
                    char_desc_query = char_desc_query.ilike("description", f"%{part}%")
                
                # Apply content type filter if specified
                if content_type is not None:
                    char_desc_query = char_desc_query.eq("cfid", content_type)
                    
                char_desc_response = char_desc_query.execute()
                if char_desc_response.data:
                    # Add with medium relevance score (7)
                    for item in char_desc_response.data:
                        all_results.append((item, 7))
        
        # 3. Word pair search for non-character queries
        if not active_character and len(clean_title.split()) >= 2:
            # Split the title into words and create word pairs
            words = clean_title.split()
            word_pairs = []
            for i in range(len(words) - 1):
                word_pairs.append(f"{words[i]} {words[i+1]}")
            
            # Try each word pair
            for word_pair in word_pairs:
                pair_query = (
                    supabase_client
                    .from_("temp_content")
                    .select("*")
                    .ilike("title", f"%{word_pair}%")
                    .eq("status", content_status["APPROVED"])
                )
                
                # Apply content type filter if specified
                if content_type is not None:
                    pair_query = pair_query.eq("cfid", content_type)
                    
                pair_response = pair_query.execute()
                
                if pair_response.data:
                    # Add with medium relevance score (6)
                    for item in pair_response.data:
                        all_results.append((item, 6))
        
        # 4. Fallback to individual keyword searches for most distinctive words
        if len(all_results) < 3:  # If we still need more results
            # Define character keywords that should be prioritized
            character_keywords = [
                "tom", "jerry", "peppa", "pig", "harry", "potter", "mickey", "mouse",
                "spongebob", "dora", "barbie", "elsa", "superman", "batman", "spider",
                "paw", "patrol", "bluey", "disney", "marvel", "frozen"
            ]
            
            # Extract all words with 3+ characters
            words = [word for word in clean_title.split() if len(word) >= 3]
            
            # Prioritize character keywords
            priority_words = [word for word in words if word.lower() in character_keywords]
            search_words = priority_words if priority_words else words
            
            # If no search words found, use any words
            if not search_words and clean_title.split():
                search_words = [clean_title.split()[0]]
            
            # Search with each priority word
            for word in search_words:
                keyword_query = (
                    supabase_client
                    .from_("temp_content")
                    .select("*")
                    .ilike("title", f"%{word}%")
                    .eq("status", content_status["APPROVED"])
                )
                
                # Apply content type filter if specified
                if content_type is not None:
                    keyword_query = keyword_query.eq("cfid", content_type)
                    
                keyword_response = keyword_query.execute()
                
                if keyword_response.data:
                    # Add with lower relevance score (4 if character keyword, 3 otherwise)
                    relevance = 4 if word.lower() in character_keywords else 3
                    for item in keyword_response.data:
                        all_results.append((item, relevance))
        
        # 5. Last resort: Search in description for distinctive words
        if len(all_results) < 3:  # Still need more results
            for word in search_words[:2]:  # Limit to first 2 words for efficiency
                desc_query = (
                    supabase_client
                    .from_("temp_content")
                    .select("*")
                    .ilike("description", f"%{word}%")
                    .eq("status", content_status["APPROVED"])
                )
                
                # Apply content type filter if specified
                if content_type is not None:
                    desc_query = desc_query.eq("cfid", content_type)
                    
                desc_response = desc_query.execute()
                
                if desc_response.data:
                    # Add with lowest relevance score (2)
                    for item in desc_response.data:
                        all_results.append((item, 2))
        
        # 6. If we're looking for videos and have no results, try matching content type only
        if content_type is not None and len(all_results) == 0:
            type_query = (
                supabase_client
                .from_("temp_content")
                .select("*")
                .eq("cfid", content_type)
                .eq("status", content_status["APPROVED"])
                .limit(10)
            )
            
            type_response = type_query.execute()
            
            if type_response.data:
                # Add with lowest relevance score (1)
                for item in type_response.data:
                    all_results.append((item, 1))
        
        # 7. If still no results and we removed content type words, try again with original title
        if len(all_results) == 0 and has_content_type_word:
            logging.info(f"No results found for '{clean_title}', trying with original title '{original_clean_title}'")
            
            # Repeat exact title match with original_clean_title
            fallback_exact_query = (
                supabase_client
                .from_("temp_content")
                .select("*")
                .ilike("title", f"%{original_clean_title}%")
                .eq("status", content_status["APPROVED"])
            )
            
            # Apply content type filter if specified
            if content_type is not None:
                fallback_exact_query = fallback_exact_query.eq("cfid", content_type)
                
            fallback_exact_response = fallback_exact_query.execute()
            if fallback_exact_response.data:
                # Add with high relevance score (8 - slightly lower than primary search)
                for item in fallback_exact_response.data:
                    all_results.append((item, 8))
            
            # If still no results and we have multiple words, try word pairs
            if len(all_results) == 0 and len(original_clean_title.split()) >= 2:
                # Split the title into words and create word pairs
                words = original_clean_title.split()
                word_pairs = []
                for i in range(len(words) - 1):
                    word_pairs.append(f"{words[i]} {words[i+1]}")
                
                # Try each word pair
                for word_pair in word_pairs:
                    fallback_pair_query = (
                        supabase_client
                        .from_("temp_content")
                        .select("*")
                        .ilike("title", f"%{word_pair}%")
                        .eq("status", content_status["APPROVED"])
                    )
                    
                    # Apply content type filter if specified
                    if content_type is not None:
                        fallback_pair_query = fallback_pair_query.eq("cfid", content_type)
                        
                    fallback_pair_response = fallback_pair_query.execute()
                    
                    if fallback_pair_response.data:
                        # Add with medium relevance score (5)
                        for item in fallback_pair_response.data:
                            all_results.append((item, 5))
        
        # Process results by removing duplicates and ranking
        if all_results:
            # Remove duplicates by keeping highest relevance score
            seen_cids = {}
            unique_results = []
            
            for item, relevance in all_results:
                cid = item["cid"]
                if cid not in seen_cids or relevance > seen_cids[cid]:
                    seen_cids[cid] = relevance
                    unique_results.append((item, relevance))
            
            # Sort by relevance score (highest first)
            unique_results.sort(key=lambda x: x[1], reverse=True)
            
            # Extract just the items
            response_data = [item for item, _ in unique_results]
            
            logging.info(f"Found {len(response_data)} total results after ranking and de-duplication")
        else:
            response_data = []
        
        if not response_data:
            logging.info(f"No results found for title '{clean_title}'")
            return {"error": "No content found with that title"}
        
        # Apply age and genre filtering
        filtered_content = []
        for content in response_data:
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
        
        # Apply additional content type filtering if requested
        if content_type == 1:  # Videos only
            books = []
        elif content_type == 2:  # Books only
            videos = []
        
        # Include a character flag to help the chatbot provide context
        has_character = bool(active_character)
        character_name = active_character if active_character else None
        
        # Return the filtered content
        return {
            "message": f"Found content matching '{clean_title}'",
            "books": books,
            "videos": videos,
            "has_character": has_character,
            "character_name": character_name
        }
        
    except Exception as e:
        logging.error(f"Error searching for title: {e}", exc_info=True)
        return {"error": f"Error searching for title: {str(e)}"}