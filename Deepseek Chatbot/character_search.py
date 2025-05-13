import logging
import random
from typing import Dict, Any, List, Optional

def search_database_for_character(character, uaid_child, supabase, get_child_age, is_genre_blocked, content_status, content_type=None):

    # Search database directly for content related to a specific character.
    try:
        logging.info(f"Searching database for {character} content for child {uaid_child}")
        
        # Get child's age for filtering
        child_age = get_child_age(uaid_child)
        
        # Determine content format ID (cfid) if content_type is specified
        cfid = None
        if content_type:
            content_type_lower = content_type.lower().rstrip('s')
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
    
    # List of popular characters to check for
    characters = [
        "spongebob", "peppa pig", "paw patrol", "harry potter", "tom and jerry",
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
    

def should_reset_character_context(question, recent_history, existing_context):
    """
    Determine if the character context should be reset based on the user's new question.
    Uses a more aggressive approach to detect topic changes.
    
    """
    # If there's no character in existing context, no need to reset
    if not existing_context or 'character' not in existing_context:
        return False
    
    current_character = existing_context.get('character')
    normalized_question = question.lower()
    
    # APPROACH 1: Check if the current character is explicitly mentioned
    # If the character is NOT mentioned, it's likely a topic change
    if current_character not in normalized_question:
        # Only keep character context if question is very short or references something previously mentioned
        if len(normalized_question.split()) > 2:  # Not just "yes" or "ok"
            # Check for continuity phrases that would indicate keeping the same topic
            continuity_phrases = [
                "more", "another", "similar", "like that", "tell me more", 
                "can i see", "show me", "again", "that one", "this one", "yes", "yeah"
            ]
            
            has_continuity = any(phrase in normalized_question for phrase in continuity_phrases)
            
            if not has_continuity:
                logging.info(f"Resetting character context from '{current_character}' due to topic change - character not mentioned")
                return True
    
    # APPROACH 2: Check for explicit topic change indicators
    topic_change_indicators = [
        "different", "something else", "new", "another", "instead", "other",
        "change", "not that", "don't want", "recommend", "suggest", "find", 
        "what about", "rather", "prefer", "genre", "category", "type"
    ]
    
    # If any topic change indicator is present AND the character isn't mentioned,
    # it's very likely a topic change
    if any(indicator in normalized_question for indicator in topic_change_indicators) and current_character not in normalized_question:
        logging.info(f"Resetting character context from '{current_character}' due to explicit topic change indicator")
        return True
    
    # APPROACH 3: Check for new entity mentions (other characters, genres, categories)
    # List of entities that would indicate a topic change if mentioned
    topic_entities = [
        # Characters
        "spongebob", "peppa pig", "paw patrol", "harry potter", "tom and jerry",
        "dora", "mickey mouse", "lego", "superhero", "princess", "frozen", 
        "elsa", "pokemon", "barbie", "disney", "marvel", "batman", "spiderman",
        
        # Genres/Categories
        "adventure", "mystery", "science", "math", "animals", "dinosaurs", 
        "space", "ocean", "forest", "fairy tale", "history", "sports",
        "music", "dance", "art", "food", "travel", "nature", "counting",
        
        # Content types
        "video", "book", "story", "show", "movie"
    ]
    
    # If any entity other than the current character is mentioned, it's likely a topic change
    for entity in topic_entities:
        if entity in normalized_question and entity != current_character:
            logging.info(f"Resetting character context from '{current_character}' due to new entity mention: '{entity}'")
            return True
    
    # APPROACH 4: Check for question type - certain types of questions indicate topic changes
    question_starters = [
        "what", "how", "can you", "do you have", "is there", "are there", 
        "tell me about", "show me", "find", "search"
    ]
    
    if any(normalized_question.startswith(starter) for starter in question_starters) and current_character not in normalized_question:
        logging.info(f"Resetting character context from '{current_character}' due to new question type")
        return True
    
    # If none of the above cases triggered, keep the character context
    return False