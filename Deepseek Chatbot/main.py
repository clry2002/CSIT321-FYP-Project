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
    get_recent_conversation_history,
    should_reset_character_context
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

from recommendation_handler import handle_recommendation_request

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
# Full implementation of get_content_by_genre_and_format with message generation

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
            "read": 2, "story": 2, "stories": 2, "watch": 1, "movie": 1, "movies": 1,
            "video": 1, "videos": 1, "book": 2, "books": 2
        }

        # Normalize the question and detect genre
        normalized_question = re.sub(r'[^\w\s]', '', question).strip().lower()
        detected_genre = next((genre for genre in genres if genre in normalized_question), None)

        # Improved format detection for mixed content requests
        detected_format = None
        cfid = None
        has_book_keyword = any(keyword in normalized_question for keyword in ["book", "books", "read", "story", "stories"])
        has_video_keyword = any(keyword in normalized_question for keyword in ["video", "videos", "watch", "movie", "movies"])

        # If both types are mentioned, don't set a specific format
        if has_book_keyword and has_video_keyword:
            detected_format = "both"
            cfid = None  # No specific format ID when requesting both
        else:
            # Original single format detection logic
            for keyword, format_id in format_keywords.items():
                if keyword in normalized_question:
                    detected_format = keyword
                    cfid = format_id
                    # If we specifically find "book" or "video" words, prioritize them
                    if keyword in ["book", "books", "video", "videos"]:
                        break
                
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
        logging.info(f"[{request_id}] Format detection - detected_format: {detected_format}, cfid: {cfid}")

        # Filter by content format if specified
        if cfid is not None:
            query = query.eq("temp_content.cfid", cfid)
            logging.info(f"[{request_id}] Added format filter: cfid={cfid}")
        else:
            # Log when no format filter is applied, either because none was detected or "both" was requested
            logging.info(f"[{request_id}] No format filter applied - including all content types")

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

        # Add a friendly message
        book_count = len(filtered_books)
        video_count = len(filtered_videos)
        
        # Create content description
        content_desc = []
        if book_count > 0:
            content_desc.append(f"{book_count} book{'s' if book_count != 1 else ''}")
        if video_count > 0:
            content_desc.append(f"{video_count} video{'s' if video_count != 1 else ''}")
        
        content_desc_text = " and ".join(content_desc)
        
        # Generate friendly messages
        messages = [
            f"I found some great {detected_genre} content for you! Here's {content_desc_text} that I think you'll enjoy.",
            f"Looking for {detected_genre}? You've come to the right place! I found {content_desc_text} for you.",
            f"Here are {content_desc_text} in the {detected_genre} category just for you!",
            f"I love {detected_genre} too! Here are {content_desc_text} that I think you'll really enjoy."
        ]
        
        # Select a random message for variety
        message = random.choice(messages)
        
        logging.info(f"[{request_id}] Generated message: {message}")

        return {
            "genre": detected_genre,
            "books": filtered_books,
            "videos": filtered_videos,
            "child_age": child_age,
            "message": message  # Add this message field to the response
        }

    except Exception as e:
        logging.error(f"Database query failed: {e}", exc_info=True)
        return {"error": "Database query failed"}

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
    
    # STEP 1: Check if it's a recommendation handler request (trending, popular, personalized)
    recommendation_response = handle_recommendation_request(
        question=question, 
        uaid_child=uaid_child, 
        conversation_manager=conversation_manager
    )
    
    if recommendation_response and "processed_by_recommendation_handler" in recommendation_response:
        # Save chatbot response to history
        save_chat_to_database(
            context=recommendation_response.get("message", "Here are some recommendations for you!"), 
            is_chatbot=True, 
            uaid_child=uaid_child
        )
        logging.info(f"Returning recommendation results with {len(recommendation_response.get('books', []))} books and {len(recommendation_response.get('videos', []))} videos")
        return jsonify(recommendation_response)
    
    # STEP 2: Check if it's a title search
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
        # Add a friendly message for the title search
            if "title" in locals() and title:  # Make sure title is defined
                # Create friendly message based on content found
                has_books = title_content.get("books") and len(title_content.get("books", [])) > 0
                has_videos = title_content.get("videos") and len(title_content.get("videos", [])) > 0
                
                if has_books and has_videos:
                    message = f"I found '{title}' in our collection! Here are some books and videos you might enjoy."
                elif has_books:
                    message = f"Great choice! I found '{title}' for you to read. Hope you enjoy it!"
                elif has_videos:
                    message = f"Perfect timing! I found '{title}' for you to watch. Enjoy the show!"
                else:
                    message = f"Found content matching '{title}'"
                    
                # Add message to the response
                title_content["message"] = message
            
            # Save the title search response to chat history
            chat_message = title_content.get("message", f"Found content for: {title}")
            save_chat_to_database(
                context=chat_message, 
                is_chatbot=True, 
                uaid_child=uaid_child
            )
            return jsonify(title_content)
    
    # STEP 3: Process genre detection
    content_response = None  # Initialize content_response variable
    genres_query = supabase.from_("temp_genre").select("genrename").execute()
    if genres_query.data:
        genres = [genre["genrename"].lower() for genre in genres_query.data]
        
        # Check if any genre is mentioned
        detected_genre = None
        for genre in genres:
            if genre.lower() in normalized_question:
                detected_genre = genre
                logging.info(f"HIGH PRIORITY: Detected genre request for '{detected_genre}'")
                break
        
        # Check if we have a processing flag from recommendation handler
        skip_genre_processing = False
        if existing_context and 'last_processed_by' in existing_context:
            if existing_context['last_processed_by'] == 'recommendation_handler' and detected_genre:
                logging.info(f"Skipping standard genre processing for '{detected_genre}' - already handled by recommendation handler")
                skip_genre_processing = True
                # Clear the flag for next time
                conversation_manager.clear_context(uaid_child, 'last_processed_by')
        
        if detected_genre and not skip_genre_processing:
            content_response = get_content_by_genre_and_format(question, uaid_child)
            
            # If we found database content, return it immediately
            if content_response and "genre" in content_response and "error" not in content_response:
                # Store genre in context without forcing content type
                conversation_manager.update_context(uaid_child, 'genre', detected_genre)
                
                # Check if the content_response has a message
                if "message" in content_response:
                    # Save just the message to chat history
                    save_chat_to_database(
                        context=content_response["message"], 
                        is_chatbot=True, 
                        uaid_child=uaid_child
                    )
                else:
                    # Add a friendly message if missing
                    # Count content items
                    book_count = len(content_response.get("books", []))
                    video_count = len(content_response.get("videos", []))
                    
                    # Create content description
                    content_desc = []
                    if book_count > 0:
                        content_desc.append(f"{book_count} book{'s' if book_count != 1 else ''}")
                    if video_count > 0:
                        content_desc.append(f"{video_count} video{'s' if video_count != 1 else ''}")
                    
                    content_desc_text = " and ".join(content_desc)
                    
                    # Generate friendly messages
                    messages = [
                        f"I found some great {detected_genre} content for you! Here's {content_desc_text} that I think you'll enjoy.",
                        f"Looking for {detected_genre}? You've come to the right place! I found {content_desc_text} for you.",
                        f"Here are {content_desc_text} in the {detected_genre} category just for you!",
                        f"I love {detected_genre} too! Here are {content_desc_text} that I think you'll really enjoy."
                    ]
                    
                    # Select a random message for variety
                    message = random.choice(messages)
                    content_response["message"] = message
                    
                    # Save to chat history
                    save_chat_to_database(
                        context=message, 
                        is_chatbot=True, 
                        uaid_child=uaid_child
                    )
                
                return jsonify(content_response)
    
    # STEP 4: Process character and context detection
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
            
    # Only extract from history for very specific cases
    elif not character_query and recent_history:
        # Only look in history for characters if user is clearly asking about characters
        character_phrases = ["who is", "character", "cartoon", "show me the", "about the"]
        explicitly_asking_for_character = any(phrase in normalized_question for phrase in character_phrases)
        
        # Or if it's a very short follow-up and we just talked about characters
        is_short_followup = len(normalized_question.split()) <= 3
        
        if explicitly_asking_for_character or (is_short_followup and recent_history[0].get('ischatbot', False)):
            character_query = extract_character_from_history(recent_history)
            if character_query:
                logging.info(f"Extracted character '{character_query}' from history for relevant query")
        
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
            # Add a friendly message
            character = character_query
            has_books = db_content.get("books") and len(db_content.get("books", [])) > 0
            has_videos = db_content.get("videos") and len(db_content.get("videos", [])) > 0
            
            # Count content items
            book_count = len(db_content.get("books", []))
            video_count = len(db_content.get("videos", []))
            
            # Create content description
            content_desc = []
            if book_count > 0:
                content_desc.append(f"{book_count} book{'s' if book_count != 1 else ''}")
            if video_count > 0:
                content_desc.append(f"{video_count} video{'s' if video_count != 1 else ''}")
            
            content_desc_text = " and ".join(content_desc)
            
            # Generate a friendly message
            if character:
                db_content["message"] = f"Here are {content_desc_text} featuring {character}! Enjoy!"
            else:
                db_content["message"] = f"I found {content_desc_text} that I think you'll enjoy!"
            
            save_chat_to_database(
                context=db_content["message"], 
                is_chatbot=True, 
                uaid_child=uaid_child
            )
            logging.info(f"Returning direct database content for {combined_query if combined_query else character_query}")
            return jsonify(db_content)
    
   # STEP 5: If it's a short response or we have character context but no direct content match,
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
    if content_response and "genre" in content_response and "error" not in content_response:
            if "message" in content_response:
            # Save just the friendly message to chat history
                save_chat_to_database(
                context=content_response["message"], 
                is_chatbot=True, 
                uaid_child=uaid_child
            )   
            else:
            # Create a default message if one is not present
                genre = content_response.get("genre", "")
                book_count = len(content_response.get("books", []))
                video_count = len(content_response.get("videos", []))
                
                # Create a friendly message based on content found
                if book_count > 0 and video_count > 0:
                    message = f"I found some great {genre} content for you! Here are {book_count} books and {video_count} videos."
                elif book_count > 0:
                    message = f"I found some great {genre} books for you! Here are {book_count} books to enjoy."
                elif video_count > 0:
                    message = f"I found some great {genre} videos for you! Here are {video_count} videos to enjoy."
                else:
                    message = f"Here's some content for: {genre}"
                
                # Add the message to the response
                content_response["message"] = message
                
                # Save the message
                save_chat_to_database(
                    context=message, 
                    is_chatbot=True, 
                    uaid_child=uaid_child
                )

            return jsonify(content_response)
    else:
        # If we reach here and have no valid content response, return an error
        return jsonify({"error": "Sorry, I couldn't find any content matching your request."})

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

