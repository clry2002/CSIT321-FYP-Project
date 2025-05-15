# /recommendation_handler.py
import logging
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import datetime
import re
import logging

# Load environment variables
load_dotenv()

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define content status constants
CONTENT_STATUS = {
    "PENDING": "pending",
    "APPROVED": "approved",
    "DENIED": "denied",
    "SUSPENDED": "suspended"
}

def get_child_age(uaid_child):
    """Get the child's age from user_account table"""
    try:
        result = supabase.from_("user_account").select("age").eq("id", uaid_child).single().execute()
        if result.data and "age" in result.data:
            return result.data["age"]
        else:
            logging.warning(f"Age not found for child {uaid_child}, defaulting to 10")
            return 10  # Default age if not found
    except Exception as e:
        logging.error(f"Error fetching child age: {e}")
        return 10  # Default age on error

def is_genre_blocked(genre_id, uaid_child):
    """Check if a genre is blocked for a specific child"""
    try:
        # Check if this genre ID is blocked for this child
        blocked_query = supabase.from_("blockedgenres").select("*").eq("child_id", uaid_child).eq("genreid", genre_id).execute()
        
        # If any results are returned, the genre is blocked
        return len(blocked_query.data) > 0
    except Exception as e:
        logging.error(f"Error checking if genre is blocked: {e}")
        return False

def filter_blocked_genres(books, uaid_child):
    """Filter out books with blocked genres"""
    try:
        # Get blocked genres for this user
        blocked_genres_data = supabase.from_("blockedgenres").select("genreid").eq("child_id", uaid_child).execute()
        
        if not blocked_genres_data.data:
            # No blocked genres
            return books
            
        blocked_genre_ids = [item["genreid"] for item in blocked_genres_data.data]
        
        # Filter out books with blocked genres
        filtered_books = []
        for book in books:
            # Get genres for this book
            book_genres = supabase.from_("temp_contentgenres").select("gid").eq("cid", book["cid"]).execute()
            
            if not book_genres.data:
                # If we can't get genres, include the book
                filtered_books.append(book)
                continue
                
            # Check if book has any blocked genre
            has_blocked_genre = False
            for genre in book_genres.data:
                if genre["gid"] in blocked_genre_ids:
                    has_blocked_genre = True
                    break
                    
            if not has_blocked_genre:
                # Add genre names to the book for frontend display
                genres_data = supabase.from_("temp_contentgenres").select("temp_genre(genrename)").eq("cid", book["cid"]).execute()
                
                if genres_data.data:
                    genre_names = []
                    for genre_item in genres_data.data:
                        if genre_item.get("temp_genre") and genre_item["temp_genre"].get("genrename"):
                            genre_names.append(genre_item["temp_genre"]["genrename"])
                    book["genre"] = genre_names
                    
                filtered_books.append(book)
        
        return filtered_books
        
    except Exception as e:
        logging.error(f"Error filtering blocked genres: {e}")
        return books  # Return all books if filtering fails

