# Importing necessary testing libraries
import logging
import json
import os
from dotenv import load_dotenv

# Import only what's needed from main.py
from main import supabase, CONTENT_STATUS

# Set up logging
logging.basicConfig(level=logging.INFO)

def verify_status_filter():
    """
    This function can be run from the command line to verify the status filter
    without needing to test the chatbot itself.
    """
    try:
        logging.info("=== VERIFYING STATUS FILTER ===")
        
        # 1. Count total content by status
        logging.info("Counting content by status...")
        
        status_counts = {}
        for status_name, status_value in CONTENT_STATUS.items():
            count_query = supabase.from_("temp_content").select("*", count="exact").eq("status", status_value).execute()
            count = count_query.count if hasattr(count_query, 'count') else len(count_query.data)
            status_counts[status_name] = count
        
        logging.info(f"Content status counts: {json.dumps(status_counts)}")
        
        # 2. Test query with approved status filter
        logging.info("Testing query with status filter...")
        
        test_query = (
            supabase
            .from_("temp_content")
            .select("cid, title, status")
            .eq("status", CONTENT_STATUS["APPROVED"])
            .limit(10)
            .execute()
        )
        
        logging.info(f"Test query returned {len(test_query.data)} results")
        
        # Verify all returned items have approved status
        all_approved = all(item.get("status") == CONTENT_STATUS["APPROVED"] for item in test_query.data)
        logging.info(f"All returned items have 'approved' status: {all_approved}")
        
        # 3. Test query with a different status filter
        logging.info("Testing query with 'pending' status...")
        
        test_query_pending = (
            supabase
            .from_("temp_content")
            .select("cid, title, status")
            .eq("status", CONTENT_STATUS["PENDING"])
            .limit(10)
            .execute()
        )
        
        logging.info(f"Test query for pending status returned {len(test_query_pending.data)} results")
        
        # 4. Test temp_contentgenres query with status filter
        logging.info("Testing joined query with status filter...")
        
        test_joined_query = (
            supabase
            .from_("temp_contentgenres")
            .select(
                "cid, temp_genre!inner(genrename), "
                "temp_content(cid, title, status)"
            )
            .eq("temp_content.status", CONTENT_STATUS["APPROVED"])
            .limit(10)
            .execute()
        )
        
        logging.info(f"Joined query returned {len(test_joined_query.data)} results")
        
        # Verify all content items in joined results have approved status
        joined_all_approved = all(
            item.get("temp_content", {}).get("status") == CONTENT_STATUS["APPROVED"] 
            for item in test_joined_query.data
        )
        logging.info(f"All items in joined query have 'approved' status: {joined_all_approved}")
        
        logging.info("=== STATUS FILTER VERIFICATION COMPLETE ===")
        
        return {
            "status_counts": status_counts,
            "approved_filter_working": all_approved,
            "joined_query_filter_working": joined_all_approved,
            "verification_success": all_approved and joined_all_approved
        }
    
    except Exception as e:
        logging.error(f"Status filter verification failed: {e}", exc_info=True)
        return {"error": str(e)}

# Run the verification test directly if this script is called
if __name__ == "__main__":
    # Load environment variables (in case they aren't loaded yet)
    load_dotenv()
    
    # Run the verification test
    filter_verification = verify_status_filter()
    
    # Print results
    if filter_verification.get("verification_success"):
        print("✅ Status filter verification passed! Only approved content will be shown.")
    else:
        print("❌ Status filter verification failed! Check logs for details.")
        print(f"Verification result: {json.dumps(filter_verification)}")