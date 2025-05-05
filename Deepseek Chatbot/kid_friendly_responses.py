"""
kid_friendly.py - Module for making text kid-friendly using textstat and LLM

This module provides functions to analyze and adapt text to make it more 
appropriate and readable for children of different ages.
"""

import re
import logging
import textstat

def make_kid_friendly(text, age, llm_chain):
    """
    Process text to ensure it's kid-friendly based on the child's age.
    Uses textstat for readability metrics and LLM for simplification if needed.
    
    Args:
        text (str): The text to be processed
        age (int): The child's age
        llm_chain: The LLM chain to use for simplification
        
    Returns:
        str: Kid-friendly processed text
    """
    # Define target readability scores by age
    def get_target_score(child_age):
        if child_age < 6:
            return 90  # Very easy (Kindergarten)
        elif child_age < 9:
            return 80  # Easy (Grades 1-2)
        elif child_age < 12:
            return 70  # Fairly easy (Grades 3-4)
        else:
            return 60  # Standard (Grades 5-6)
    
    # Initial text cleaning
    cleaned_text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    cleaned_text = re.sub(r"<think>|</think>", "", cleaned_text)
    cleaned_text = re.sub(r"\\(.?)\\*", r"<b>\1</b>", cleaned_text)
    cleaned_text = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_text)
    cleaned_text = re.sub("\n+", "<br>", cleaned_text)
    cleaned_text = re.sub(r"^\s*<br>", "", cleaned_text)
    cleaned_text = cleaned_text.strip()
    
    # Calculate readability metrics
    flesch_score = textstat.flesch_reading_ease(cleaned_text)
    target_score = get_target_score(age)
    grade_level = textstat.text_standard(cleaned_text, float_output=True)
    
    logging.info(f"Original text - Flesch score: {flesch_score}, Grade level: {grade_level}")
    
    # If text is too complex for the child's age
    if flesch_score < target_score:
        logging.info(f"Text too complex (score: {flesch_score}, target: {target_score}). Requesting simplification.")
        
        # Create appropriate tone recommendations based on age
        if age < 6:
            tone_guide = "Use very short sentences (5-7 words). Use simple words only. Add fun sounds like 'Wow!' and 'Yay!'"
        elif age < 9:
            tone_guide = "Use short sentences (7-10 words). Explain any words with more than 2 syllables. Be enthusiastic and playful!"
        else:
            tone_guide = "Use clear sentences (under 12 words). Add occasional fun expressions. Be friendly and encouraging."
        
        # Prepare prompt for LLM simplification
        simplify_prompt = f"""
        The following text is too complex for a {age}-year-old child (readability score: {flesch_score}, grade level: {grade_level}).
        
        Please rewrite it to be:
        1. At a readability level appropriate for this age (target score: {target_score})
        2. {tone_guide}
        3. Maintain the original meaning and information
        4. Sound natural and engaging, not robotic
        
        Text to simplify:
        {cleaned_text}
        """
        
        try:
            # Request a simplified version from the LLM
            simplified_text = llm_chain.invoke(simplify_prompt)
            
            # Clean the simplified text
            simplified_text = re.sub(r"<think>.*?</think>", "", simplified_text, flags=re.DOTALL)
            simplified_text = re.sub(r"<think>|</think>", "", simplified_text)
            simplified_text = simplified_text.strip()
            
            # Verify improvement
            new_score = textstat.flesch_reading_ease(simplified_text)
            new_grade_level = textstat.text_standard(simplified_text, float_output=True)
            
            logging.info(f"Simplified text - Flesch score: {new_score}, Grade level: {new_grade_level}")
            
            # Only use simplified version if it actually improved readability
            if new_score > flesch_score:
                cleaned_text = simplified_text
            else:
                logging.warning("Simplification did not improve readability. Using original text.")
                
        except Exception as e:
            logging.error(f"Error during text simplification: {e}")
            # Continue with the original text if simplification fails
    
    # Add kid-friendly enhancements
    # For very young children, consider adding emojis based on content
    if age < 8 and len(cleaned_text) > 20:
        kid_emojis = {
            "book": "📚", "read": "📖", "story": "📚",
            "video": "📺", "watch": "🎬", "movie": "🎬",
            "fun": "😃", "happy": "😊", "exciting": "🤩",
            "animal": "🐾", "dog": "🐶", "cat": "🐱",
            "dinosaur": "🦖", "space": "🚀", "star": "⭐",
            "magic": "✨", "superhero": "🦸", "adventure": "🗺️"
        }
        
        # Add up to 2 relevant emojis at the end of the text
        added_emojis = []
        for keyword, emoji in kid_emojis.items():
            if keyword in cleaned_text.lower() and emoji not in added_emojis and len(added_emojis) < 2:
                added_emojis.append(emoji)
        
        if added_emojis:
            cleaned_text = cleaned_text + " " + " ".join(added_emojis)
    
    return cleaned_text

def analyze_text_complexity(text):
    """
    Analyze text complexity using textstat and return various readability metrics.
    
    Args:
        text (str): The text to analyze
        
    Returns:
        dict: Dictionary with various readability metrics
    """
    metrics = {
        "flesch_reading_ease": textstat.flesch_reading_ease(text),
        "flesch_kincaid_grade": textstat.flesch_kincaid_grade(text),
        "smog_index": textstat.smog_index(text),
        "coleman_liau_index": textstat.coleman_liau_index(text),
        "automated_readability_index": textstat.automated_readability_index(text),
        "dale_chall_readability_score": textstat.dale_chall_readability_score(text),
        "text_standard": textstat.text_standard(text, float_output=True),
        "syllable_count": textstat.syllable_count(text),
        "lexicon_count": textstat.lexicon_count(text),
        "sentence_count": textstat.sentence_count(text),
        "avg_sentence_length": textstat.avg_sentence_length(text),
        "avg_syllables_per_word": textstat.avg_syllables_per_word(text),
        "difficult_words": textstat.difficult_words(text)
    }
    
    return metrics

def clean_response(response):
    """
    Basic cleaning function for text responses.
    
    Args:
        response (str): The response text to clean
        
    Returns:
        str: Cleaned response text
    """
    cleaned_response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL)
    cleaned_response = re.sub(r"<think>|</think>", "", cleaned_response)
    cleaned_response = re.sub(r"\\(.?)\\*", r"<b>\1</b>", cleaned_response)
    cleaned_response = re.sub(r"###\s?(.*)", r"<h3>\1</h3>", cleaned_response)
    cleaned_response = re.sub("\n+", "<br>", cleaned_response)
    cleaned_response = re.sub(r"^\s*<br>", "", cleaned_response)
    return cleaned_response.strip()

def get_recommended_age_range(text):
    """
    Determine the recommended age range for a piece of text based on its complexity.
    
    Args:
        text (str): The text to analyze
        
    Returns:
        tuple: (min_age, max_age) recommended age range
    """
    flesch_score = textstat.flesch_reading_ease(text)
    grade_level = textstat.text_standard(text, float_output=True)
    
    if flesch_score >= 90:  # Very easy
        return (5, 6)
    elif flesch_score >= 80:  # Easy
        return (6, 8)
    elif flesch_score >= 70:  # Fairly easy
        return (8, 10)
    elif flesch_score >= 60:  # Standard
        return (10, 12)
    elif flesch_score >= 50:  # Fairly difficult
        return (12, 14)
    else:  # Difficult or very difficult
        return (14, 18)