def detect_recommendation_request_with_priority(question, available_genres=None):
    """
    Enhanced detection that properly handles genre+recommendation+content type combinations.
    Fixes the issue with 'show popular horror books' detection.
    
    Args:
        question: The user's question (string)
        available_genres: List of available genres to check against
        
    Returns:
        dict: Detection results
    """
    normalized_question = question.lower().strip()
    
    # Define recommendation types and their keywords
    recommendation_types = {
        'popular': ['popular', 'top', 'best', 'most liked'],
        'trending': ['trending', 'latest', 'new', 'recent'],
        'recommended': ['recommended', 'for me', 'for you', 'i would like', 'i\'d like', 'suggest']
    }
    
    # Define content types and their keywords
    content_types = {
        'books': ['book', 'books', 'story', 'stories', 'read'],
        'videos': ['video', 'videos', 'watch', 'movie', 'movies', 'film']
    }
    
    # List of popular characters to check for
    characters = [
        "spongebob", "peppa pig", "paw patrol", "harry potter", "tom and jerry",
        "dora", "mickey mouse", "lego", "superhero", "princess", "frozen", "elsa",
        "pokemon", "barbie", "marvel", "batman", "spiderman", "disney"
    ]
    
    # Generic recommendation request pattern (for show, find, recommend)
    generic_recommendation_pattern = r'\b(recommend|show|get|find|suggest)\b'
    
    # Debug logs to help trace the detection process
    logging.info(f"Running detection on: '{normalized_question}'")
    
    # FIRST PRIORITY: Check for specific genre mentioned in the query
    detected_genre = None
    if available_genres:
        for genre in available_genres:
            genre_lower = genre.lower()
            if genre_lower in normalized_question:
                detected_genre = genre_lower
                logging.info(f"Detected genre: {detected_genre}")
                break
    
    # SECOND PRIORITY: Check for specific character mentioned in the query
    detected_character = None
    for character in characters:
        if character in normalized_question:
            detected_character = character
            logging.info(f"Detected character: {detected_character}")
            break
    
    # THIRD PRIORITY: Determine recommendation type 
    recommendation_type = None
    for rtype, keywords in recommendation_types.items():
        if any(keyword in normalized_question for keyword in keywords):
            recommendation_type = rtype
            logging.info(f"Detected recommendation type: {recommendation_type}")
            break
    
    # FOURTH PRIORITY: Check for generic recommendation patterns
    has_generic_recommendation = re.search(generic_recommendation_pattern, normalized_question)
    if has_generic_recommendation:
        logging.info(f"Detected generic recommendation pattern: {has_generic_recommendation.group(0)}")
    
    # Determine if this is a recommendation request
    is_recommendation_request = recommendation_type is not None or has_generic_recommendation
    
    # FIFTH PRIORITY: Determine content type (books/videos/both)
    content_type = 'both'  # Default
    explicit_content_type = False
    
    for ctype, keywords in content_types.items():
        if any(keyword in normalized_question for keyword in keywords):
            content_type = ctype
            explicit_content_type = True
            logging.info(f"Detected content type: {content_type}")
            break
    
    # SPECIAL CASE DETECTION:
    # Check for specific patterns like "popular horror books" - this should be a combined request
    if detected_genre and is_recommendation_request:
        # This pattern matches: [recommendation-type] [genre] [content-type]
        # e.g., "popular horror books" or "trending adventure videos"
        genre_rec_pattern = False
        
        # Check if recommendation type appears before genre
        for rtype, keywords in recommendation_types.items():
            for keyword in keywords:
                if keyword in normalized_question:
                    genre_pos = normalized_question.find(detected_genre)
                    keyword_pos = normalized_question.find(keyword)
                    
                    # If recommendation keyword appears before genre
                    if keyword_pos < genre_pos and keyword_pos >= 0:
                        genre_rec_pattern = True
                        recommendation_type = rtype
                        logging.info(f"Detected combined pattern: {keyword} {detected_genre}")
                        break
        
        # Also check if recommendation word appears right after "show", "find", etc.
        if not genre_rec_pattern and has_generic_recommendation:
            for match in re.finditer(generic_recommendation_pattern, normalized_question):
                end_pos = match.end()
                # Check if there's a recommendation keyword right after
                for rtype, keywords in recommendation_types.items():
                    for keyword in keywords:
                        if normalized_question[end_pos:].strip().startswith(keyword):
                            genre_rec_pattern = True
                            recommendation_type = rtype
                            logging.info(f"Detected pattern: {match.group(0)} {keyword} {detected_genre}")
                            break
        
        # If we found the pattern, this is definitely a combined request
        if genre_rec_pattern:
            logging.info(f"Identified as combined genre+recommendation request")
            return {
                "is_recommendation_request": True,
                "recommendation_type": recommendation_type or 'recommended',
                "content_type": content_type,
                "genre": detected_genre,
                "high_priority": True,
                "explicit_content_type": explicit_content_type,
                "combined_request": True,
                "combined_with": "genre"
            }
    
    # NEW: Check for patterns that clearly indicate a recommendation request vs a simple availability query
    availability_patterns = [
        r'what\s+(?:are|is)\s+(?:some|any|available)',
        r'do\s+you\s+have',
        r'can\s+i\s+(?:see|find|get)',
        r'is\s+there\s+any',
        r'are\s+there\s+any',
        r'available\b'
    ]
    
    # If this looks like an availability query for a genre (without explicit recommendation keywords)
    is_availability_query = any(re.search(pattern, normalized_question) for pattern in availability_patterns)
    if detected_genre and is_availability_query and not recommendation_type:
        logging.info(f"Detected availability query for genre '{detected_genre}', not a recommendation request")
        return {
            "is_recommendation_request": False,
            "is_genre_request": True,
            "genre": detected_genre
        }
    
    # Exact pattern matching for common combined requests
    combined_patterns = [
        (r'(?:show|get|find)\s+(?:me\s+)?(?:popular|trending|recommended)\s+(\w+)\s+(?:books|videos)', "genre"),
        (r'(?:popular|trending|recommended)\s+(\w+)\s+(?:books|videos)', "genre"),
        (r'(?:show|get|find)\s+(?:me\s+)?(?:popular|trending|recommended)\s+(\w+)', "genre"),
        (r'(?:show|get|find)\s+(?:me\s+)?(\w+)\s+(?:books|videos)', "genre"),
        (r'(?:show|get|find)\s+(?:me\s+)?(?:popular|trending|recommended)\s+(?:books|videos)\s+(?:about|with|for)\s+(\w+)', "character"),
        (r'(?:popular|trending|recommended)\s+(?:books|videos)\s+(?:about|with|for)\s+(\w+)', "character")
    ]
    
    for pattern, combine_type in combined_patterns:
        match = re.search(pattern, normalized_question)
        if match:
            entity = match.group(1).lower()
            if combine_type == "genre" and detected_genre:
                logging.info(f"Pattern matched for genre+recommendation: {pattern}")
                # We already detected this above, but this is a double-check
                return {
                    "is_recommendation_request": True,
                    "recommendation_type": recommendation_type or 'recommended',
                    "content_type": content_type,
                    "genre": detected_genre,
                    "high_priority": True,
                    "explicit_content_type": explicit_content_type,
                    "combined_request": True,
                    "combined_with": "genre",
                    "pattern_matched": pattern
                }
            elif combine_type == "character" and detected_character:
                logging.info(f"Pattern matched for character+recommendation: {pattern}")
                return {
                    "is_recommendation_request": True,
                    "recommendation_type": recommendation_type or 'recommended',
                    "content_type": content_type,
                    "character": detected_character,
                    "high_priority": True,
                    "explicit_content_type": explicit_content_type,
                    "combined_request": True,
                    "combined_with": "character",
                    "pattern_matched": pattern
                }
    
    # EXPLICIT PATTERN CHECK FOR "show popular horror books"
    # This is a special case that we need to handle explicitly
    horror_books_pattern = r'(?:show|get|find)\s+(?:popular|trending|recommended)\s+(\w+)\s+(?:books|videos)'
    match = re.search(horror_books_pattern, normalized_question)
    if match and detected_genre:
        entity = match.group(1).lower()
        if entity == detected_genre:
            logging.info(f"EXPLICIT PATTERN MATCH: 'show popular {detected_genre} {content_type}'")
            return {
                "is_recommendation_request": True,
                "recommendation_type": recommendation_type or 'recommended',
                "content_type": content_type,
                "genre": detected_genre,
                "high_priority": True,
                "explicit_content_type": explicit_content_type,
                "combined_request": True,
                "combined_with": "genre",
                "force_combined": True  # Extra flag to force combined handling
            }
    
    # Now handle standard cases
    
    # If it's a recommendation request with a character
    if is_recommendation_request and detected_character:
        # Default to 'recommended' type if not specified
        if recommendation_type is None:
            recommendation_type = 'recommended'
        
        return {
            "is_recommendation_request": True,
            "recommendation_type": recommendation_type,
            "content_type": content_type,
            "character": detected_character,
            "high_priority": True,
            "explicit_content_type": explicit_content_type,
            "combined_request": True,
            "combined_with": "character"
        }
    
    # If it's a recommendation request with a genre
    elif is_recommendation_request and detected_genre:
        # Default to 'recommended' type if not specified
        if recommendation_type is None:
            recommendation_type = 'recommended'
        
        # Check if this is actually a genre-only request (not a recommendation request)
        if has_generic_recommendation and not any(word in normalized_question for word in 
                                              sum(recommendation_types.values(), [])):
            return {
                "is_recommendation_request": False,
                "is_genre_request": True,
                "genre": detected_genre
            }
        
        # Otherwise, it's a combined recommendation + genre request
        return {
            "is_recommendation_request": True,
            "recommendation_type": recommendation_type,
            "content_type": content_type,
            "genre": detected_genre,
            "high_priority": True,
            "explicit_content_type": explicit_content_type,
            "combined_request": True,
            "combined_with": "genre"
        }
    
    # If it's just a character request, let the main chat function handle it
    if detected_character and not is_recommendation_request:
        return {
            "is_recommendation_request": False,
            "is_character_request": True,
            "character": detected_character
        }
    
    # If it's just a genre request, let the main chat function handle it
    if detected_genre and not is_recommendation_request:
        return {
            "is_recommendation_request": False,
            "is_genre_request": True,
            "genre": detected_genre
        }
    
    # If it's a recommendation request without a specific genre or character, use the previous detection logic
    if is_recommendation_request:
        # Default to 'recommended' if generic
        if recommendation_type is None:
            recommendation_type = 'recommended'
        
        # Check if this is a very generic query like "what's popular?"
        very_generic_patterns = [
            r'^\s*what\'?s\s+(popular|trending)\s*(\?|\.|$)',
            r'^\s*what\s+is\s+(popular|trending)\s*(\?|\.|$)',
            r'^\s*show\s+(popular|trending)\s*(\?|\.|$)'
        ]
        
        very_generic_query = any(re.search(pattern, normalized_question) for pattern in very_generic_patterns)
        
        return {
            "is_recommendation_request": True,
            "recommendation_type": recommendation_type,
            "content_type": content_type,
            "high_priority": True,
            "explicit_content_type": explicit_content_type,
            "very_generic_query": very_generic_query
        }
    
    # If neither, it's not a recommendation request
    return {
        "is_recommendation_request": False
    }
    
