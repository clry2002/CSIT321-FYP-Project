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

# Importing regex for cleaning <think> tags
import re

# Load environment variables
load_dotenv()

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable CORS to allow communication with the React frontend

import logging

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

# Cleaning of RAW Response Output, for easier readability
def clean_response(response):
    # Remove <think> tags
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    cleaned_response = re.sub(r"<think>", "", cleaned_response)
    cleaned_response = re.sub(r"</think>", "", cleaned_response)

    # Replace *text* with bold formatting
    cleaned_response = re.sub(r"\\(.?)\\*", r"<b>\1</b>", cleaned_response)

    # Replace ### headings with <h3> tags
    cleaned_response = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_response)

    # Replace numbered lists and newlines with <br> for better formatting
    cleaned_response = re.sub("\n+", "<br>", cleaned_response)  # Replace multiple newlines with a single <br>
    cleaned_response = re.sub(r"^\s*<br>", "", cleaned_response)  # Remove leading <br> tags

    # Strip any leading or trailing whitespace (including newlines)
    return cleaned_response.strip()

# Function to fetch content by genre and format (cfid)
def get_content_by_genre_and_format(question):
    try:
        # Define potential genres and formats
        genres = ["fantasy", "fiction", "romance", "maths", "thriller", "horror", "sci-fi", "science", "adventure"]
        formats = {"videos": 1, "video": 1, "books": 2, "book": 2}  # Mapping for content formats

        # Detect genre and format from the question
        detected_genre = next((word for word in question.split() if word.lower() in genres), None)
        detected_format = next((word for word in question.split() if word.lower() in formats), None)

        if not detected_genre:
            return {"error": "Unable to detect genre from the question"}
        
        cfid = formats.get(detected_format.lower(), None) if detected_format else None

        # Fetch content filtered by genre and format (if cfid is detected)
        query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(title, description, minimumage, contenturl, status, coverimage, cfid)"
            )
            .ilike("temp_genre.genrename", f"%{detected_genre}%")
        )
        
        if cfid:
            query = query.eq("temp_content.cfid", cfid)  # Filter by cfid if format is detected

        response = query.execute()

        logging.info(f"Filtered Supabase response: {response.data}")

        if not response.data:
            return {"error": "No content found for the given genre and format"}

        # Separate books and videos based on cfid
        filtered_books = []
        filtered_videos = []
        for item in response.data:
            if "temp_content" in item and item["temp_content"]:
                if item["temp_content"]["cfid"] == 2:  # Books
                    filtered_books.append(item["temp_content"])
                elif item["temp_content"]["cfid"] == 1:  # Videos
                    filtered_videos.append(item["temp_content"])

        logging.info(f"Filtered books: {filtered_books}")
        logging.info(f"Filtered videos: {filtered_videos}")

        return {"genre": detected_genre, "books": filtered_books, "videos": filtered_videos}

    except Exception as e:
        logging.error(f"Database query failed: {e}")
        return {"error": "Database query failed"}

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get("question", "").lower()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    # Fetch content by genre and format
    content_response = get_content_by_genre_and_format(question)

    if "error" in content_response:
        # Fallback to AI-generated response if content not found or error occurs
        try:
            ai_answer = deepseek_chain.invoke(question)
            return jsonify({"answer": clean_response(ai_answer)})
        except Exception as e:
            logging.error(f"AI response failed: {e}")
            return jsonify({"error": "AI response failed"}), 500

    return jsonify(content_response)

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
