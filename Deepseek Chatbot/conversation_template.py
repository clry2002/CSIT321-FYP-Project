"""
Module for defining templates for conversation context.
"""

# Enhanced template with context awareness
CONTEXT_AWARE_TEMPLATE = """
You are an AI-powered chatbot designed to provide 
recommendations for books and videos for children/kids
based on the context provided to you only.
Don't in any way make things up.

# RECENT CONVERSATION:
{conversation_history}

# IMPORTANT: MAINTAIN CONVERSATION CONTEXT
- The child might respond with short answers like "yes please" or "okay"
- Look at the previous messages to understand what they're referring to
- If they said "yes" to book/video suggestions, provide more relevant content
- If they mention a character (like SpongeBob), focus on that character
- Keep the conversation flowing naturally based on previous context

# IMPORTANT CHARACTER FOCUS INSTRUCTIONS:
- If the child mentioned a specific character (like SpongeBob, Peppa Pig, etc.) in any message:
  - Keep focusing on that character in your responses
  - Suggest specific episodes or books about that character
  - Ask if they want to see more content about that character
  - Treat "yes please" or similar responses as requesting more of that character's content
- Do not switch topics away from the character the child is interested in
- If you suggest specific episodes or videos, do so in a way that's easy for the child to request

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
"""

def format_conversation_history(conversation_history):
    """
    Format conversation history into a readable string.
    
    Args:
        conversation_history: List of conversation entries
        
    Returns:
        Formatted conversation history string
    """
    if not conversation_history:
        return ""
    
    # Order the history chronologically (oldest first)
    ordered_history = list(reversed(conversation_history))
    
    formatted_history = ""
    for msg in ordered_history[:4]:  # Include up to 4 recent messages (2 exchanges)
        if msg.get('ischatbot'):
            # Clean up the bot message for better display
            bot_text = msg.get('context', '')
            
            # If the message is too long, truncate it
            if len(bot_text) > 200:
                # Try to find a good truncation point
                truncation_point = bot_text.find('\n\n', 150)
                if truncation_point == -1:
                    truncation_point = 200
                bot_text = bot_text[:truncation_point] + "..."
            
            formatted_history += f"Bot: {bot_text}\n\n"
        else:
            formatted_history += f"Child: {msg.get('context', '')}\n\n"
    
    return formatted_history

def is_short_response(query):
    """
    Check if a query is a short response (likely yes/no/maybe).
    
    Args:
        query: The normalized user query
        
    Returns:
        Boolean indicating if this is a short response
    """
    # Check if the query is just a few words
    if len(query.split()) <= 3:
        # Common affirmative words
        affirmative = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please']
        # Common negative words
        negative = ['no', 'nope', 'nah', 'not']
        # Common maybe words
        maybe = ['maybe', 'perhaps', 'possibly', 'dunno', 'not sure']
        
        # Check if the query contains any of these words
        query_lower = query.lower()
        if any(word in query_lower for word in affirmative + negative + maybe):
            return True
    
    return False

def create_template_with_context(conversation_history, context_from_file, question, child_age, character=None):
    """
    Create a template with conversation context for the AI.
    
    Args:
        conversation_history: Recent conversation history
        context_from_file: Content from data.txt
        question: The user's question
        child_age: The child's age
        character: Optional character context
        
    Returns:
        Formatted template string
    """
    # Format the conversation history
    formatted_history = format_conversation_history(conversation_history)
    
    # Create the template with conversation context
    template = CONTEXT_AWARE_TEMPLATE.format(
        conversation_history=formatted_history,
        context=context_from_file,
        question=f"Please respond to: '{question}'",
        age=child_age
    )
    
    # Add character context if provided
    if character:
        template += f"\n\nNOTE: The child seems interested in {character.title()} content. Please focus on {character.title()} in your response."
    
    return template