def get_genre_specific_recommendations(genre, recommendation_type, content_type, uaid_child):
    """
    Get recommendations for a specific genre, filtered by recommendation type.
    
    Args:
        genre: The specific genre to get recommendations for
        recommendation_type: 'trending', 'popular', or 'recommended'
        content_type: 'books' or 'videos'
        uaid_child: Child's user ID
        
    Returns:
        List of content items
    """
    try:
        # Get child's age
        child_age = get_child_age(uaid_child)
        logging.info(f"Getting {recommendation_type} {content_type} for genre '{genre}', child age: {child_age}")
        
        # Get genre ID
        try:
            genre_id_query = supabase.from_("temp_genre").select("gid").ilike("genrename", f"%{genre}%").execute()
            if not genre_id_query.data:
                logging.warning(f"Genre '{genre}' not found in database")
                return []
                
            genre_id = genre_id_query.data[0]["gid"]
        except Exception as e:
            logging.error(f"Error retrieving genre ID: {e}")
            genre_id = None
            
        # First, check if the genre is blocked
        if genre_id and is_genre_blocked(genre_id, uaid_child):
            logging.info(f"Genre '{genre}' is blocked for user {uaid_child}")
            return []
        
        # Determine content format ID
        cfid = 2 if content_type == 'books' else 1
        
        # Build base query for genre content
        query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, description, minimumage, contenturl, status, coverimage, cfid, viewCount, decisiondate)"
            )
            .ilike("temp_genre.genrename", f"%{genre}%")
            .eq("temp_content.status", CONTENT_STATUS["APPROVED"])
            .eq("temp_content.cfid", cfid)
        )
        
        # Execute the query
        response = query.execute()
        
        if not response.data:
            logging.info(f"No {content_type} found for genre '{genre}'")
            return []
        
        # Filter by age appropriateness and extract content
        filtered_content = []
        for item in response.data:
            if "temp_content" in item and item["temp_content"]:
                content = item["temp_content"]
                
                # Skip content that's not age-appropriate
                if "minimumage" in content and content["minimumage"] is not None:
                    if int(content["minimumage"]) > child_age:
                        continue
                
                filtered_content.append(content)
        
        # Apply recommendation type filtering
        if recommendation_type == 'trending':
            # For trending, sort by newest first with good view counts
            # Calculate date 30 days ago for trending content
            thirty_days_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
            
            # First try to get recent trending content
            trending_content = [c for c in filtered_content if c.get("decisiondate", "") >= thirty_days_ago]
            
            # If we have enough recent items, sort by views and return
            if len(trending_content) >= 3:
                trending_content.sort(key=lambda x: x.get("viewCount", 0), reverse=True)
                return trending_content[:10]
            
            # Otherwise sort all content by date (newest first)
            filtered_content.sort(key=lambda x: x.get("decisiondate", ""), reverse=True)
            return filtered_content[:10]
            
        elif recommendation_type == 'popular':
            # For popular, sort strictly by view count (all-time popular)
            # Log what we're trying to sort
            logging.info("Sorting by viewCount (popular)")
            
            # Debug: Log view counts before sorting
            for i, item in enumerate(filtered_content[:5]):
                logging.info(f"Before sort - Item {i}: title='{item.get('title')}', viewCount={item.get('viewCount')}")
            
            # Sort by viewCount, handling None/null values properly
            filtered_content.sort(key=lambda x: int(x.get("viewCount") or 0), reverse=True)
            
            # Debug: Log view counts after sorting to verify
            for i, item in enumerate(filtered_content[:5]):
                logging.info(f"After sort - Item {i}: title='{item.get('title')}', viewCount={item.get('viewCount')}")
            
            return filtered_content[:3]
            
        else:
            # For recommended, use personalization logic
            try:
                # Get user's interaction score for this genre if available
                if genre_id:
                    interaction = supabase.from_("userInteractions").select("score").eq("uaid", uaid_child).eq("gid", genre_id).execute()
                    
                    if interaction.data and len(interaction.data) > 0:
                        # We have an interaction score for this genre - use it to personalize
                        # (In a real system, we might use collaborative filtering here)
                        pass
            except Exception as e:
                logging.error(f"Error getting user interaction data: {e}")
            
            # For now, just combine view count and recency with some randomness for variety
            import random
            
            # First get top viewed items
            filtered_content.sort(key=lambda x: x.get("viewCount", 0), reverse=True)
            top_by_views = filtered_content[:min(5, len(filtered_content))]
            
            # Get some recent items
            filtered_content.sort(key=lambda x: x.get("decisiondate", ""), reverse=True)
            top_by_recency = filtered_content[:min(5, len(filtered_content))]
            
            # Combine and remove duplicates
            combined = []
            seen_cids = set()
            
            for item in top_by_views + top_by_recency:
                if item["cid"] not in seen_cids:
                    combined.append(item)
                    seen_cids.add(item["cid"])
            
            # Shuffle for variety
            random.shuffle(combined)
            
            # Return the combined list (limit to 10)
            return combined[:10]
        
    except Exception as e:
        logging.error(f"Error getting genre-specific recommendations: {e}", exc_info=True)
        return []
    
    
