# Importing necessary libraries
from dotenv import load_dotenv
import os
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import TextLoader
from conversation_context import conversation_manager

# Importing Database
from supabase import create_client, Client

# Importing Flask to make Python work with React
from flask import Flask, request, jsonify
from flask_cors import CORS

from character_search import (
    search_database_for_character,
    detect_character_in_query,
    extract_character_from_history,
    detect_content_type,
    get_recent_conversation_history
)
from conversation_template import (
    create_template_with_context,
    is_short_response
)

# Importing regex, random, datetime, and logging
import re
import random
import datetime
import logging
import json
import threading
import time

# Import the kid_friendly module
from kid_friendly_responses import make_kid_friendly

# Import title search helpers
from title_search import check_title_query
from fts_search import initialize_search_engine, search_for_title as fts_search_for_title

# Load environment variables
load_dotenv()

# Flask app setup
app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)

# AI model setup
api_key: str = os.getenv('key')
model: str = "deepseek-r1-distill-llama-70b"
deepseek = ChatGroq(api_key=api_key, model_name=model)
parser = StrOutputParser()
deepseek_chain = deepseek | parser

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define the status values for content
CONTENT_STATUS = {
    "PENDING": "pending",     # Content is awaiting approval
    "APPROVED": "approved",   # Content has been approved for display
    "DENIED": "denied",         # Content has been rejected
    "SUSPENDED": "suspended"    # Content is archived (not active)
}

# Initialize FTS Search Engine
try:
    search_engine = initialize_search_engine(supabase, CONTENT_STATUS)
    logging.info("SQLite FTS5 search engine initialized successfully")
    USE_FTS_SEARCH = True
except Exception as e:
    logging.error(f"Failed to initialize FTS search engine: {e}")
    logging.warning("Falling back to original search method")
    USE_FTS_SEARCH = False

# Modified version of the original search_for_title function that uses FTS5 when available
def search_for_title(title, uaid_child, supabase_client, get_child_age, is_genre_blocked, content_status):
    """
    Search for content by title, using FTS5 if available or falling back to original method.
    """
    if USE_FTS_SEARCH:
        try:
            # Use the FTS5 search implementation
            return fts_search_for_title(
                title=title,
                uaid_child=uaid_child,
                supabase_client=supabase_client,
                get_child_age=get_child_age,
                is_genre_blocked=is_genre_blocked,
                content_status=content_status
            )
        except Exception as e:
            logging.error(f"FTS search error: {e}. Falling back to original search")
            # If FTS search fails, fall back to original implementation
            from title_search import search_for_title as original_search_for_title
            return original_search_for_title(
                title=title,
                uaid_child=uaid_child,
                supabase_client=supabase_client,
                get_child_age=get_child_age,
                is_genre_blocked=is_genre_blocked,
                content_status=content_status
            )
    else:
        # Use the original implementation
        from title_search import search_for_title as original_search_for_title
        return original_search_for_title(
            title=title,
            uaid_child=uaid_child,
            supabase_client=supabase_client,
            get_child_age=get_child_age,
            is_genre_blocked=is_genre_blocked,
            content_status=content_status
        )

def save_chat_to_database(context, is_chatbot, uaid_child):
    try:
        timestamp = datetime.datetime.now().isoformat()

        # 🔍 Add log here to see the ID being used
        logging.info(f"[DB Insert] uaid_child being used: {uaid_child}")
        logging.info(f"[DB Insert] Context: {context}")
        logging.info(f"[DB Insert] is_chatbot: {is_chatbot}")

        # Insert into temp_chathistory
        response = supabase.from_("temp_chathistory").insert({
            "context": context,
            "ischatbot": is_chatbot,
            "createddate": timestamp,
            "uaid_child": uaid_child
        }).execute()

        logging.info(f"Response from insert: {response}")

        if 'data' not in response or not response['data']:
            logging.error(f"Failed to save chat: {response}")
            return

        chat_history_id = response['data'][0].get("chid") if response['data'] else None
        if not chat_history_id:
            raise Exception("No chat history ID returned.")

        logging.info(f"Chat successfully saved with ID {chat_history_id} and linked to user {uaid_child}")

    except Exception as e:
        logging.error(f"Error saving chat: {e}")

# Read static context
def read_data_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return file.read()
    except FileNotFoundError:
        logging.error(f"File {file_path} not found.")
        return None
    except Exception as e:
        logging.error(f"Error reading file {file_path}: {e}")
        return None

