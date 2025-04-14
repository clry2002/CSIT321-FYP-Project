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

# Importing regex and random module
import re
import random
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

# Load Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

parser = StrOutputParser()
deepseek_chain = deepseek | parser

# Chatbot Definition Template
template = ("""
You are an AI-powered chatbot designed to provide 
recommendation for books and videos for children/kids
based on the context provided to you only.    
Don't in any way make things up.
Sound kid-friendly.
Speak as if you are talking directly to a child.
No profanities.
Be more caring.
Context:{context}
Question:{question}
""")

# Cleaning of RAW Response Output
def clean_response(response):
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    cleaned_response = re.sub(r"<think>|</think>", "", cleaned_response)
    cleaned_response = re.sub(r"\\(.?)\\*", r"<b>\1</b>", cleaned_response)
    cleaned_response = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_response)
    cleaned_response = re.sub("\n+", "<br>", cleaned_response)
    cleaned_response = re.sub(r"^\s*<br>", "", cleaned_response)
    return cleaned_response.strip()

# Get content by genre and format
def get_content_by_genre_and_format(question):
    try:
        genres_query = supabase.from_("temp_genre").select("genrename").execute()
        if not genres_query.data:
            return {"error": "No genres found in the database"}

        genres = [genre["genrename"].lower() for genre in genres_query.data]
        formats = {"videos": 1, "video": 1, "books": 2, "book": 2}
        format_keywords = {
            "read": 2,
            "story": 2,
            "watch": 1,
            "movie": 1,
            "video": 1,
            "book": 2,
            "books": 2,
            "videos": 1,
        }

        normalized_question = re.sub(r'[^\w\s]', '', question).strip().lower()
        detected_genre = next((genre for genre in genres if genre in normalized_question), None)
        detected_format = next((word for word in question.split() if word.lower() in format_keywords), None)

        if not detected_genre:
            return {"error": "Unable to detect genre from the question"}

        cfid = format_keywords.get(detected_format.lower(), None) if detected_format else None

        query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid)"
            )
            .ilike("temp_genre.genrename", f"%{detected_genre}%")
        )

        # Apply format filter if format is detected
        if cfid:
            query = query.eq("temp_content.cfid", cfid)

        response = query.execute()

        logging.info(f"Filtered Supabase response: {response.data}")

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

        # Randomly pick up to 5 books and 5 videos
        filtered_books = random.sample(filtered_books, min(5, len(filtered_books)))
        filtered_videos = random.sample(filtered_videos, min(5, len(filtered_videos)))

        logging.info(f"Random 5 books: {filtered_books}")
        logging.info(f"Random 5 videos: {filtered_videos}")

        return {"genre": detected_genre, "books": filtered_books, "videos": filtered_videos}

    except Exception as e:
        logging.error(f"Database query failed: {e}")
        return {"error": "Database query failed"}

# Read context from file
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

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    raw_question = data.get("question", "")
    question = re.sub(r'[^\w\s]', '', raw_question).strip().lower()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    context_from_file = read_data_from_file("data.txt")
    if context_from_file is None:
        return jsonify({"error": "Failed to read context from file"}), 500

    template_with_file_context = template.format(context=context_from_file, question=question)

    content_response = get_content_by_genre_and_format(question)

    if "error" in content_response:
        try:
            ai_answer = deepseek_chain.invoke(template_with_file_context)
            return jsonify({"answer": clean_response(ai_answer)})
        except Exception as e:
            logging.error(f"AI response failed: {e}")
            return jsonify({"error": "AI response failed"}), 500

    return jsonify(content_response)

# Run app
if __name__ == '__main__':
    app.run(debug=True)