def getRecommendedBooks(uaid_child):
    """Get personalized book recommendations based on user interactions"""
    try:
        logging.info(f"Getting recommended books for user {uaid_child}")
        child_age = get_child_age(uaid_child)
        
        # Get user's top genres based on interaction scores
        interactions = (
            supabase
            .from_("userInteractions")
            .select("gid, score")
            .eq("uaid", uaid_child)
            .order("score.desc") 
            .limit(5)
        ).execute()
        
        if not interactions.data or len(interactions.data) == 0:
            logging.info(f"No interaction scores found for user {uaid_child}, returning popular books")
            # Fallback to popular books using the local function
            return getPopularBooks(uaid_child)
            
        # Get content with these genres
        top_genre_ids = [g["gid"] for g in interactions.data]
        content_genres = supabase.from_("temp_contentgenres").select("cid").in_("gid", top_genre_ids).execute()
        
        if not content_genres.data or len(content_genres.data) == 0:
            logging.info(f"No content found for user's top genres, returning popular books")
            # Fallback to popular books using the local function
            return getPopularBooks(uaid_child)
            
        # Get unique content IDs
        content_ids = list(set([c["cid"] for c in content_genres.data]))
        
        # Fetch books for these content IDs
        books = supabase.from_("temp_content").select("*").in_("cid", content_ids).eq("cfid", 2).eq("status", CONTENT_STATUS["APPROVED"]).lte("minimumage", child_age).limit(20).execute()
        
        if not books.data or len(books.data) == 0:
            logging.info(f"No age-appropriate books found for user's genres, returning popular books")
            # Fallback to popular books using the local function
            return getPopularBooks(uaid_child)
            
        # Filter out books with blocked genres
        filtered_books = filter_blocked_genres(books.data, uaid_child)
        
        # Sort by recommendation score (based on user's genre scores)
        scored_books = []
        genre_scores = {g["gid"]: g["score"] for g in interactions.data}
        
        for book in filtered_books:
            book_genres = supabase.from_("temp_contentgenres").select("gid").eq("cid", book["cid"]).execute()
            score = 0
            
            if book_genres.data:
                for genre in book_genres.data:
                    if genre["gid"] in genre_scores:
                        score += genre_scores[genre["gid"]]
                        
            scored_books.append((book, score))
            
        # Sort by score (highest first) and limit to 10
        scored_books.sort(key=lambda x: x[1], reverse=True)
        top_books = [book for book, _ in scored_books[:10]]
        
        logging.info(f"Returning {len(top_books)} personalized book recommendations")
        return top_books
        
    except Exception as e:
        logging.error(f"Error getting recommended books: {e}")
        try:
            # Fallback to popular books using the local function
            return getPopularBooks(uaid_child)  
        except Exception:
            return []  # Return empty list if all fails

