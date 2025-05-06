import logging
import time
from typing import Dict, Any, Optional, List

class ConversationContext:
    """
    Manages conversation context to help maintain topic awareness across multiple messages.
    """
    
    def __init__(self):
        # Dictionary to store active conversations
        # Key: user_id, Value: dict with context information
        self._active_conversations = {}
        
        self._context_expiry = 600
    
    def update_context(self, user_id: str, context_type: str, context_value: Any) -> None:
    
        # Updates the conversation context for a specific user
    
        timestamp = time.time()
        
        # Initialize user context if it doesn't exist
        if user_id not in self._active_conversations:
            self._active_conversations[user_id] = {
                'last_updated': timestamp,
                'contexts': {}
            }
        
        # Update the context and timestamp
        self._active_conversations[user_id]['last_updated'] = timestamp
        self._active_conversations[user_id]['contexts'][context_type] = context_value
        
        logging.info(f"Updated context for user {user_id}: {context_type}={context_value}")
    
    def get_context(self, user_id: str, context_type: Optional[str] = None) -> Any:
        """
        Retrieves the conversation context for a specific user.
        
        Args:
            user_id: The unique identifier for the user
            context_type: The type of context to retrieve (or None for all contexts)
            
        Returns:
            The context value if found, None otherwise
        """
        # Check if user exists and context hasn't expired
        if user_id in self._active_conversations:
            timestamp = self._active_conversations[user_id]['last_updated']
            
            # Check if context has expired
            if time.time() - timestamp > self._context_expiry:
                # Context expired, remove it
                del self._active_conversations[user_id]
                logging.info(f"Context for user {user_id} has expired")
                return None
            
            # If specific context type requested
            if context_type:
                if context_type in self._active_conversations[user_id]['contexts']:
                    return self._active_conversations[user_id]['contexts'][context_type]
                return None
            
            # Return all contexts
            return self._active_conversations[user_id]['contexts']
        
        return None
    
    def clear_context(self, user_id: str, context_type: Optional[str] = None) -> None:
        # Clears the conversation context for a specific user.
        
        if user_id in self._active_conversations:
            if context_type:
                if context_type in self._active_conversations[user_id]['contexts']:
                    del self._active_conversations[user_id]['contexts'][context_type]
                    logging.info(f"Cleared {context_type} context for user {user_id}")
            else:
                del self._active_conversations[user_id]
                logging.info(f"Cleared all context for user {user_id}")
    
    def get_active_conversations(self) -> Dict[str, Dict[str, Any]]:
        """
        Returns all active conversations.
        """
        # Clean expired conversations first
        self._clean_expired_conversations()
        return self._active_conversations
    
    def _clean_expired_conversations(self) -> None:
        """
        Removes expired conversations from the active conversations dictionary.
        """
        current_time = time.time()
        expired_users = []
        
        for user_id, context_data in self._active_conversations.items():
            if current_time - context_data['last_updated'] > self._context_expiry:
                expired_users.append(user_id)
        
        for user_id in expired_users:
            del self._active_conversations[user_id]
            logging.info(f"Automatically cleared expired context for user {user_id}")

# Create a singleton instance
conversation_manager = ConversationContext()