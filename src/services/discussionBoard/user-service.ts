import { supabase } from '@/lib/supabase';
import { UserData } from '../../types/database.types';

export const getUserData = async (): Promise<UserData> => {
  try {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      throw new Error('User not authenticated');
    }
    
    // Get the user_account ID
    const { data: userAccountData, error: accountError } = await supabase
      .from('user_account')
      .select('id')
      .eq('user_id', userData.user.id)
      .single();
    
    if (accountError || !userAccountData) {
      throw new Error('Failed to load user account');
    }
    
    // Determine if the user is an educator (upid = 5)
    const { data: educatorData } = await supabase
      .from('user_account')
      .select('upid')
      .eq('id', userAccountData.id)
      .single();
    
    const isEducator = educatorData?.upid === 5;
    
    return {
      id: userAccountData.id,
      isEducator
    };
  } catch (err) {
    console.error('Error getting user data:', err);
    throw err;
  }
};

export const isUserEducatorForClassroom = async (userAccountId: string, classroomId: number): Promise<boolean> => {
  try {
    // Check if user is the educator for this classroom
    const { data: classroomData, error: classroomError } = await supabase
      .from('temp_classroom')
      .select('uaid_educator')
      .eq('crid', classroomId)
      .single();
    
    if (classroomError) {
      console.error('Error checking educator status:', classroomError);
      return false;
    }
    
    return userAccountId === classroomData?.uaid_educator;
  } catch (err) {
    console.error('Error checking if user is educator for classroom:', err);
    return false;
  }
};