def getTrendingBooks(uaid_child):
    """Get trending books (recent with high view counts)"""
    try:
        logging.info(f"Getting trending books for user {uaid_child}")
        child_age = get_child_age(uaid_child)
        
        # Calculate date 7 days ago for trending content
        seven_days_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
        
        # Get trending books - recent content with high view counts
        trending = (
            supabase
            .from_("temp_content")
            .select("*")
            .eq("cfid", 2)  # Books only
            .eq("status", CONTENT_STATUS["APPROVED"])
            .gte("decisiondate", seven_days_ago)
            .lte("minimumage", child_age)
            .order("viewCount.desc")
            .limit(20)
        ).execute()
        
        if not trending.data or len(trending.data) < 5:
            # Fallback: use most recently created books
            recent = (
                supabase
                .from_("temp_content")
                .select("*")
                .eq("cfid", 2)  # Books only
                .eq("status", CONTENT_STATUS["APPROVED"])
                .lte("minimumage", child_age)
                .order("decisiondate.desc")
                .limit(20)
            ).execute()
            return filter_blocked_genres(recent.data, uaid_child)
            
        return filter_blocked_genres(trending.data, uaid_child)
        
    except Exception as e:
        logging.error(f"Error getting trending books: {e}")
        return []

def getPopularBooks(uaid_child):
    """Get popular books (all-time high view counts)"""
    try:
        logging.info(f"Getting popular books for user {uaid_child}")
        child_age = get_child_age(uaid_child)
        
        # Get books with highest view counts
        popular = (
            supabase
            .from_("temp_content")
            .select("*")
            .eq("cfid", 2)
            .eq("status", CONTENT_STATUS["APPROVED"])
            .lte("minimumage", child_age)
            .order("viewCount.desc")
            .limit(20)
        ).execute()
        
        if not popular.data or len(popular.data) < 5:
            return []
            
        return filter_blocked_genres(popular.data, uaid_child)
        
    except Exception as e:
        logging.error(f"Error getting popular books: {e}")
        return []

