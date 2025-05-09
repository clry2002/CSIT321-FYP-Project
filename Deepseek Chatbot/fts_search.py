import sqlite3
import logging
import re
import os
import time
import threading
from typing import Dict, Any, List, Optional, Tuple

# Configure logging
# Note: You don't need this if you're already configuring logging in main.py
# logging.basicConfig(level=logging.INFO)

# Thread-local storage for SQLite connections
import threading
local = threading.local()

class ContentSearchEngine:
    """
    A title search engine using SQLite's FTS5 virtual table extension for
    efficient and accurate full-text search capabilities.
    """
    
    def __init__(self, db_path=":memory:"):
        """
        Initialize the search engine with a SQLite database.
        
        Args:
            db_path: Path to SQLite database (defaults to in-memory database)
        """
        self.db_path = db_path
        # Create the database directory if it doesn't exist
        if db_path != ":memory:":
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # Initialize the database in the main thread
        self._get_connection()
        self._setup_database()
        
    def _get_connection(self):
        """Get a thread-local database connection"""
        if not hasattr(local, 'conn') or local.conn is None:
            local.conn = sqlite3.connect(self.db_path)
            local.conn.row_factory = sqlite3.Row
            local.cursor = local.conn.cursor()
            logging.info(f"Created new SQLite connection in thread {threading.get_ident()}")
        return local.conn, local.cursor
        
    def _setup_database(self):
        """Set up the FTS5 virtual table for content search"""
        conn, cursor = self._get_connection()
        # Create FTS5 virtual table for content
        cursor.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS content_index USING FTS5(
            title, 
            description, 
            content_type, 
            minimumage, 
            genres, 
            content_id UNINDEXED,
            status UNINDEXED,
            coverimage UNINDEXED,
            contenturl UNINDEXED,
            cfid UNINDEXED,
            tokenize='porter unicode61'
        )
        ''')
        conn.commit()
    
    def clear_index(self):
        """Clear all data from the index"""
        conn, cursor = self._get_connection()
        cursor.execute('DELETE FROM content_index')
        conn.commit()
        logging.info("Cleared search index")
        
    def index_content(self, contents: List[Dict[str, Any]]):
        """
        Index a list of content items into the FTS5 table.
        
        Args:
            contents: List of content dictionaries with fields matching the schema
        """
        conn, cursor = self._get_connection()
        
        for content in contents:
            # Convert genres to a space-separated string if it's a list
            if 'genres' in content and isinstance(content['genres'], list):
                content['genres'] = ' '.join(content['genres'])
                
            # Make sure all required fields are present
            required_fields = ['title', 'description', 'content_type', 'minimumage', 'genres', 
                              'content_id', 'status', 'coverimage', 'contenturl', 'cfid']
            for field in required_fields:
                if field not in content:
                    content[field] = ""  # Use empty string for missing fields
            
            # Insert into FTS5 table
            cursor.execute('''
            INSERT INTO content_index (
                title, description, content_type, minimumage, genres, 
                content_id, status, coverimage, contenturl, cfid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                content['title'], content['description'], content['content_type'],
                content['minimumage'], content['genres'], content['content_id'],
                content['status'], content['coverimage'], content['contenturl'], content['cfid']
            ))
        
        conn.commit()
        logging.info(f"Indexed {len(contents)} content items in thread {threading.get_ident()}")
    
    def search_titles(self, query: str, child_age: int = None, 
                    content_type: Optional[str] = None, 
                    status: str = "approved") -> Dict[str, Any]:
    
        # Get thread-local connection
        conn, cursor = self._get_connection()
        
        # Log thread info for debugging
        thread_id = threading.get_ident()
        logging.info(f"Searching in thread {thread_id}")
        
        # Clean up the query for searching
        clean_query = self._clean_query(query)
        logging.info(f"Searching for title: '{clean_query}' (original: '{query}')")
        
        if not clean_query:
            return {"error": "Empty search query after cleaning"}
        
        # Add status filter
        status_condition = "status = ?"
        params = [status]
        
        # Add age filter if provided
        age_filter = ""
        if child_age is not None:
            age_filter = "AND (minimumage = '' OR CAST(minimumage AS INTEGER) <= ?)"
            params.append(child_age)
            
        # Add content type filter if provided
        content_type_filter = ""
        if content_type:
            content_type_filter = "AND content_type = ?"
            params.append(content_type)
        
        try:
            # STRATEGY 1: Try EXACT title match first (case insensitive but must be the full title)
            # This doesn't use FTS5 syntax, so no escaping needed
            exact_match_sql = f"""
            SELECT *, bm25(content_index) as relevance
            FROM content_index 
            WHERE LOWER(title) = LOWER(?)
            AND {status_condition}
            {age_filter}
            {content_type_filter}
            ORDER BY relevance
            LIMIT 10
            """
            exact_match_params = [clean_query] + params
            
            cursor.execute(exact_match_sql, exact_match_params)
            exact_matches = [dict(row) for row in cursor.fetchall()]
            
            # If we found exact matches, return them
            if exact_matches:
                logging.info(f"Found {len(exact_matches)} 100% EXACT matches for '{clean_query}'")
                return self._format_results(exact_matches, query, True)
            
            # STRATEGY 2: Try SIMPLE CONTAINS search (most reliable)
            # This doesn't use FTS5 syntax, so no escaping needed
            contains_sql = f"""
            SELECT *, bm25(content_index) as relevance
            FROM content_index 
            WHERE LOWER(title) LIKE LOWER(?)
            AND {status_condition}
            {age_filter}
            {content_type_filter}
            ORDER BY relevance
            LIMIT 10
            """
            contains_param = f'%{clean_query}%'  # SQL LIKE pattern for contains
            contains_params = [contains_param] + params
            
            cursor.execute(contains_sql, contains_params)
            contains_matches = [dict(row) for row in cursor.fetchall()]
            
            if contains_matches:
                logging.info(f"Found {len(contains_matches)} contains matches for '{clean_query}'")
                return self._format_results(contains_matches, query, False)
            
            # Only try FTS5 searches if the previous strategies failed
            # and only if the query is not empty after escaping
            escaped_query = _escape_fts5_query(clean_query)
            if not escaped_query:
                logging.info(f"Query '{clean_query}' is empty after escaping special characters")
                return {"error": "No content found with that title"}
            
            # STRATEGY 3: Try FTS5 exact phrase match with escaped query
            try:
                phrase_match_sql = f"""
                SELECT *, bm25(content_index) as relevance
                FROM content_index 
                WHERE title MATCH ?
                AND {status_condition}
                {age_filter}
                {content_type_filter}
                ORDER BY relevance
                LIMIT 10
                """
                phrase_match_param = f'"{escaped_query}"'  # Quoted for exact phrase match
                phrase_match_params = [phrase_match_param] + params
                
                cursor.execute(phrase_match_sql, phrase_match_params)
                phrase_matches = [dict(row) for row in cursor.fetchall()]
                
                # If we found phrase matches, return them
                if phrase_matches:
                    logging.info(f"Found {len(phrase_matches)} exact phrase matches for '{escaped_query}'")
                    return self._format_results(phrase_matches, query, True)
            except sqlite3.OperationalError as e:
                logging.warning(f"FTS5 phrase search error (skipping): {e}")
            
            # STRATEGY 4: Try individual word matching
            try:
                words = escaped_query.split()
                if words:
                    word_match_sql = f"""
                    SELECT *, bm25(content_index) as relevance
                    FROM content_index 
                    WHERE {" AND ".join([f"title MATCH ?" for _ in words])}
                    AND {status_condition}
                    {age_filter}
                    {content_type_filter}
                    ORDER BY relevance
                    LIMIT 10
                    """
                    word_match_params = [word for word in words] + params
                    
                    cursor.execute(word_match_sql, word_match_params)
                    word_matches = [dict(row) for row in cursor.fetchall()]
                    
                    if word_matches:
                        logging.info(f"Found {len(word_matches)} word matches for '{escaped_query}'")
                        return self._format_results(word_matches, query, False)
            except sqlite3.OperationalError as e:
                logging.warning(f"FTS5 word search error (skipping): {e}")
            
            # If we reach this point, no matches were found
            logging.info(f"No matches found for '{clean_query}'")
            return {"error": "No content found with that title"}
            
        except Exception as e:
            logging.error(f"Search error in thread {thread_id}: {e}")
            # Close problematic connection and try to create a new one
            self.close()
            return {"error": f"Search error: {str(e)}"}
        
    def _clean_query(self, query: str) -> str:
        """Clean up the query string for better search results"""
        # Remove common words that aren't useful for title search
        stop_words = ['is', 'are', 'the', 'a', 'an', 'available', 'here', 'there', 'can', 'i', 'find']
        clean_query = query.lower()
        
        # Remove questions about availability
        clean_query = re.sub(r'is\s+.*?\s+available\??', '', clean_query)
        
        # Remove other common phrases that aren't part of the title
        phrases_to_remove = [
            r'where can i (find|get|read|watch)',
            r'do you have',
            r'show me',
            r'can i (read|watch)',
            r'i want to (read|watch)'
        ]
        
        for phrase in phrases_to_remove:
            clean_query = re.sub(phrase, '', clean_query, flags=re.IGNORECASE)
        
        # Remove punctuation and extra whitespace
        clean_query = re.sub(r'[^\w\s]', '', clean_query)
        
        # Remove stop words
        query_words = clean_query.split()
        clean_words = [word for word in query_words if word.lower() not in stop_words]
        
        # If removal was too aggressive, revert to original query without punctuation
        if not clean_words and query_words:
            clean_words = query_words
            
        clean_query = ' '.join(clean_words).strip()
        return clean_query
    
    def _format_results(self, results: List[Dict], original_query: str, exact_match: bool) -> Dict[str, Any]:
        """Format the search results into the expected structure"""
        # Split results into books and videos
        books = []
        videos = []
        
        for item in results:
            # Format the result to match expected structure
            formatted_item = {
                "cid": int(item["content_id"]) if item["content_id"].isdigit() else 0,
                "title": item["title"],
                "description": item["description"],
                "minimumage": int(item["minimumage"]) if item["minimumage"].isdigit() else 0,
                "contenturl": item["contenturl"],
                "status": item["status"],
                "coverimage": item["coverimage"],
                "cfid": int(item["cfid"]) if item["cfid"].isdigit() else 0
            }
            
            # Add to appropriate list based on content type/cfid
            if item["content_type"].lower() in ["book", "books"] or formatted_item["cfid"] == 2:
                books.append(formatted_item)
            elif item["content_type"].lower() in ["video", "videos"] or formatted_item["cfid"] == 1:
                videos.append(formatted_item)
        
        return {
            "message": f"Found content matching '{original_query}'",
            "books": books,
            "videos": videos,
            "search_info": {
                "original_query": original_query,
                "clean_query": self._clean_query(original_query),
                "exact_match_found": exact_match
            }
        }
    
    def close(self):
        """Close the thread-local database connection"""
        if hasattr(local, 'conn') and local.conn is not None:
            try:
                local.conn.close()
            except:
                pass
            local.conn = None
            local.cursor = None


