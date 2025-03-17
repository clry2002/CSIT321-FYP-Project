# Importing ChatGroq
from dotenv import load_dotenv
import os
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_community.document_loaders import TextLoader
import re  # Importing regex for cleaning <think> tags

# Importing Supabase
from supabase import create_client, Client

# AI model setup
load_dotenv()
api_key: str = os.getenv('key')
model: str = "deepseek-r1-distill-llama-70b"
deepseek = ChatGroq(api_key=api_key, model_name=model)

# Load Supabase credentials from .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Getting only result from the model
parser = StrOutputParser()
deepseek_chain = deepseek | parser

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Loading and Splitting data in chunks
loader = TextLoader('data.txt', encoding='utf-8')
data = loader.load()

# Define the function of the chatbot
template = ("""
You are an AI-powered chatbot designed to provide 
recommendation for books and videos for children/kids
based on the context provided to you only.    
Don't in any way make things up.
Sound kid-friendly.
Do not include vulgarities.
Context:{context}
Question:{question}
""")

# Function to remove <think> tags
def clean_response(response):
    # Remove <think>...</think> tags and their contents
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    # Remove any remaining or stray <think> or </think> tags, even if unmatched
    cleaned_response = re.sub(r"<think>", "", cleaned_response)  # Remove stray <think> tags
    cleaned_response = re.sub(r"</think>", "", cleaned_response)  # Remove stray </think> tags
    
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    cleaned_response = re.sub(r"</?think>", "", cleaned_response)
    return cleaned_response.strip()



# Continuous question loop
while True:
    question: str = input("Enter your question (or type 'exit' to quit): ")
    
    if question.lower() in ['exit', 'quit']:
        print("Hope you have enjoyed our recommendations! Goodbye!")
        break
    
    # Format the template dynamically with user input
    formatted_template = template.format(context=data, question=question)

    # Get the result from the model
    answer = deepseek_chain.invoke(formatted_template)
    
    # Clean the response by removing <think> tags
    cleaned_answer = clean_response(answer)
    
    print("Answer:", cleaned_answer)