def getRecommendedVideos(uaid_child):
    """Get personalized video recommendations based on user interactions"""
    try:
        logging.info(f"Getting recommended videos for user {uaid_child}")
        child_age = get_child_age(uaid_child)
        
        # Get user's top genres based on interaction scores
        interactions = (
            supabase
            .from_("userInteractions")
            .select("gid, score")
            .eq("uaid", uaid_child)
            .order("score.desc") 
            .limit(5)
        ).execute()
        
        if not interactions.data or len(interactions.data) == 0:
            logging.info(f"No interaction scores found for user {uaid_child}, returning popular videos")
            # Fallback to popular videos
            return getPopularVideos(uaid_child)
            
        # Get content with these genres
        top_genre_ids = [g["gid"] for g in interactions.data]
        content_genres = supabase.from_("temp_contentgenres").select("cid").in_("gid", top_genre_ids).execute()
        
        if not content_genres.data or len(content_genres.data) == 0:
            logging.info(f"No content found for user's top genres, returning popular videos")
            # Fallback to popular videos
            return getPopularVideos(uaid_child)
            
        # Get unique content IDs
        content_ids = list(set([c["cid"] for c in content_genres.data]))
        
        # Fetch videos for these content IDs
        videos = supabase.from_("temp_content").select("*").in_("cid", content_ids).eq("cfid", 1).eq("status", CONTENT_STATUS["APPROVED"]).lte("minimumage", child_age).limit(20).execute()
        
        if not videos.data or len(videos.data) == 0:
            logging.info(f"No age-appropriate videos found for user's genres, returning popular videos")
            # Fallback to popular videos
            return getPopularVideos(uaid_child)
            
        # Filter out videos with blocked genres
        filtered_videos = filter_blocked_genres(videos.data, uaid_child)
        
        # Sort by recommendation score (based on user's genre scores)
        scored_videos = []
        genre_scores = {g["gid"]: g["score"] for g in interactions.data}
        
        for video in filtered_videos:
            video_genres = supabase.from_("temp_contentgenres").select("gid").eq("cid", video["cid"]).execute()
            score = 0
            
            if video_genres.data:
                for genre in video_genres.data:
                    if genre["gid"] in genre_scores:
                        score += genre_scores[genre["gid"]]
                        
            scored_videos.append((video, score))
            
        # Sort by score (highest first) and limit to 10
        scored_videos.sort(key=lambda x: x[1], reverse=True)
        top_videos = [video for video, _ in scored_videos[:10]]
        
        logging.info(f"Returning {len(top_videos)} personalized video recommendations")
        return top_videos
        
    except Exception as e:
        logging.error(f"Error getting recommended videos: {e}")
        try:
            # Fallback to popular videos
            return getPopularVideos(uaid_child)
        except Exception:
            return []  # Return empty list if all fails

