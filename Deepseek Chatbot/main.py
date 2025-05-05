# Importing necessary libraries
from dotenv import load_dotenv
import os
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import TextLoader

# Importing Database
from supabase import create_client, Client

# Importing Flask to make Python work with React
from flask import Flask, request, jsonify
from flask_cors import CORS

# Importing regex, random, datetime, and logging
import re
import random
import datetime
import logging
import json

# Import the kid_friendly module
from kid_friendly_responses import make_kid_friendly, clean_response, analyze_text_complexity

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

# Enhanced chatbot template with kid-friendly instructions
template = ("""
You are an AI-powered chatbot designed to provide 
recommendations for books and videos for children/kids
based on the context provided to you only.
Don't in any way make things up.

# IMPORTANT READABILITY GUIDELINES:
- Sound kid-friendly and enthusiastic!
- Use simple words with 1-2 syllables whenever possible
- Keep sentences short (under 12 words)
- Use active voice, not passive voice
- Explain any complex terms immediately
- Use concrete examples rather than abstract concepts
- Be enthusiastic and playful! Use exclamation points!
- Include occasional fun expressions like "Wow!" or "Awesome!"
- For ages 5-8: Use very simple language (Grade 1-2 level)
- For ages 9-12: Use moderately simple language (Grade 3-4 level)

Context:{context}
Question:{question}
Child's Age:{age}
""")

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

# Main chatbot route
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    raw_question = data.get("question", "")
    uaid_child = data.get("uaid_child")
    question = raw_question.strip()
    normalized_question = re.sub(r'[^\w\s]', '', raw_question).strip().lower()

    if not normalized_question:
        return jsonify({"error": "No question provided"}), 400

    # Save user input to chat history
    save_chat_to_database(context=raw_question, is_chatbot=False, uaid_child=uaid_child)

    # Read context from file
    context_from_file = read_data_from_file("data.txt")
    if context_from_file is None:
        return jsonify({"error": "Failed to read context from file"}), 500

    # Get child's age for personalized responses
    child_age = get_child_age(uaid_child)

    # Get content based on the question (only approved content)
    content_response = get_content_by_genre_and_format(question, uaid_child)

    # Handle blocked genres with alternative suggestions
    if "error" in content_response and content_response.get("blocked"):
        # Prepare a prompt to suggest alternative content
        alternative_prompt = f"The child asked for {content_response.get('requested_genre', 'certain')} content, but this is not available. Please suggest other kid-friendly genres and explain that this content isn't available right now. Be gentle and positive."
        template_with_context = template.format(context=context_from_file, question=alternative_prompt, age=child_age)
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the new kid-friendly function instead of basic cleaning
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            
            # Return the alternate content suggestion
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response for alternative content failed: {e}")
            return jsonify({"error": "AI response failed"}), 500
    
    # Handle age-restricted content
    if "error" in content_response and content_response.get("age_restricted"):
        # Prepare a prompt to suggest age-appropriate content
        age_prompt = f"The child (age {child_age}) asked for {content_response.get('genre', 'certain')} content, but we only have content for older kids. Please suggest age-appropriate alternatives and explain in a child-friendly way. Be gentle and positive."
        template_with_context = template.format(context=context_from_file, question=age_prompt, age=child_age)
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the new kid-friendly function
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            
            # Return the age-appropriate suggestions
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response for age-appropriate content failed: {e}")
            return jsonify({"error": "AI response failed"}), 500
    
    # If no content at all, use AI
    if "error" in content_response or (
        not content_response.get("books") and not content_response.get("videos")
    ):
        template_with_context = template.format(context=context_from_file, question=question, age=child_age)
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            # Use the new kid-friendly function
            kid_friendly_answer = make_kid_friendly(ai_answer, child_age, deepseek_chain)
            save_chat_to_database(context=kid_friendly_answer, is_chatbot=True, uaid_child=uaid_child)
            return jsonify({"answer": kid_friendly_answer})
        except Exception as e:
            logging.error(f"AI response failed: {e}")
            return jsonify({"error": "AI response failed"}), 500

    # If only missing books, use AI for book recommendations
    if not content_response.get("books"):
        try:
            ai_book_prompt = f"What are some good kid-friendly books about {content_response['genre']} for a {child_age}-year-old child?"
            template_with_books = template.format(context=context_from_file, question=ai_book_prompt, age=child_age)
            ai_books = deepseek_chain.invoke(template_with_books)
            # Use the new kid-friendly function
            content_response["books_ai"] = make_kid_friendly(ai_books, child_age, deepseek_chain)
        except Exception as e:
            logging.warning(f"AI fallback for books failed: {e}")

    # If only missing videos, use AI for video recommendations
    if not content_response.get("videos"):
        try:
            ai_video_prompt = f"What are some good videos for kids about {content_response['genre']} appropriate for a {child_age}-year-old child?"
            template_with_videos = template.format(context=context_from_file, question=ai_video_prompt, age=child_age)
            ai_videos = deepseek_chain.invoke(template_with_videos)
            # Use the new kid-friendly function
            content_response["videos_ai"] = make_kid_friendly(ai_videos, child_age, deepseek_chain)
        except Exception as e:
            logging.warning(f"AI fallback for videos failed: {e}")

    # Save the chatbot response to the database
    save_chat_to_database(context=str(content_response), is_chatbot=True, uaid_child=uaid_child)

    return jsonify(content_response)

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
    # Start the Flask app
    # app.run(debug=True)
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)