# Get child's age from user_account
def get_child_age(uaid_child):
    try:
        # Query the user_account table to get the child's age
        result = supabase.from_("user_account").select("age").eq("id", uaid_child).single().execute()
        
        if result.data and "age" in result.data:
            return result.data["age"]
        else:
            logging.warning(f"Age not found for child {uaid_child}, defaulting to 10")
            return 10  # Default age if not found
    except Exception as e:
        logging.error(f"Error fetching child age: {e}")
        return 10  # Default age on error

# Check if a genre is blocked for a specific child
def is_genre_blocked(genre_name, uaid_child):
    try:
        # First, get the genre ID from the genre name
        genre_id_query = supabase.from_("temp_genre").select("gid").ilike("genrename", f"%{genre_name}%").execute()
        
        if not genre_id_query.data:
            logging.warning(f"Genre '{genre_name}' not found in the database")
            return False
            
        genre_id = genre_id_query.data[0]["gid"]
        
        # Then check if this genre ID is blocked for this child
        blocked_query = supabase.from_("blockedgenres").select("*").eq("child_id", uaid_child).eq("genreid", genre_id).execute()
        
        # If any results are returned, the genre is blocked
        return len(blocked_query.data) > 0
    except Exception as e:
        logging.error(f"Error checking if genre is blocked: {e}")
        return False

# Content fetch function with blocked genre and age-appropriate handling
def get_content_by_genre_and_format(question, uaid_child):
    try:
        # Set up logging for this request
        request_id = f"req_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"
        logging.info(f"[{request_id}] Starting content query for question: '{question}' from child: {uaid_child}")
        
        # Get child's age for age-appropriate content
        child_age = get_child_age(uaid_child)
        logging.info(f"[{request_id}] Child age: {child_age}")
        
        # Get all available genres
        genres_query = supabase.from_("temp_genre").select("genrename").execute()
        if not genres_query.data:
            logging.error(f"[{request_id}] No genres found in database")
            return {"error": "No genres found in the database"}

        genres = [genre["genrename"].lower() for genre in genres_query.data]
        logging.info(f"[{request_id}] Available genres: {genres}")
        
        # Define format keywords for content type detection
        format_keywords = {
            "read": 2, "story": 2, "watch": 1, "movie": 1,
            "video": 1, "book": 2, "books": 2, "videos": 1
        }

        # Normalize the question and detect genre
        normalized_question = re.sub(r'[^\w\s]', '', question).strip().lower()
        detected_genre = next((genre for genre in genres if genre in normalized_question), None)
        detected_format = next((word for word in question.split() if word.lower() in format_keywords), None)
        cfid = format_keywords.get(detected_format.lower(), None) if detected_format else None

        logging.info(f"[{request_id}] Detected genre: {detected_genre}, format: {detected_format}, cfid: {cfid}")

        if not detected_genre:
            logging.warning(f"[{request_id}] Unable to detect genre from question")
            return {"error": "Unable to detect genre from the question"}
        
        
        # Check if the detected genre is blocked for this child
        is_blocked = is_genre_blocked(detected_genre, uaid_child)
        logging.info(f"[{request_id}] Genre '{detected_genre}' blocked for child {uaid_child}: {is_blocked}")
        
        if is_blocked:
            logging.info(f"[{request_id}] Blocked genre '{detected_genre}' requested by child {uaid_child}")
            return {
                "error": "This genre is not available",
                "blocked": True,
                "requested_genre": detected_genre
            }

        # Build query to get content for the detected genre with status filter for approved content
        query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
            )
            .ilike("temp_genre.genrename", f"%{detected_genre}%")
            # Filter by approved status
            .eq("temp_content.status", CONTENT_STATUS["APPROVED"])
        )

        # Log the query being executed
        logging.info(f"[{request_id}] Executing query with status filter: status={CONTENT_STATUS['APPROVED']}")

        # Filter by content format if specified
        if cfid:
            query = query.eq("temp_content.cfid", cfid)
            logging.info(f"[{request_id}] Added format filter: cfid={cfid}")

        # Execute the query and log results
        response = query.execute()
        logging.info(f"[{request_id}] Query returned {len(response.data) if response.data else 0} results")
        
        # Log a sample of returned content IDs and statuses
        if response.data and len(response.data) > 0:
            sample_content = []
            for item in response.data[:min(3, len(response.data))]:
                if "temp_content" in item and item["temp_content"]:
                    content = item["temp_content"]
                    sample_content.append({
                        "cid": content.get("cid"),
                        "title": content.get("title"),
                        "status": content.get("status"),
                        "cfid": content.get("cfid"),
                        "minimumage": content.get("minimumage")
                    })
            logging.info(f"[{request_id}] Sample content: {json.dumps(sample_content)}")
        
        if not response.data:
            logging.warning(f"[{request_id}] No content found for genre '{detected_genre}' with status 'approved'")
            return {"error": "No content found for the given genre and format"}

        # Separate books and videos and filter by age appropriateness
        filtered_books = []
        filtered_videos = []

        for item in response.data:
            if "temp_content" in item and item["temp_content"]:
                content = item["temp_content"]
                
                # Log content item being processed
                logging.debug(f"[{request_id}] Processing content: cid={content.get('cid')}, " 
                             f"title='{content.get('title')}', status='{content.get('status')}', "
                             f"minimumage={content.get('minimumage')}, cfid={content.get('cfid')}")
                
                # Skip content that's not age-appropriate
                if "minimumage" in content and content["minimumage"] is not None:
                    if int(content["minimumage"]) > child_age:
                        logging.debug(f"[{request_id}] Skipping content cid={content.get('cid')} due to age restriction "
                                     f"(minimumage={content.get('minimumage')} > child_age={child_age})")
                        continue
                
                if content["cfid"] == 2:
                    filtered_books.append(content)
                    logging.debug(f"[{request_id}] Added book: cid={content.get('cid')}, title='{content.get('title')}'")
                elif content["cfid"] == 1:
                    filtered_videos.append(content)
                    logging.debug(f"[{request_id}] Added video: cid={content.get('cid')}, title='{content.get('title')}'")

        # Log age-appropriate content counts
        logging.info(f"[{request_id}] After age filtering: {len(filtered_books)} books, {len(filtered_videos)} videos")

        # If no age-appropriate content is found
        if not filtered_books and not filtered_videos:
            logging.warning(f"[{request_id}] No age-appropriate content found for genre '{detected_genre}' and child age {child_age}")
            return {
                "error": "No age-appropriate content found",
                "age_restricted": True,
                "child_age": child_age,
                "genre": detected_genre
            }

        # Randomly select a subset of items if there are too many
        if filtered_books:
            filtered_books = random.sample(filtered_books, min(5, len(filtered_books)))
            logging.info(f"[{request_id}] Selected {len(filtered_books)} books randomly")
        if filtered_videos:
            filtered_videos = random.sample(filtered_videos, min(5, len(filtered_videos)))
            logging.info(f"[{request_id}] Selected {len(filtered_videos)} videos randomly")

        logging.info(f"[{request_id}] Returning content: {len(filtered_books)} books, {len(filtered_videos)} videos")
        
        # Log the final CIDs being returned
        book_cids = [book.get("cid") for book in filtered_books]
        video_cids = [video.get("cid") for video in filtered_videos]
        logging.info(f"[{request_id}] Returning book CIDs: {book_cids}")
        logging.info(f"[{request_id}] Returning video CIDs: {video_cids}")

        return {
            "genre": detected_genre,
            "books": filtered_books,
            "videos": filtered_videos,
            "child_age": child_age
        }

    except Exception as e:
        logging.error(f"Database query failed: {e}", exc_info=True)
        return {"error": "Database query failed"}