def getTrendingVideos(uaid_child):
    """Get trending videos (recent uploads with high view counts)"""
    try:
        logging.info(f"Getting trending videos for user {uaid_child}")
        child_age = get_child_age(uaid_child)
        
        # Calculate date from 30 days ago
        thirty_days_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        
        # Get recent videos with high view counts
        trending = (
            supabase
            .from_("temp_content")
            .select("*")
            .eq("cfid", 1)
            .eq("status", CONTENT_STATUS["APPROVED"])
            .gte("decisiondate", thirty_days_ago)
            .lte("minimumage", child_age)
            .order("viewCount.desc")
            .limit(20)
        ).execute()
        
        if not trending.data or len(trending.data) == 0:
            return []
            
        return filter_blocked_genres(trending.data, uaid_child)
        
    except Exception as e:
        logging.error(f"Error getting trending videos: {e}")
        return []

def getPopularVideos(uaid_child):
    """Get popular videos (all-time high view counts)"""
    try:
        logging.info(f"Getting popular videos for user {uaid_child}")
        child_age = get_child_age(uaid_child)
        
        # Get videos with highest view counts
        popular = (
            supabase
            .from_("temp_content")
            .select("*")
            .eq("cfid", 1)  # Videos only
            .eq("status", CONTENT_STATUS["APPROVED"])
            .lte("minimumage", child_age)
            .order("viewCount.desc") 
            .limit(20)
        ).execute()
        
        if not popular.data or len(popular.data) == 0:
            return []
            
        return filter_blocked_genres(popular.data, uaid_child)
        
    except Exception as e:
        logging.error(f"Error getting popular videos: {e}")
        return []        

