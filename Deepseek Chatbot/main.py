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

# AI model setup
api_key: str = os.getenv('key')
model: str = "deepseek-r1-distill-llama-70b"
deepseek = ChatGroq(api_key=api_key, model_name=model)
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

def get_content_by_genre(genre):
    try:
        # Fetch content filtered by genre
        response = (
            supabase
            .from_("temp_contentgenres")
            .select("cid, temp_genre!inner(genrename), temp_content(title, description, minimumage, contenturl, status, coverimage)")
            .ilike("temp_genre.genrename", f"%{genre}%")
            .execute()
        )

        logging.info(f"Filtered Supabase response: {response}")

        if not response.data:
            return []  # No books found

        # Extract book details properly
        filtered_books = [
            item["temp_content"] for item in response.data if "temp_content" in item and item["temp_content"]
        ]

        return filtered_books

    except Exception as e:
        logging.error(f"Database error: {e}")
        return []

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get("question", "").lower()

    if not question:
        return jsonify({"error": "No question provided"}), 400

    # Detect genre in the question
    keywords = ["fantasy", "fiction", "romance", "maths", "thriller", "horror", "sci-fi", "science", "adventure"]
    genre = next((word for word in question.split() if word in keywords), None)

    if genre:
        book_recommendations = get_content_by_genre(genre)
        logging.info(f"Database books: {book_recommendations}")

        if book_recommendations:
            return jsonify({"books": book_recommendations})
        
    # If no books are found, recommendations come from AI
    try:
        ai_answer = deepseek_chain.invoke(question)
        return jsonify({"answer": clean_response(ai_answer)})
    except Exception as e:
        logging.error(f"AI response failed: {e}")
        return jsonify({"error": "AI response failed"}), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)