# Global engine instance
_engine_instance = None
_last_sync_time = 0
_SYNC_INTERVAL = 3600  # Sync every hour
_engine_lock = threading.Lock()


def get_search_engine(db_path=None):
    """Get the global search engine instance, initializing if needed"""
    global _engine_instance
    
    with _engine_lock:
        if _engine_instance is None:
            # If db_path is None, use in-memory database in production
            if db_path is None:
                if os.environ.get('ENVIRONMENT') == 'production':
                    db_path = ":memory:"
                else:
                    # Try to create a db directory if it doesn't exist
                    os.makedirs("db", exist_ok=True)
                    db_path = "db/content_search.db"
            
            _engine_instance = ContentSearchEngine(db_path)
            logging.info(f"Created global search engine instance in thread {threading.get_ident()} with db_path: {db_path}")
            
    return _engine_instance

def sync_search_engine(supabase_client, content_status):
    """Sync the search engine with content from Supabase"""
    global _last_sync_time
    
    try:
        logging.info(f"Starting search engine content sync in thread {threading.get_ident()}...")
        
        # Get the search engine instance
        search_engine = get_search_engine()
        
        # Get all approved content from Supabase
        content_response = supabase_client.from_("temp_content").select("*").eq("status", content_status["APPROVED"]).execute()
        
        if not content_response.data:
            logging.warning("No approved content found in Supabase database")
            return
        
        # Format content for indexing
        formatted_content = []
        for item in content_response.data:
            # Get genres for this content
            genres_response = (
                supabase_client
                .from_("temp_contentgenres")
                .select("temp_genre!inner(genrename)")
                .eq("cid", item["cid"])
                .execute()
            )
            
            genres = []
            if genres_response.data:
                for genre_entry in genres_response.data:
                    if "temp_genre" in genre_entry and genre_entry["temp_genre"]:
                        genre_name = genre_entry["temp_genre"].get("genrename")
                        if genre_name:
                            genres.append(genre_name)
            
            # Format content item
            content_type = "book" if item.get("cfid") == 2 else "video"
            formatted_item = {
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "content_type": content_type,
                "minimumage": str(item.get("minimumage", "")),
                "genres": genres,
                "content_id": str(item.get("cid", "")),
                "status": item.get("status", ""),
                "coverimage": item.get("coverimage", ""),
                "contenturl": item.get("contenturl", ""),
                "cfid": str(item.get("cfid", ""))
            }
            
            formatted_content.append(formatted_item)
        
        # Clear previous index and insert new content
        search_engine.clear_index()
        search_engine.index_content(formatted_content)
        
        _last_sync_time = time.time()
        logging.info(f"Indexed {len(formatted_content)} content items from Supabase")
        
    except Exception as e:
        logging.error(f"Error syncing search engine: {e}", exc_info=True)


