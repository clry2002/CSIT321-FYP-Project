import logging
import random
from typing import Dict, Any, List, Optional

def search_database_for_character(character, uaid_child, supabase, get_child_age, is_genre_blocked, content_status, content_type=None):
    """
    Search database directly for content related to a specific character.
    
    Args:
        character: The character name (e.g., "spongebob")
        uaid_child: Child's user ID
        supabase: Initialized Supabase client
        get_child_age: Function to get child's age
        is_genre_blocked: Function to check if genre is blocked
        content_status: Dictionary of content status values
        content_type: Optional content type filter (videos, books, etc.)
        
    Returns:
        Dictionary with books and videos lists
    """
    try:
        logging.info(f"Searching database for {character} content for child {uaid_child}")
        
        # Get child's age for filtering
        child_age = get_child_age(uaid_child)
        
        # Determine content format ID (cfid) if content_type is specified
        cfid = None
        if content_type:
            content_type_lower = content_type.lower().rstrip('s')  # Remove trailing 's' if present
            if content_type_lower in ['video', 'show', 'episode']:
                cfid = 1  # Video
            elif content_type_lower in ['book', 'story']:
                cfid = 2  # Book
        
        # Direct database query for character content in title
        query = (
            supabase
            .from_("temp_content")
            .select("*")
            .ilike("title", f"%{character}%")  # Search title
            .eq("status", content_status["APPROVED"])
        )
        
        # Add content format filter if specified
        if cfid is not None:
            query = query.eq("cfid", cfid)
            
        # Execute query
        response = query.execute()
        
        title_results = response.data
        
        # If few or no results in title, try description
        if len(title_results) < 3:
            desc_query = (
                supabase
                .from_("temp_content")
                .select("*")
                .ilike("description", f"%{character}%")  # Search description
                .eq("status", content_status["APPROVED"])
            )
            
            # Add content format filter if specified
            if cfid is not None:
                desc_query = desc_query.eq("cfid", cfid)
                
            desc_response = desc_query.execute()
            
            # Combine results, removing duplicates
            desc_results = desc_response.data
            all_results = title_results.copy()
            
            # Add description results that aren't already in title results
            title_cids = [item["cid"] for item in title_results]
            for item in desc_results:
                if item["cid"] not in title_cids:
                    all_results.append(item)
        else:
            all_results = title_results
        
        if not all_results:
            logging.info(f"No database results found for '{character}'")
            return {"books": [], "videos": []}
        
        logging.info(f"Found {len(all_results)} raw results for '{character}'")
        
        # Filter for age-appropriate content
        filtered_results = []
        for content in all_results:
            # Skip content that's not age-appropriate
            if "minimumage" in content and content["minimumage"] is not None:
                if int(content["minimumage"]) > child_age:
                    continue
            
            # Check if any genres for this content are blocked
            is_blocked = False
            content_genres_query = (
                supabase
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
            filtered_results.append(content)
        
        logging.info(f"After filtering, found {len(filtered_results)} suitable results for '{character}'")
        
        # If no suitable content found
        if not filtered_results:
            return {"books": [], "videos": []}
        
        # Split into books and videos
        books = [item for item in filtered_results if item["cfid"] == 2]
        videos = [item for item in filtered_results if item["cfid"] == 1]
        
        # Randomize and limit the results to 5 each if there are too many
        if books:
            random.shuffle(books)
            books = books[:min(5, len(books))]
            
        if videos:
            random.shuffle(videos)
            videos = videos[:min(5, len(videos))]
        
        return {
            "books": books,
            "videos": videos,
            "character": character  # Include the character for context
        }
        
    except Exception as e:
        logging.error(f"Error searching database for character: {e}", exc_info=True)
        return {"books": [], "videos": []}

def detect_character_in_query(query):
    """
    Detect if a query is about a specific character.
    
    Args:
        query: The normalized user query
        
    Returns:
        Character name if found, None otherwise
    """
    # List of popular characters to check for
    characters = [
        "spongebob", "peppa pig", "paw patrol", "harry potter", "tom and jerry"
        "dora", "mickey mouse", "lego", "superhero", "princess", "frozen", "elsa"
    ]
    
    # Check if any character appears in the query
    for character in characters:
        if character in query.lower():
            return character
            
    return None

def extract_character_from_history(conversation_history):
    characters = [
        "spongebob", "peppa pig", "paw patrol", "harry potter", 
        "dora", "mickey mouse", "pokemon", "barbie", "lego", 
        "marvel", "superhero", "princess", "frozen", "elsa"
    ]
    
    # Check recent messages for character mentions
    for msg in conversation_history:
        if msg.get('ischatbot') is False:  # Only check user messages
            msg_text = msg.get('context', '').lower()
            for character in characters:
                if character in msg_text:
                    logging.info(f"Found character context '{character}' from recent history")
                    return character
    
    return None

def detect_content_type(query):
    if any(word in query.lower() for word in ["videos", "episodes", "shows", "watch"]):
        return "videos"
    elif any(word in query.lower() for word in ["books", "stories", "read"]):
        return "books"
    
    return None

def get_recent_conversation_history(uaid_child, supabase, limit=5):
    try:
        history_query = (
            supabase
            .from_("temp_chathistory")
            .select("*")
            .eq("uaid_child", uaid_child)
            .order("createddate", desc=True)
            .limit(limit)
            .execute()
        )
        
        if history_query.data:
            return history_query.data
        
        return []
    except Exception as e:
        logging.error(f"Error retrieving conversation history: {e}")
        return []