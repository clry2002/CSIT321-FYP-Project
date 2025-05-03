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

# Chatbot template
template = ("""
You are an AI-powered chatbot designed to provide 
recommendations for books and videos for children/kids
based on the context provided to you only.
Don't in any way make things up.
Sound kid-friendly.
Speak as if you are talking directly to a child.
No profanities.
Be more caring.
Context:{context}
Question:{question}
""")

# Clean AI output
def clean_response(response):
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    cleaned_response = re.sub(r"<think>|</think>", "", cleaned_response)
    cleaned_response = re.sub(r"\\(.?)\\*", r"<b>\1</b>", cleaned_response)
    cleaned_response = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_response)
    cleaned_response = re.sub("\n+", "<br>", cleaned_response)
    cleaned_response = re.sub(r"^\s*<br>", "", cleaned_response)
    return cleaned_response.strip()

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

# Content fetch function with blocked genre handling
def get_content_by_genre_and_format(question, uaid_child):
    try:
        # Get all available genres
        genres_query = supabase.from_("temp_genre").select("genrename").execute()
        if not genres_query.data:
            return {"error": "No genres found in the database"}

        genres = [genre["genrename"].lower() for genre in genres_query.data]
        
        # Define format keywords for content type detection
        format_keywords = {
            "read": 2, "story": 2, "watch": 1, "movie": 1,
            "video": 1, "book": 2, "books": 2, "videos": 1
        }

        # Normalize the question and detect genre
        normalized_question = re.sub(r'[^\w\s]', '', question).strip().lower()
        detected_genre = next((genre for genre in genres if genre in normalized_question), None)
        
        # Detect content format (book/video)
        detected_format = next((word for word in question.split() if word.lower() in format_keywords), None)
        cfid = format_keywords.get(detected_format.lower(), None) if detected_format else None

        if not detected_genre:
            return {"error": "Unable to detect genre from the question"}
        
        # Check if the detected genre is blocked for this child
        if is_genre_blocked(detected_genre, uaid_child):
            logging.info(f"Blocked genre '{detected_genre}' requested by child {uaid_child}")
            return {
                "error": "This genre is not available",
                "blocked": True,
                "requested_genre": detected_genre
            }

        # Build query to get content for the detected genre
        query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
            )
            .ilike("temp_genre.genrename", f"%{detected_genre}%")
        )

        # Filter by content format if specified
        if cfid:
            query = query.eq("temp_content.cfid", cfid)

        response = query.execute()
        if not response.data:
            return {"error": "No content found for the given genre and format"}

        # Separate books and videos
        filtered_books = []
        filtered_videos = []

        for item in response.data:
            if "temp_content" in item and item["temp_content"]:
                if item["temp_content"]["cfid"] == 2:
                    filtered_books.append(item["temp_content"])
                elif item["temp_content"]["cfid"] == 1:
                    filtered_videos.append(item["temp_content"])

        # Randomly select a subset of items if there are too many
        if filtered_books:
            filtered_books = random.sample(filtered_books, min(5, len(filtered_books)))
        if filtered_videos:
            filtered_videos = random.sample(filtered_videos, min(5, len(filtered_videos)))

        return {
            "genre": detected_genre,
            "books": filtered_books,
            "videos": filtered_videos
        }

    except Exception as e:
        logging.error(f"Database query failed: {e}")
        return {"error": "Database query failed"}

# Main chatbot route
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    raw_question = data.get("question", "")
    uaid_child = data.get("uaid_child")
    
    # Basic question cleaning
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

    # Get content based on the question
    content_response = get_content_by_genre_and_format(question, uaid_child)

    # Handle blocked genres with alternative suggestions
    if "error" in content_response and content_response.get("blocked"):
        # Prepare a prompt to suggest alternative content
        alternative_prompt = f"The child asked for {content_response.get('requested_genre', 'certain')} content, but this is not available. Please suggest other kid-friendly genres and explain that this content isn't available right now. Be gentle and positive."
        template_with_context = template.format(context=context_from_file, question=alternative_prompt)
        
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            cleaned = clean_response(ai_answer)
            save_chat_to_database(context=cleaned, is_chatbot=True, uaid_child=uaid_child)
            
            # Return the alternate content suggestion
            return jsonify({"answer": cleaned})
        except Exception as e:
            logging.error(f"AI response for alternative content failed: {e}")
            return jsonify({"error": "AI response failed"}), 500
    
    # If no content found or error, use AI
    if "error" in content_response or (
        not content_response.get("books") and not content_response.get("videos")
    ):
        template_with_context = template.format(context=context_from_file, question=question)
        try:
            ai_answer = deepseek_chain.invoke(template_with_context)
            cleaned = clean_response(ai_answer)
            save_chat_to_database(context=cleaned, is_chatbot=True, uaid_child=uaid_child)
            return jsonify({"answer": cleaned})
        except Exception as e:
            logging.error(f"AI response failed: {e}")
            return jsonify({"error": "AI response failed"}), 500

    # If only missing books, use AI for book recommendations
    if not content_response.get("books"):
        try:
            ai_book_prompt = f"What are some good kid-friendly books about {content_response['genre']}?"
            ai_books = deepseek_chain.invoke(ai_book_prompt)
            content_response["books_ai"] = clean_response(ai_books)
        except Exception as e:
            logging.warning(f"AI fallback for books failed: {e}")

    # If only missing videos, use AI for video recommendations
    if not content_response.get("videos"):
        try:
            ai_video_prompt = f"What are some good videos for kids related to {content_response['genre']}?"
            ai_videos = deepseek_chain.invoke(ai_video_prompt)
            content_response["videos_ai"] = clean_response(ai_videos)
        except Exception as e:
            logging.warning(f"AI fallback for videos failed: {e}")

    # Save the chatbot response to the database
    save_chat_to_database(context=str(content_response), is_chatbot=True, uaid_child=uaid_child)

    return jsonify(content_response)

# Special route for checking if a genre is blocked (can be used by frontend)
@app.route('/api/check-blocked-genre', methods=['POST'])
def check_blocked_genre():
    data = request.json
    genre_name = data.get("genre", "")
    uaid_child = data.get("uaid_child")
    
    if not genre_name or not uaid_child:
        return jsonify({"error": "Missing genre or child ID"}), 400
    
    blocked = is_genre_blocked(genre_name, uaid_child)
    return jsonify({"blocked": blocked})

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
    app.run(debug=True)
    # For production deployment
    # port = int(os.environ.get("PORT", 5000))
    # app.run(host="0.0.0.0", port=port, debug=False)