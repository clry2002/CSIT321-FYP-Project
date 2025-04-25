import { supabase } from '@/lib/supabase';

interface Child {
  id: string;
  user_id?: string;
  name: string;
  age: number | null;
  history: string[];
}

interface DeletionResult {
  success: boolean;
  message: string;
}

// Delete a child account and all related data

export const deleteChildAccount = async (
  childId: string,
  childInfo: Child,
  setLoading?: (loading: boolean) => void,
  setError?: (error: string | null) => void
): Promise<DeletionResult> => {
  try {
    if (setLoading) setLoading(true);
    if (setError) setError(null);

    if (!childId) {
      throw new Error('Child ID is required');
    }

    // Validate whether account deletion will succeed
    if (childInfo.user_id) {
      try {
        // First validate that the API endpoint is reachable and working
        const testResponse = await fetch('/api/admin/delete-user/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: childInfo.user_id,
            account_id: childInfo.id
          }),
        });

        if (!testResponse.ok) {
          const contentType = testResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await testResponse.json();
            throw new Error(errorData.error || `Validation failed: ${testResponse.status}`);
          } else {
            const text = await testResponse.text();
            throw new Error(`Validation failed: ${testResponse.status}. Response: ${text.substring(0, 100)}...`);
          }
        }
        
        await testResponse.json(); // Consume the response
      } catch (validationError: unknown) {
        console.error('Validation error:', validationError);
        const errorMessage = validationError instanceof Error 
          ? validationError.message 
          : 'Unknown validation error';
        throw new Error(`Cannot proceed with deletion: ${errorMessage}`);
      }
    }

    // First delete any bookmarks associated with this user account
    const { error: bookmarkError } = await supabase
      .from('temp_bookmark')
      .delete()
      .eq('uaid', childId);

    if (bookmarkError) {
      console.error('Error deleting from temp_bookmark:', bookmarkError);
      throw bookmarkError;
    }

    // Delete from isparentof table
    const { error: relationError } = await supabase
      .from('isparentof')
      .delete()
      .eq('child_id', childId);

    if (relationError) {
      console.error('Error deleting from isparentof:', relationError);
      throw relationError;
    }
    
    // Delete from child_details table
    const { error: profileError } = await supabase
      .from('child_details')
      .delete()
      .eq('child_id', childInfo.id);

    if (profileError) {
      console.error('Error deleting from child_profile:', profileError);
      throw profileError;
    }

    // Delete auth user and user_account via API
    if (childInfo.user_id) {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: childInfo.user_id, account_id: childInfo.id }),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response cannot be parsed as JSON, use default error message
        }
        throw new Error(errorMessage);
      }
      
      await response.json(); // Consume the response
    }
  
    return {
      success: true,
      message: 'Child account successfully deleted'
    };
  } catch (err) {
    console.error('Error deleting child:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error deleting child account';
    if (setError) setError(errorMessage);
    
    return {
      success: false,
      message: errorMessage
    };
  } finally {
    if (setLoading) setLoading(false);
  }
};