def periodic_sync_thread(supabase_client, content_status):
    """Background thread to periodically sync the search engine"""
    global _last_sync_time, _SYNC_INTERVAL
    
    while True:
        # Sleep for a while
        time.sleep(60)  # Check every minute
        
        # Check if it's time to sync
        current_time = time.time()
        if current_time - _last_sync_time > _SYNC_INTERVAL:
            sync_search_engine(supabase_client, content_status)


def initialize_search_engine(supabase_client, content_status):
    """Initialize the search engine and start background sync thread"""
    try:
        # Get search engine (initializes if needed)
        search_engine = get_search_engine()
        
        # Perform initial sync
        sync_search_engine(supabase_client, content_status)
        
        # Start background thread for periodic syncing
        sync_thread = threading.Thread(
            target=periodic_sync_thread, 
            args=(supabase_client, content_status),
            daemon=True
        )
        sync_thread.start()
        
        logging.info("FTS5 Search engine initialized successfully")
        
        return search_engine
    except Exception as e:
        logging.error(f"Error initializing search engine: {e}", exc_info=True)
        raise e


def search_for_title(title: str, uaid_child: str, supabase_client, get_child_age, is_genre_blocked, content_status) -> Dict[str, Any]:
    """
    Replacement for the existing search_for_title function that uses SQLite FTS5.
    
    Args:
        title: The title to search for
        uaid_child: The child's ID
        supabase_client: The Supabase client
        get_child_age: Function to get child's age
        is_genre_blocked: Function to check if genre is blocked
        content_status: Dictionary of content status values
    
    Returns:
        Search results in the same format as the original function
    """
    try:
        # Get the search engine instance
        search_engine = get_search_engine()
        
        # Get child's age
        child_age = get_child_age(uaid_child)
        
        # Determine content type from title
        content_type = None
        if any(word in title.lower() for word in ["video", "videos", "movie", "movies", "episode"]):
            content_type = "video"
        elif any(word in title.lower() for word in ["book", "books", "story", "stories"]):
            content_type = "book"
        
        # Perform search
        search_results = search_engine.search_titles(
            query=title,
            child_age=child_age,
            content_type=content_type,
            status=content_status["APPROVED"]
        )
        
        # If error in search results, return it
        if "error" in search_results:
            return search_results
        
        # Filter out blocked genres for books
        filtered_books = []
        for book in search_results.get("books", []):
            # Get genres for this content
            blocked = False
            try:
                genres_response = (
                    supabase_client
                    .from_("temp_contentgenres")
                    .select("temp_genre!inner(genrename)")
                    .eq("cid", book["cid"])
                    .execute()
                )
                
                if genres_response.data:
                    for genre_entry in genres_response.data:
                        if "temp_genre" in genre_entry and genre_entry["temp_genre"]:
                            genre_name = genre_entry["temp_genre"].get("genrename")
                            if genre_name and is_genre_blocked(genre_name, uaid_child):
                                logging.info(f"Content '{book['title']}' has blocked genre '{genre_name}'")
                                blocked = True
                                break
            except Exception as e:
                logging.error(f"Error checking genres for content {book['cid']}: {e}")
            
            if not blocked:
                filtered_books.append(book)
        
        # Filter out blocked genres for videos
        filtered_videos = []
        for video in search_results.get("videos", []):
            # Get genres for this content
            blocked = False
            try:
                genres_response = (
                    supabase_client
                    .from_("temp_contentgenres")
                    .select("temp_genre!inner(genrename)")
                    .eq("cid", video["cid"])
                    .execute()
                )
                
                if genres_response.data:
                    for genre_entry in genres_response.data:
                        if "temp_genre" in genre_entry and genre_entry["temp_genre"]:
                            genre_name = genre_entry["temp_genre"].get("genrename")
                            if genre_name and is_genre_blocked(genre_name, uaid_child):
                                logging.info(f"Content '{video['title']}' has blocked genre '{genre_name}'")
                                blocked = True
                                break
            except Exception as e:
                logging.error(f"Error checking genres for content {video['cid']}: {e}")
            
            if not blocked:
                filtered_videos.append(video)
        
        # Apply content type filtering if determined from title
        if content_type == "video":
            filtered_books = []
        elif content_type == "book":
            filtered_videos = []
        
        # Check if we have any results after filtering
        if not filtered_books and not filtered_videos:
            return {"error": "No suitable content found with that title"}
        
        # Return the filtered results with the same format as the original function
        return {
            "message": f"Found content matching '{title}'",
            "books": filtered_books,
            "videos": filtered_videos,
            "search_info": search_results.get("search_info", {})
        }
    except Exception as e:
        logging.error(f"Error in search_for_title: {e}", exc_info=True)
        return {"error": f"Search error: {str(e)}"}
    
    