# Main chatbot route with improved context handling

def should_reset_character_context(question, recent_history, existing_context):
    """
    Determine if the character context should be reset based on the user's new question.
    
    Args:
        question: The current user question
        recent_history: Recent conversation history
        existing_context: The current conversation context
        
    Returns:
        Boolean indicating if character context should be reset
    """
    # If there's no character in existing context, no need to reset
    if not existing_context or 'character' not in existing_context:
        return False
    
    current_character = existing_context.get('character')
    normalized_question = question.lower()
    
    # Case 1: User explicitly asks for a different character
    character_list = [
        "spongebob", "peppa pig", "paw patrol", "harry potter", "tom and jerry",
        "dora", "mickey mouse", "lego", "superhero", "princess", "frozen", 
        "elsa", "pokemon", "barbie", "disney", "marvel", "batman", "spiderman"
    ]
    
    for character in character_list:
        # Skip the current character
        if character == current_character:
            continue
            
        # If a different character is mentioned, we should reset
        if character in normalized_question:
            logging.info(f"Resetting character context from '{current_character}' to '{character}' due to explicit mention")
            return True
    
    # Case 2: User explicitly asks for a different genre or category
    genre_indicators = [
        "adventure", "mystery", "science", "math", "animals", "dinosaurs", 
        "space", "ocean", "forest", "fairy tale", "history", "sports",
        "music", "dance", "art", "food", "travel", "nature"
    ]
    
    for genre in genre_indicators:
        if genre in normalized_question:
            logging.info(f"Resetting character context from '{current_character}' due to genre change to '{genre}'")
            return True
    
    # Case 3: User is asking about a specific title that doesn't contain the character
    title_phrases = ["book called", "book titled", "book about", "story about", "video about"]
    
    for phrase in title_phrases:
        if phrase in normalized_question and current_character not in normalized_question:
            logging.info(f"Resetting character context from '{current_character}' due to specific title request")
            return True
    
    # Case 4: Direct change of topic indicators
    change_indicators = [
        "different", "something else", "another book", "another video", 
        "other books", "other videos", "instead", "not interested", 
        "don't want", "don't like", "change", "new topic"
    ]
    
    for indicator in change_indicators:
        if indicator in normalized_question:
            logging.info(f"Resetting character context from '{current_character}' due to topic change indicator")
            return True
    
    # Case 5: Check if the current exchange is simply unrelated to the character
    # This is more complex and requires analyzing the full question
    # Look for content requests that don't mention the character
    content_requests = [
        "show me", "find me", "can i see", "do you have", 
        "i want to see", "i want to read", "recommend", "suggest"
    ]
    
    for request in content_requests:
        if request in normalized_question and current_character not in normalized_question:
            # This might be a request for something unrelated to the character
            logging.info(f"Resetting character context from '{current_character}' due to unrelated content request")
            return True
    
    # If none of the above cases match, keep the character context
    return False

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    raw_question = data.get("question", "")
    uaid_child = data.get("uaid_child")
    question = raw_question.strip()
    normalized_question = re.sub(r'[^\w\s]', '', raw_question).strip().lower()

    if not normalized_question:
        return jsonify({"error": "No question provided"}), 400
    
    # Handling none values - prevent chatbot error
    def safe_template_add(base_template, additional_text):
        if base_template is None:
            return additional_text
        return base_template + additional_text

    # Save user input to chat history
    save_chat_to_database(context=raw_question, is_chatbot=False, uaid_child=uaid_child)

    # Get the child's age
    child_age = get_child_age(uaid_child)
    
    # Get recent conversation history
    recent_history = get_recent_conversation_history(uaid_child, supabase, limit=5)
    logging.info(f"Retrieved {len(recent_history)} recent messages for context")
    
    # Get existing conversation context
    existing_context = conversation_manager.get_context(uaid_child)
    logging.info(f"Retrieved existing context: {existing_context}")
    
    # Check if this is a short/affirmative response
    short_response = is_short_response(normalized_question)
    
    # Check for location references ("here", "this one", etc.)
    location_references = ["here", "this one", "that one", "these", "those"]
    has_location_reference = any(ref in normalized_question for ref in location_references)
    
    # Detect character mentions in the current query
    character_query = detect_character_in_query(normalized_question)
    
    # Check if we should reset character context before using it
    if not character_query and existing_context and 'character' in existing_context:
        if should_reset_character_context(question, recent_history, existing_context):
            # Reset the character context if needed
            conversation_manager.clear_context(uaid_child, 'character')
            logging.info(f"Cleared character context for user {uaid_child}")
        else:
            # Only use the character from context if we shouldn't reset
            character_query = existing_context['character']
            logging.info(f"Using character from existing context: {character_query}")
    # If still no character, check recent history
    elif not character_query and recent_history:
        character_query = extract_character_from_history(recent_history)
    
    # If we found a character, store it in context
    if character_query:
        conversation_manager.update_context(uaid_child, 'character', character_query)
        logging.info(f"Updated conversation context with character: {character_query}")
    
    # Detect content type request (videos/books)
    content_type = detect_content_type(normalized_question)
    
    # If no content type in query but we have a short response, check context
    if not content_type and (short_response or has_location_reference) and existing_context and 'content_type' in existing_context:
        content_type = existing_context['content_type']
        logging.info(f"Using content type from context: {content_type}")
    
    # Store content type in context if found
    if content_type:
        conversation_manager.update_context(uaid_child, 'content_type', content_type)
        logging.info(f"Updated conversation context with content type: {content_type}")
    
    # Combine character and content type for search if we have both
    combined_query = None
    if character_query:
        if content_type:
            # Combine character with content type
            combined_query = f"{character_query} {content_type}"
            logging.info(f"Created combined query: '{combined_query}'")
        else:
            # Just use character
            combined_query = character_query
    
    # If we have a combined or character query, search for it
    db_content = None
    if combined_query:
        logging.info(f"Searching database for: '{combined_query}'")
        
        # Check if it's a title query first
        is_title_query, _ = check_title_query(combined_query)
        
        if is_title_query:
            # Use title search if it looks like a title query
            db_content = search_for_title(
                title=combined_query,
                uaid_child=uaid_child,
                supabase_client=supabase,
                get_child_age=get_child_age,
                is_genre_blocked=is_genre_blocked,
                content_status=CONTENT_STATUS
            )
        else:
            # Use character search otherwise
            db_content = search_database_for_character(
                character=character_query,
                uaid_child=uaid_child,
                supabase=supabase,
                get_child_age=get_child_age,
                is_genre_blocked=is_genre_blocked,
                content_status=CONTENT_STATUS,
                content_type=content_type
            )
        
        # If we found actual content, respond with it
        if db_content and (db_content.get("books") or db_content.get("videos")):
            save_chat_to_database(
                context=f"Found {combined_query if combined_query else character_query} content", 
                is_chatbot=True, 
                uaid_child=uaid_child
            )
            logging.info(f"Returning direct database content for {combined_query if combined_query else character_query}")
            return jsonify(db_content)
    
   # If it's a short response or we have character context but no direct content match,
    # use LLM with conversation context
    if short_response or has_location_reference or character_query:
        # Helper function to safely add to templates
        def safe_template_add(base_template, additional_text):
            if base_template is None:
                return additional_text
            return base_template + additional_text
        
        # Read context from file
        context_from_file = read_data_from_file("data.txt")
        if context_from_file is None:
            return jsonify({"error": "Failed to read context from file"}), 500
        
        # Create template with conversation context
        template_with_context = create_template_with_context(
            conversation_history=recent_history,
            context_from_file=context_from_file,
            question=question,
            child_age=child_age,
            character=character_query
        )
        
        # Check if template_with_context is None and create a default if needed
        if template_with_context is None:
            logging.warning("create_template_with_context returned None, using default template")
            template_with_context = f"""
            You are an AI-powered chatbot designed to provide recommendations for books and videos for children.
            
            The child (age {child_age}) has asked: "{question}"
            
            Please respond in a helpful, kid-friendly way that's appropriate for a {child_age}-year-old.
            """
        
        # Add specific context information for short responses - safely
        if short_response and character_query:
            template_with_context = safe_template_add(
                template_with_context,
                f"\n\nIMPORTANT: The child is responding to your previous message about {character_query} with '{question}'. They likely want to see {character_query} content."
            )
        
        if short_response and content_type and not character_query:
            template_with_context = safe_template_add(
                template_with_context,
                f"\n\nIMPORTANT: The child is asking for {content_type}. Please suggest appropriate {content_type} for a {child_age}-year-old."
            )
        
        if has_location_reference and existing_context:
            context_info = ", ".join([f"{k}: {v}" for k, v in existing_context.items()])
            template_with_context = safe_template_add(
                template_with_context,
                f"\n\nIMPORTANT: The child is referring to something previously mentioned. Current context: {context_info}"
            )
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the kid-friendly function
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response with context failed: {e}")
            # Fall back to regular processing if this fails
    
    # Special handling for recommendation queries that mention specific genres
    if normalized_question.startswith("recommend") or "recommend" in normalized_question:
        # Get all available genres
        genres_query = supabase.from_("temp_genre").select("genrename").execute()
        if genres_query.data:
            genres = [genre["genrename"].lower() for genre in genres_query.data]
            
            # Check if any genre is mentioned
            detected_genre = None
            for genre in genres:
                if genre.lower() in normalized_question:
                    detected_genre = genre
                    logging.info(f"Detected genre '{detected_genre}' in recommendation query")
                    break
            
            # Explicitly detect and handle content type for recommendations
            recommendation_content_type = None
            recommendation_cfid = None
            
            if "book" in normalized_question or "books" in normalized_question:
                recommendation_content_type = "books"
                recommendation_cfid = 2  # Books
                logging.info(f"Recommendation specifically for BOOKS")
            elif "video" in normalized_question or "videos" in normalized_question:
                recommendation_content_type = "videos"
                recommendation_cfid = 1  # Videos
                logging.info(f"Recommendation specifically for VIDEOS")
            
            # Update context with content type if detected
            if recommendation_content_type:
                conversation_manager.update_context(uaid_child, 'content_type', recommendation_content_type)
            
            # If a genre was detected, craft a special query with explicit format
            if detected_genre:
                # Create a modified query that will be correctly parsed by get_content_by_genre_and_format
                modified_question = question
                
                # If we detected a specific content type but it's not in the original question,
                # make sure it's included in the modified question
                if recommendation_content_type and recommendation_content_type not in normalized_question:
                    modified_question = f"{question} {recommendation_content_type}"
                
                content_response = get_content_by_genre_and_format(modified_question, uaid_child)
                
                if content_response and "genre" in content_response and not "error" in content_response:
                    # Successfully found content for the genre
                    return jsonify(content_response)
            
    # If no specific character/content request, check if it's a title query
    is_title_query, title = check_title_query(question)
    if is_title_query and title:
        # Store the title in conversation context
        conversation_manager.update_context(uaid_child, 'title', title)
        
        # Check for popular characters to maintain character context
        character_list = [
            "spongebob", "peppa pig", "harry potter", "dora", "superman", 
            "batman", "elsa", "mickey mouse", "paw patrol", "tom and jerry"
        ]
        
        # If title mentions a new character, update character context
        for character in character_list:
            if character.lower() in title.lower():
                # If it's a different character than what we have in context, update it
                if existing_context and 'character' in existing_context and character != existing_context['character']:
                    logging.info(f"Switching character context from '{existing_context['character']}' to '{character}' based on title request")
                
                conversation_manager.update_context(uaid_child, 'character', character)
                character_query = character
                logging.info(f"Updated character context to '{character}' from title '{title}'")
                break
        
        # Search for the specified title
        title_content = search_for_title(
            title=title, 
            uaid_child=uaid_child, 
            supabase_client=supabase, 
            get_child_age=get_child_age, 
            is_genre_blocked=is_genre_blocked, 
            content_status=CONTENT_STATUS
        )
        
        if "error" not in title_content:
            # Save the title search response to chat history
            save_chat_to_database(
                context=f"Found content for: {title}", 
                is_chatbot=True, 
                uaid_child=uaid_child
            )
            return jsonify(title_content)
    
    # If we reach here, continue with genre-based content processing
    content_response = get_content_by_genre_and_format(question, uaid_child)
    
    # If a genre was detected, store it in the conversation context
    if "genre" in content_response and content_response["genre"]:
        conversation_manager.update_context(uaid_child, 'genre', content_response["genre"])
        logging.info(f"Updated context with genre: {content_response['genre']}")
        
        # If we detected a genre and had a character context, consider resetting the character
        # This helps prevent the character context from persisting too long
        if existing_context and 'character' in existing_context:
            genre = content_response["genre"]
            # If the genre doesn't naturally relate to the character, reset character context
            character = existing_context['character']
            character_related_genres = {
                "spongebob": ["undersea", "cartoon"],
                "peppa pig": ["cartoon", "family"],
                "harry potter": ["magic", "fantasy", "wizards"],
                # Add more character-genre relationships as needed
            }
            
            # If the character has related genres defined and this genre isn't one of them
            if character in character_related_genres and genre.lower() not in character_related_genres[character]:
                conversation_manager.clear_context(uaid_child, 'character')
                logging.info(f"Cleared character '{character}' context due to unrelated genre '{genre}'")
    elif "error" in content_response and "Unable to detect genre from the question" in content_response.get("error", ""):
        logging.info(f"Handling potential genre recommendation request: '{question}'")
        
        # Try to handle special cases like "Recommend other genres"
        special_handler_response = handle_genre_recommendation(
            question=question,
            child_age=child_age,
            existing_context=existing_context,
            uaid_child=uaid_child
        )
        
        if special_handler_response:
            logging.info(f"Successfully handled genre recommendation request")
            return jsonify(special_handler_response)
        
        # If this wasn't a genre recommendation request or it failed,
        # create a generic AI response about genres
        logging.info(f"Not a genre recommendation request, creating generic AI response")
        context_from_file = read_data_from_file("data.txt")
        if context_from_file is None:
            context_from_file = "You are an AI chatbot that recommends books and videos for children."
        
        # Create a generic template that's guaranteed not to be None
        generic_template = f"""
        You are an AI-powered chatbot designed to provide recommendations for books and videos for children.
        
        The child (age {child_age}) has asked: "{question}"
        
        Since I couldn't detect a specific genre in their question, please:
        1. Respond in a helpful, kid-friendly way
        2. Suggest a few popular genres they might be interested in
        3. Use simple language for a {child_age}-year-old
        4. Be enthusiastic and encouraging!
        
        Additional context information: {", ".join([f"{k}: {v}" for k, v in existing_context.items()]) if existing_context else "No additional context available"}
        """
        
        try:
            ai_answer = deepseek_chain.invoke(generic_template)
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response failed: {e}")
            # Provide a fallback response even if the AI fails
            fallback_response = "I'd be happy to recommend some books and videos! Would you like adventure stories, animal books, or maybe something about science?"
            save_chat_to_database(context=fallback_response, is_chatbot=True, uaid_child=uaid_child)
            return jsonify({"answer": fallback_response})
        
    # Handle blocked genres with alternative suggestions
    if "error" in content_response and content_response.get("blocked"):
        context_from_file = read_data_from_file("data.txt")
        if context_from_file is None:
            return jsonify({"error": "Failed to read context from file"}), 500
            
        # Create template with conversation context
        template_with_context = create_template_with_context(
            conversation_history=recent_history,
            context_from_file=context_from_file,
            question=f"The child asked for {content_response.get('requested_genre', 'certain')} content, but this is not available. Please suggest other kid-friendly genres and explain that this content isn't available right now. Be gentle and positive.",
            child_age=child_age
        )
        
        # Check if template is None
        if template_with_context is None:
            template_with_context = f"""
            You are an AI-powered chatbot designed to help children find age-appropriate content.
            
            The child (age {child_age}) asked for {content_response.get('requested_genre', 'certain')} content, 
            but this content is not available. Please suggest other kid-friendly genres and explain 
            that this content isn't available right now. Be gentle and positive in your response.
            """
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the kid-friendly function
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            
            # Return the alternate content suggestion
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response for alternative content failed: {e}")
            return jsonify({"error": "AI response failed"}), 500
    
    # Handle age-restricted content
    if "error" in content_response and content_response.get("age_restricted"):
        context_from_file = read_data_from_file("data.txt")
        if context_from_file is None:
            return jsonify({"error": "Failed to read context from file"}), 500
            
        # Create template with conversation context
        template_with_context = create_template_with_context(
            conversation_history=recent_history,
            context_from_file=context_from_file,
            question=f"The child (age {child_age}) asked for {content_response.get('genre', 'certain')} content, but we only have content for older kids. Please suggest age-appropriate alternatives and explain in a child-friendly way. Be gentle and positive.",
            child_age=child_age
        )
        
        # Check if template is None
        if template_with_context is None:
            template_with_context = f"""
            You are an AI-powered chatbot designed to help children find age-appropriate content.
            
            The child (age {child_age}) asked for {content_response.get('genre', 'certain')} content, 
            but we only have this content for older kids. Please suggest age-appropriate alternatives
            and explain in a child-friendly way. Be gentle and positive in your response.
            """
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the kid-friendly function
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            
            # Return the age-appropriate suggestions
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response for age-appropriate content failed: {e}")
            return jsonify({"error": "AI response failed"}), 500
        
    # If no content at all, use AI with conversation context
    if "error" in content_response or (
        not content_response.get("books") and not content_response.get("videos")
    ):
        # Helper function to safely add to templates
        def safe_template_add(base_template, additional_text):
            if base_template is None:
                return additional_text
            return base_template + additional_text
        
        context_from_file = read_data_from_file("data.txt")
        if context_from_file is None:
            return jsonify({"error": "Failed to read context from file"}), 500
        
        # Create template with conversation context
        template_with_context = create_template_with_context(
            conversation_history=recent_history,
            context_from_file=context_from_file,
            question=question,
            child_age=child_age,
            character=character_query
        )
        
        # Check if template_with_context is None before adding to it
        if template_with_context is None:
            # Create a basic template if the normal template creation failed
            template_with_context = f"""
            You are an AI-powered chatbot designed to provide 
            recommendations for books and videos for children.
            
            Question: {question}
            Child's Age: {child_age}
            """
        
        # Include context information in the prompt (safely)
        if existing_context:
            context_info = ", ".join([f"{k}: {v}" for k, v in existing_context.items()])
            template_with_context = safe_template_add(
                template_with_context,
                f"\n\nAdditional context information: {context_info}"
            )
        else:
            # Create a basic template if the normal template creation failed
            template_with_context = f"""
            You are an AI-powered chatbot designed to provide 
            recommendations for books and videos for children.
            
            Question: {question}
            Child's Age: {child_age}
            """
            if existing_context:
                context_info = ", ".join([f"{k}: {v}" for k, v in existing_context.items()])
                template_with_context += f"\n\nAdditional context information: {context_info}"
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the kid-friendly function
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response failed: {e}")
            return jsonify({"error": "AI response failed"}), 500
        # If we have content, return it
    save_chat_to_database(context=str(content_response), is_chatbot=True, uaid_child=uaid_child)
    return jsonify(content_response)