def handle_recommendation_request(question, uaid_child, conversation_manager=None):
    """
    Handle requests for recommendations, trending, or popular content.
    Now supports genre-specific recommendations.
    
    Args:
        question: The user's question
        uaid_child: Child's user ID
        conversation_manager: Optional conversation context manager
        
    Returns:
        Response dictionary with content recommendations or None if not a recommendation request
    """
    # First get available genres to pass to the detection function
    try:
        genres_query = supabase.from_("temp_genre").select("genrename").execute()
        available_genres = [genre["genrename"].lower() for genre in genres_query.data] if genres_query.data else []
    except Exception:
        available_genres = []
    
    # Use the improved detection function with available genres
    detection = detect_recommendation_request_with_priority(question, available_genres)
    
    # Add a marker to the response to tell the main app this is explicitly handled by the recommendation handler
    # This will help prevent double-processing
    if detection.get("is_recommendation_request", False) and detection.get("high_priority", False):
        detection["handled_by_recommendation_handler"] = True
    
    # If this is a genre-specific request (without recommendation keywords), 
    # return None to let the main chat function handle it
    if detection.get("is_genre_request", False) and not detection.get("is_recommendation_request", False):
        logging.info(f"Detected genre-specific request for '{detection.get('genre')}'. Skipping recommendation handler.")
        return None
    
    # Not a recommendation request at all, return None
    if not detection["is_recommendation_request"]:
        return None
    
    recommendation_type = detection["recommendation_type"]
    content_type = detection["content_type"]
    explicit_content_type = detection.get("explicit_content_type", False)
    very_generic_query = detection.get("very_generic_query", False)
    combined_request = detection.get("combined_request", False)
    specific_genre = detection.get("genre")
    
    # Log the detection details
    log_message = f"Handling {recommendation_type} request for {content_type}"
    if specific_genre:
        log_message += f" in '{specific_genre}' genre"
    log_message += f" (high_priority: {detection.get('high_priority', False)}, " 
    log_message += f"explicit_content_type: {explicit_content_type}, "
    log_message += f"very_generic_query: {very_generic_query}, "
    log_message += f"combined_request: {combined_request})"
    logging.info(log_message)
    
    # Get existing conversation context
    existing_context = None
    if conversation_manager:
        existing_context = conversation_manager.get_context(uaid_child)
        logging.info(f"Current context before processing: {existing_context}")
        
        # Only clear genre context for non-genre-specific recommendations
        if not specific_genre and existing_context and 'genre' in existing_context:
            conversation_manager.clear_context(uaid_child, 'genre')
            logging.info(f"Cleared genre context for general recommendation request")
        
        # For "whats popular" and similar very generic queries, use BOTH content types regardless of context
        if very_generic_query:
            content_type = 'both'
            logging.info(f"Very generic query detected. Forcing content_type to 'both'")
        # Only use content_type from context if not explicitly specified in the query and not a very generic query
        elif content_type == 'both' and not explicit_content_type and existing_context and 'content_type' in existing_context:
            content_type = existing_context['content_type']
            logging.info(f"Using content_type from context: {content_type}")
    
    try:
        # Create empty containers for results
        books = []
        videos = []
        
        # Get books if requested
        if content_type == 'books' or content_type == 'both':
            # For genre-specific recommendations
            if specific_genre:
                logging.info(f"Getting {recommendation_type} books for genre: {specific_genre}")
                
                # Query books with the specific genre and recommendation type
                genre_books = get_genre_specific_recommendations(
                    genre=specific_genre,
                    recommendation_type=recommendation_type,
                    content_type='books',
                    uaid_child=uaid_child
                )
                
                if genre_books:
                    books = genre_books
            else:
                # Standard recommendation flow without genre specificity
                if recommendation_type == 'trending':
                    books = getTrendingBooks(uaid_child)
                elif recommendation_type == 'popular':
                    books = getPopularBooks(uaid_child)
                else:  # Personalized recommendations
                    books = getRecommendedBooks(uaid_child)
        
        # Get videos if requested
        if content_type == 'videos' or content_type == 'both':
            # For genre-specific recommendations
            if specific_genre:
                logging.info(f"Getting {recommendation_type} videos for genre: {specific_genre}")
                
                # Query videos with the specific genre and recommendation type
                genre_videos = get_genre_specific_recommendations(
                    genre=specific_genre,
                    recommendation_type=recommendation_type,
                    content_type='videos',
                    uaid_child=uaid_child
                )
                
                if genre_videos:
                    videos = genre_videos
            else:
                # Standard recommendation flow without genre specificity
                if recommendation_type == 'trending':
                    videos = getTrendingVideos(uaid_child)
                elif recommendation_type == 'popular':
                    videos = getPopularVideos(uaid_child)
                else:  # Personalized recommendations
                    videos = getRecommendedVideos(uaid_child)
        
        # Create a descriptive message based on what was requested
        content_type_str = content_type
        if content_type == 'both':
            content_type_str = 'books and videos'
            
        message = f"Here are some {recommendation_type} {content_type_str}"
        if specific_genre:
            message += f" in the {specific_genre} genre"
        message += " just for you!"
        
        # Update conversation context if manager is provided
        if conversation_manager:
            # Add a special flag to mark this as processed by the recommendation handler
            # This will prevent the main handler from processing the same request
            conversation_manager.update_context(uaid_child, 'last_processed_by', 'recommendation_handler')
            
            # For very generic queries like "whats popular" - don't update content_type
            # to keep user's previous content preference for subsequent queries
            if not very_generic_query:
                # Only update content_type context if explicitly specified in query
                if explicit_content_type:
                    conversation_manager.update_context(uaid_child, 'content_type', content_type)
                    logging.info(f"Updated content_type context to '{content_type}' based on explicit request")
            
            # For genre-specific requests, update the genre context
            if specific_genre:
                conversation_manager.update_context(uaid_child, 'genre', specific_genre)
                logging.info(f"Updated genre context to '{specific_genre}' for combined request")
                
            # IMPORTANT: For high priority matches, also clear the "title" context
            # This prevents future confusion with title searches
            if detection.get("high_priority", False) and existing_context and 'title' in existing_context:
                conversation_manager.clear_context(uaid_child, 'title')
                logging.info(f"Cleared 'title' context for high-priority recommendation request")
            
        # Return the content
        return {
            "message": message,
            "books": books,
            "videos": videos,
            "recommendation_type": recommendation_type,
            "genre": specific_genre,  # Include the genre in the response
            "processed_by_recommendation_handler": True  # Add flag to prevent double processing
        }
        
    except Exception as e:
        logging.error(f"Error handling recommendation request: {e}", exc_info=True)
        return {"error": f"Failed to get recommendations: {str(e)}"}