# Add this to your main Flask application file

@app.route('/api/surprise', methods=['POST'])
def get_surprise():
    data = request.json
    uaid_child = data.get("uaid_child")
    
    if not uaid_child:
        return jsonify({"error": "No user ID provided"}), 400
    
    # Get child's age for age-appropriate content
    child_age = get_child_age(uaid_child)
    
    # Step 1: Try to identify favorite genres based on user interactions
    try:
        # Get user's top genres based on interaction scores
        interactions = (
            supabase
            .from_("userInteractions")
            .select("gid, score")
            .eq("uaid", uaid_child)
            .order("score", desc=True)  # Fixed ordering syntax
            .limit(5)
            .execute()
        )
        
        favorite_genre_ids = []
        
        if interactions.data and len(interactions.data) > 0:
            # User has interaction data, use their favorites
            favorite_genre_ids = [g["gid"] for g in interactions.data]
            logging.info(f"Found {len(favorite_genre_ids)} favorite genres for user based on interactions")
        else:
            # Fallback: Get all non-blocked genres
            all_genres = supabase.from_("temp_genre").select("gid, genrename").execute()
            
            if all_genres.data:
                # Filter out blocked genres
                for genre in all_genres.data:
                    if not is_genre_blocked(genre["genrename"], uaid_child):
                        favorite_genre_ids.append(genre["gid"])
                
                logging.info(f"No interaction data found, using {len(favorite_genre_ids)} non-blocked genres")
                
        if not favorite_genre_ids:
            return jsonify({
                "message": "I'd like to surprise you with something fun, but I need to know more about what you like first!",
                "answer": "I'd like to surprise you with something fun, but I need to know more about what you like first! Try asking me about some books or videos you enjoy."
            })
        
        # Step 2: Get content from favorite genres
        # Pick a random favorite genre
        random_genre_id = random.choice(favorite_genre_ids)
        
        # Get the genre name for messages
        genre_info = supabase.from_("temp_genre").select("genrename").eq("gid", random_genre_id).execute()
        genre_name = genre_info.data[0]["genrename"] if genre_info.data else "interesting"
        
        # Choose book or video randomly (50/50 chance)
        content_type = random.choice(["book", "video"])
        cfid = 2 if content_type == "book" else 1
        
        # Query for content in the selected genre and content type
        content_query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
            )
            .eq("gid", random_genre_id)
            # Filter by content type
            .eq("temp_content.cfid", cfid)
            # Filter by approved status
            .eq("temp_content.status", CONTENT_STATUS["APPROVED"])
            # Filter by age appropriateness
            .lte("temp_content.minimumage", child_age)
            .execute()
        )
        
        suitable_content = []
        
        if content_query.data:
            for item in content_query.data:
                if "temp_content" in item and item["temp_content"]:
                    content = item["temp_content"]
                    # Double-check age-appropriateness
                    if content.get("minimumage") is None or int(content.get("minimumage")) <= child_age:
                        suitable_content.append(content)
        
        # If no content found, try the other content type
        if not suitable_content:
            logging.info(f"No suitable {content_type} content found in genre {genre_name}, trying other content type")
            
            # Switch content type
            content_type = "video" if content_type == "book" else "book"
            cfid = 2 if content_type == "book" else 1
            
            # Try again with the other content type
            content_query = (
                supabase
                .from_("temp_contentgenres")
                .select(
                    "cid, temp_genre!inner(genrename), "
                    "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
                )
                .eq("gid", random_genre_id)
                .eq("temp_content.cfid", cfid)
                .eq("temp_content.status", CONTENT_STATUS["APPROVED"])
                .lte("temp_content.minimumage", child_age)
                .execute()
            )
            
            if content_query.data:
                for item in content_query.data:
                    if "temp_content" in item and item["temp_content"]:
                        content = item["temp_content"]
                        if content.get("minimumage") is None or int(content.get("minimumage")) <= child_age:
                            suitable_content.append(content)
        
        # If still no content, try a different genre
        if not suitable_content and len(favorite_genre_ids) > 1:
            logging.info(f"No suitable content found in genre {genre_name}, trying a different genre")
            
            # Remove current genre from options
            favorite_genre_ids.remove(random_genre_id)
            
            # Pick another random genre
            random_genre_id = random.choice(favorite_genre_ids)
            
            # Get the new genre name
            genre_info = supabase.from_("temp_genre").select("genrename").eq("gid", random_genre_id).execute()
            genre_name = genre_info.data[0]["genrename"] if genre_info.data else "interesting"
            
            # Reset content type to random again
            content_type = random.choice(["book", "video"])
            cfid = 2 if content_type == "book" else 1
            
            # Try with the new genre
            content_query = (
                supabase
                .from_("temp_contentgenres")
                .select(
                    "cid, temp_genre!inner(genrename), "
                    "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
                )
                .eq("gid", random_genre_id)
                .eq("temp_content.cfid", cfid)
                .eq("temp_content.status", CONTENT_STATUS["APPROVED"])
                .lte("temp_content.minimumage", child_age)
                .execute()
            )
            
            if content_query.data:
                for item in content_query.data:
                    if "temp_content" in item and item["temp_content"]:
                        content = item["temp_content"]
                        if content.get("minimumage") is None or int(content.get("minimumage")) <= child_age:
                            suitable_content.append(content)
        
        # If we found suitable content, return a random one
        if suitable_content:
            selected_content = random.choice(suitable_content)
            
            # Create a fun message based on content type
            if content_type == "book":
                messages = [
                    f"Surprise! I found a magical {genre_name} story just for you!",
                    f"Ta-da! Here's a special {genre_name} book I think you'll love!",
                    f"Look what I found! A wonderful {genre_name} book picked just for you!",
                    f"Magic time! I've discovered a fantastic {genre_name} story for you!"
                ]
            else:  # video
                messages = [
                    f"Surprise! I found an amazing {genre_name} video just for you!",
                    f"Ta-da! Here's a special {genre_name} video I think you'll love!",
                    f"Look what I found! A wonderful {genre_name} video picked just for you!",
                    f"Magic time! I've discovered a fantastic {genre_name} video for you!"
                ]
            
            # Save surprise interaction to history
            surprise_message = random.choice(messages)
            save_chat_to_database(
                context=surprise_message,
                is_chatbot=True,
                uaid_child=uaid_child
            )
            
            return jsonify({
                "message": surprise_message,
                "content": selected_content,
                "genre": genre_name
            })
        else:
            # No suitable content found
            return jsonify({
                "message": "I tried to find a surprise for you, but couldn't find something perfect right now.",
                "answer": "I tried to find a surprise for you, but couldn't find something perfect right now. Would you like to try asking for something specific instead?"
            })
            
    except Exception as e:
        logging.error(f"Error in surprise endpoint: {e}", exc_info=True)
        return jsonify({
            "message": "Oops! My magic surprise finder is taking a little break.",
            "answer": "Oops! My magic surprise finder is taking a little break. Let's try something else fun instead!"
        })


# Run the Flask app
if __name__ == '__main__':
    # Start the Flask app
    
    # For testing development:
    # app.run(debug=True)
    
    # For deployed version:
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)