# Add this function to handle specific cases like "Recommend other genres"

def handle_genre_recommendation(question, child_age, existing_context, uaid_child):
    """
    Handle specific requests like "Recommend other genres" when no genre is detected.
    
    Args:
        question: The user's question
        child_age: Child's age
        existing_context: The current conversation context
        uaid_child: Child's user ID
        
    Returns:
        Response dictionary or None if not handled
    """
    normalized_question = question.lower()
    
    # Check if this is a request for genre recommendations
    genre_request_patterns = [
        "recommend genres", "recommend other genres", "suggest genres", 
        "what genres", "other genres", "different genres"
    ]
    
    is_genre_request = any(pattern in normalized_question for pattern in genre_request_patterns)
    
    if is_genre_request:
        try:
            # Get all available genres from the database
            genres_query = supabase.from_("temp_genre").select("genrename").execute()
            
            if not genres_query.data:
                return None  # Fall back to regular processing
                
            # Get all genres
            all_genres = [genre["genrename"] for genre in genres_query.data]
            
            # Filter out any blocked genres for this child
            available_genres = []
            for genre in all_genres:
                if not is_genre_blocked(genre, uaid_child):
                    available_genres.append(genre)
            
            # Only keep age-appropriate genres (this would require additional logic)
            # For now, we'll assume all genres can be age-appropriate
            
            # Get current/previous genre if any
            current_genre = None
            if existing_context and 'genre' in existing_context:
                current_genre = existing_context['genre']
            
            # Create a context prompt for the AI
            context_from_file = read_data_from_file("data.txt")
            if context_from_file is None:
                return None  # Fall back to regular processing
                
            # Create a specialized prompt
            genre_prompt = f"""
            You are an AI-powered chatbot designed to recommend genres for children's books and videos.
            
            The child (age {child_age}) has asked for genre recommendations: "{question}"
            
            Available genres in our system: {", ".join(available_genres)}
            
            {f"The child has previously shown interest in the '{current_genre}' genre." if current_genre else ""}
            
            Please suggest 4-5 age-appropriate genres from the available list. For each genre, briefly explain what 
            kind of books or videos they would find in that genre. Be enthusiastic and kid-friendly in your explanation!
            
            Remember:
            - Use simple language appropriate for a {child_age}-year-old
            - Keep your explanations short and fun
            - Don't recommend anything scary or inappropriate for children
            - Make your response engaging and encouraging
            """
            
            # Get AI response
            ai_answer = deepseek_chain.invoke(genre_prompt)
            
            # Make it kid-friendly
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            
            # Save to chat history
            save_chat_to_database(
                context=kid_friendly_answer, 
                is_chatbot=True, 
                uaid_child=uaid_child
            )
            
            return {"answer": kid_friendly_answer}
            
        except Exception as e:
            logging.error(f"Error handling genre recommendation: {e}")
            return None  # Fall back to regular processing
            
    return None  # Not a genre recommendation request

