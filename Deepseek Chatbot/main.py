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

# Get the current working directory (where your script is running from)
current_dir = os.getcwd()

# Construct the relative path to the data.txt file
file_path = os.path.join(current_dir, "data.txt")

# Initialize the loader with the relative path
loader = TextLoader(file_path, encoding='utf-8')

# Load the data
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

# Cleaning of RAW Response Output, for easier readibility
def clean_response(response):
    # Remove <think> tags
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    cleaned_response = re.sub(r"<think>", "", cleaned_response)
    cleaned_response = re.sub(r"</think>", "", cleaned_response)

    # Replace **text** and *text* with <b>text</b>
    cleaned_response = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", cleaned_response)
    # cleaned_response = re.sub(r"\*(.*?)\*", r"<b>\1</b>", cleaned_response)

    # Replace ### headings with <h3> tags
    cleaned_response = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_response)

    # Replace *text* with <i>text</i> for italic formatting
    cleaned_response = re.sub(r"\*(.*?)\*", r"<i>\1</i>", cleaned_response)

    # Add HTML <ul> and <li> for list formatting
    # Apply this ONLY to numbered lists (e.g., "1. Text")
    list_items = re.findall(r"(\d+\.\s.*?)(?=\d+\.|$)", cleaned_response, flags=re.DOTALL)
    if list_items:
        # Wrap each item in <li> tags
        list_html = ''.join([f"<li>{item[3:].strip()}</li>" for item in list_items])
        # Replace the list in the response with a properly formatted <ul> block
        cleaned_response = re.sub(
            r"(\d+\.\s.*?)(?=\d+\.|$)", "", cleaned_response, flags=re.DOTALL
        )  # Remove original list from cleaned response
        cleaned_response += f"<ul>{list_html}</ul>"

    return cleaned_response.strip()


# Flask API endpoint for chat
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json  # Parse JSON input from the frontend
    question = data.get("question", "")

    # Ensure the question is not empty
    if not question:
        return jsonify({"error": "No question provided"}), 400

    # Generate a response using the DeepSeek AI logic
    formatted_template = template.format(context=data, question=question)
    answer = deepseek_chain.invoke(formatted_template)

    # Cleaning the response by removing <think> tags
    cleaned_answer = clean_response(answer)

    return jsonify({"answer": cleaned_answer})

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
