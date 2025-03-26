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

# AI model setup
api_key: str = os.getenv('key')
model: str = "deepseek-r1-distill-llama-70b"
deepseek = ChatGroq(api_key=api_key, model_name=model)

# Load Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Loading and Splitting data in chunks
current_dir = os.getcwd()  # Get the current working directory
file_path = os.path.join(current_dir, "data.txt")  # Path to your data file
loader = TextLoader(file_path, encoding='utf-8')
data = loader.load()

# Get only the result from the model
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

    # Replace **text** with bold formatting
    cleaned_response = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", cleaned_response)

    # Replace ### headings with <h3> tags
    cleaned_response = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_response)

    # Replace numbered lists and newlines with <br> for better formatting
    cleaned_response = re.sub("\n+", "<br>", cleaned_response)  # Replace multiple newlines with a single <br>
    cleaned_response = re.sub(r"^\s*<br>", "", cleaned_response)  # Remove leading <br> tags


    # Strip any leading or trailing whitespace (including newlines)
    return cleaned_response.strip()

# Function to get book recommendations from Supabase
def get_book_recommendations(query):
    try:
        # Query the books table based on the user's question
        response = supabase.table('books').select('*').execute()
        books = response.data
        
        # Filter books based on the query (you can modify this logic based on your needs)
        relevant_books = []
        for book in books:
            # Check if the query matches any book attributes
            if (query.lower() in book.get('title', '').lower() or
                query.lower() in book.get('description', '').lower() or
                query.lower() in book.get('genre', '').lower()):
                relevant_books.append(book)
        
        return relevant_books
    except Exception as e:
        print(f"Database error: {e}")
        return []

# Flask API endpoint for chat
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json  # Parse JSON input from the frontend
    question = data.get("question", "")

    # Ensure the question is not empty
    if not question:
        return jsonify({"error": "No question provided"}), 400

    # Get book recommendations from the database
    book_recommendations = get_book_recommendations(question)
    
    # Generate a response using the DeepSeek AI logic
    formatted_template = template.format(context=data, question=question)
    try:
        answer = deepseek_chain.invoke(formatted_template)
    except Exception as e:
        print(f"DeepSeek error: {e}")
        return jsonify({"error": "Failed to process the request"}), 500

    # Cleaning the response by removing <think> tags
    cleaned_answer = clean_response(answer)

    # Add book recommendations to the response if any were found
    if book_recommendations:
        book_section = "<br><h3>Recommended Books:</h3>"
        for book in book_recommendations:
            book_section += f"<br>• {book.get('title', '')} - {book.get('description', '')}"
        cleaned_answer += book_section

    return jsonify({"answer": cleaned_answer})

# Test endpoint to verify books table data
@app.route('/api/test-books', methods=['GET'])
def test_books():
    try:
        # Query the books table
        response = supabase.table('books').select('*').execute()
        books = response.data
        
        # Return the raw data for inspection
        return jsonify({
            "status": "success",
            "message": "Successfully queried books table",
            "data": books
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error querying books table: {str(e)}"
        }), 500

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