# Standard response endpoints for common questions
@app.route('/api/standard-responses', methods=['GET'])
def get_standard_responses():
    # Return predefined responses for common questions
    return jsonify({
        "greetings": [
            "Hi there! I'm CoReadability, a bot that recommends books and videos for kids like you!",
            "Hello! I'm here to help you find amazing books and videos to enjoy!",
            "What's up? I'm CoReadability! I can help you discover awesome books and videos!"
        ],
        "off_topic": "I can't help you with that, but I can help you look for a book or video!",
        "request_for_definition": "I'd be happy to explain what that word means in a way that's easy to understand.",
        "default_recommendations": {
            "books": "I recommend books about adventure, animals, and friendship!",
            "videos": "I recommend videos about nature, space, and fun science experiments!"
        }
    })

# Run the Flask app
if __name__ == '__main__':
    try:
        # Start the Flask app
        app.run(debug=True)
        # port = int(os.environ.get("PORT", 5000))
        # app.run(host="0.0.0.0", port=port, debug=False)
    except KeyboardInterrupt:
        # When you press Ctrl+C to stop the server, run the debug function
        from fts_search import debug_title_search
        print("\nRunning debug for title search...")
        debug_title_search(search_title="counting cabbage")
        debug_title_search(search_title="Counting Cabbage")  # Try with proper case