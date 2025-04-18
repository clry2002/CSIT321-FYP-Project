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

# Content fetch function
def get_content_by_genre_and_format(question):
    try:
        genres_query = supabase.from_("temp_genre").select("genrename").execute()
        if not genres_query.data:
            return {"error": "No genres found in the database"}

        genres = [genre["genrename"].lower() for genre in genres_query.data]
        format_keywords = {
            "read": 2, "story": 2, "watch": 1, "movie": 1,
            "video": 1, "book": 2, "books": 2, "videos": 1
        }

        normalized_question = re.sub(r'[^\w\s]', '', question).strip().lower()
        detected_genre = next((genre for genre in genres if genre in normalized_question), None)
        detected_format = next((word for word in question.split() if word.lower() in format_keywords), None)
        cfid = format_keywords.get(detected_format.lower(), None) if detected_format else None

        if not detected_genre:
            return {"error": "Unable to detect genre from the question"}

        query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
            )
            .ilike("temp_genre.genrename", f"%{detected_genre}%")
        )

        if cfid:
            query = query.eq("temp_content.cfid", cfid)

        response = query.execute()
        if not response.data:
            return {"error": "No content found for the given genre and format"}

        filtered_books = []
        filtered_videos = []

        for item in response.data:
            if "temp_content" in item and item["temp_content"]:
                if item["temp_content"]["cfid"] == 2:
                    filtered_books.append(item["temp_content"])
                elif item["temp_content"]["cfid"] == 1:
                    filtered_videos.append(item["temp_content"])

        filtered_books = random.sample(filtered_books, min(5, len(filtered_books)))
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
    question = re.sub(r'[^\w\s]', '', raw_question).strip().lower()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    # Save user input to chat history
    save_chat_to_database(context=question, is_chatbot=False, uaid_child=uaid_child)

    context_from_file = read_data_from_file("data.txt")
    if context_from_file is None:
        return jsonify({"error": "Failed to read context from file"}), 500

    content_response = get_content_by_genre_and_format(question)

    # If no content at all, use AI
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

    # Use AI for missing books
    if not content_response.get("books"):
        try:
            ai_book_prompt = f"What are some good kid-friendly books about {content_response['genre']}?"
            ai_books = deepseek_chain.invoke(ai_book_prompt)
            content_response["books_ai"] = clean_response(ai_books)
        except Exception as e:
            logging.warning(f"AI fallback for books failed: {e}")

    # Use AI for missing videos
    if not content_response.get("videos"):
        try:
            ai_video_prompt = f"What are some good videos for kids related to {content_response['genre']}?"
            ai_videos = deepseek_chain.invoke(ai_video_prompt)
            content_response["videos_ai"] = clean_response(ai_videos)
        except Exception as e:
            logging.warning(f"AI fallback for videos failed: {e}")

    # Save full content response to chat history
    save_chat_to_database(context=str(content_response), is_chatbot=True, uaid_child=uaid_child)

    return jsonify(content_response)

# Run the Flask app
if __name__ == '__main__':
   # app.run(debug=True)
   port = int(os.environ.get("PORT", 5000))
   app.run(host="0.0.0.0", port=port, debug=True)