def _escape_fts5_query(query: str) -> str:
    """
    Escape special characters in FTS5 query strings to avoid syntax errors.
    
    Args:
        query: The raw query string
        
    Returns:
        Escaped query string safe for FTS5
    """
    # FTS5 special characters that need escaping: " ^ $ * : ( ) -
    special_chars = ['"', '^', '$', '*', ':', '(', ')', '-', '/', '&', '+', '<', '>', '=', '[', ']', '{', '}', '|']
    
    # Escape each special character with a space before and after
    escaped_query = query
    for char in special_chars:
        # Replace with a space (this is safer than trying to escape them)
        escaped_query = escaped_query.replace(char, ' ')
    
    # Remove extra spaces
    escaped_query = ' '.join(escaped_query.split())
    
    return escaped_query

def debug_title_search(db_path="db/content_search.db", search_title="counting cabbage"):
    """
    Debug function to test exact title matching
    
    Args:
        db_path: Path to the SQLite database
        search_title: The title to search for
    """
    try:
        print(f"\n===== DEBUGGING TITLE SEARCH: '{search_title}' =====")
        
        # Check if database file exists
        if not os.path.exists(db_path):
            print(f"ERROR: Database file '{db_path}' does not exist!")
            return
        
        # Create a new connection specifically for debugging
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if the content_index table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='content_index'")
        if not cursor.fetchone():
            print("ERROR: content_index table does not exist!")
            conn.close()
            return
        
        # Get a count of all records in the index
        cursor.execute("SELECT COUNT(*) FROM content_index")
        count = cursor.fetchone()[0]
        print(f"Total records in index: {count}")
        
        # List the first 5 titles in the database
        cursor.execute("SELECT title FROM content_index LIMIT 5")
        titles = [row[0] for row in cursor.fetchall()]
        print("Sample titles in database:")
        for title in titles:
            print(f"  - '{title}'")
        
        # Check for exact matches (case insensitive)
        cursor.execute("SELECT * FROM content_index WHERE LOWER(title) = LOWER(?)", (search_title,))
        exact_matches = cursor.fetchall()
        print(f"\nExact matches for '{search_title}' (case insensitive): {len(exact_matches)}")
        for row in exact_matches:
            print(f"  - '{row['title']}' (content_id: {row['content_id']})")
        
        # Check for contains matches
        cursor.execute("SELECT * FROM content_index WHERE LOWER(title) LIKE LOWER(?)", (f"%{search_title}%",))
        contains_matches = cursor.fetchall()
        print(f"\nContains matches for '{search_title}': {len(contains_matches)}")
        for row in contains_matches:
            print(f"  - '{row['title']}' (content_id: {row['content_id']})")
        
        # Check for FTS5 phrase matches
        try:
            cursor.execute(f"SELECT * FROM content_index WHERE title MATCH '\"{search_title}\"'")
            fts_matches = cursor.fetchall()
            print(f"\nFTS5 phrase matches for '\"{search_title}\"': {len(fts_matches)}")
            for row in fts_matches:
                print(f"  - '{row['title']}' (content_id: {row['content_id']})")
        except sqlite3.OperationalError as e:
            print(f"Error with FTS5 query: {e}")
        
        # Check for each word individually
        words = search_title.split()
        for word in words:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM content_index WHERE title MATCH '{word}'")
                count = cursor.fetchone()[0]
                print(f"\nMatches for word '{word}': {count}")
            except sqlite3.OperationalError as e:
                print(f"Error with FTS5 query for word '{word}': {e}")
                
        print("\n===== END DEBUG =====")
        
        # Close the connection
        conn.close()
    
    except Exception as e:
        print(f"Debug error: {e}")