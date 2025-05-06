import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserAccount, RelationshipData, StudentData, ClassroomWithStudents } from './types';

export const fetchUserAccounts = async () => {
  const { data, error } = await supabase
    .from('user_account')
    .select('id, user_id, fullname, username, age, upid, created_at, updated_at, suspended, comments');

  if (error) throw error;
  return data || [];
};

export const fetchRelationships = async () => {
  const { data, error } = await supabase
    .from('isparentof')
    .select(`
      parent_id,
      child_id,
      parent:user_account!fk_parent_id(username, fullname),
      child:user_account!fk_child_id(username, fullname)
    `) as { data: RelationshipData[] | null, error: PostgrestError | null };

  if (error) throw error;
  return data || [];
};

export const fetchClassrooms = async () => {
  const { data: classroomData, error: classroomError } = await supabase
    .from('temp_classroom')
    .select(`
      crid,
      name,
      description,
      uaid_educator
    `) as { data: ClassroomWithStudents[] | null, error: PostgrestError | null };

  if (classroomError) throw classroomError;

  // For each classroom, get the educator's name and students
  const classroomsWithDetails = await Promise.all((classroomData || []).map(async (classroom) => {
    // Get educator name
    const { data: educatorData } = await supabase
      .from('user_account')
      .select('fullname')
      .eq('id', classroom.uaid_educator)
      .single() as { data: { fullname: string } | null };

    // Get students
    const { data: studentData } = await supabase
      .from('temp_classroomstudents')
      .select(`
        invitation_status,
        user_account:uaid_child(
          username,
          fullname
        )
      `)
      .eq('crid', classroom.crid) as { data: StudentData[] | null };

    const students = (studentData || []).map(student => ({
      username: student.user_account.username,
      fullname: student.user_account.fullname,
      invitation_status: student.invitation_status
    }));

    return {
      crid: classroom.crid,
      name: classroom.name,
      description: classroom.description,
      educatorName: educatorData?.fullname || 'Unknown Educator',
      students
    };
  }));

  return classroomsWithDetails;
};

export const createUserAuth = async (email: string, password: string) => {
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  return response.json();
};

export const createUserAccount = async (userToInsert: Partial<UserAccount>) => {
  const { error } = await supabase
    .from('user_account')
    .insert([userToInsert])
    .select();

  if (error) throw error;
};

export const updateUserStatus = async (username: string, suspended: boolean, comments: string) => {
  const { error } = await supabase
    .from('user_account')
    .update({ 
      suspended,
      comments,
      updated_at: new Date().toISOString()
    })
    .eq('username', username);

  if (error) throw error;
};

export const updateUser = async (username: string, field: string, value: string | number) => {
  const { error } = await supabase
    .from('user_account')
    .update({ 
      [field]: value,
      updated_at: new Date().toISOString()
    })
    .eq('username', username);

  if (error) throw error;
};

export const deleteUser = async (username: string) => {
  const { error } = await supabase
    .from('user_account')
    .delete()
    .eq('username', username);

  if (error) throw error;
};

export const deleteAuthUser = async (userId: string) => {
  const response = await fetch('/api/admin/delete-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete auth user');
  }

  return response.json();
};

export const fetchDiscussionData = async (classroomId: number) => {
  // Fetch teacher's question
  const { data: questionData, error: questionError } = await supabase
    .from('discussionboard')
    .select('question')
    .eq('crid', classroomId)
    .not('question', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1);
  
  if (questionError) throw questionError;

  // Fetch student responses
  const { data: responsesData, error: responsesError } = await supabase
    .from('discussionboard')
    .select('did, response, uaid, created_at')
    .eq('crid', classroomId)
    .not('response', 'is', null)
    .order('created_at', { ascending: true });

  if (responsesError) throw responsesError;

  // Enrich responses with sender names
  const enrichedResponses = await Promise.all(
    (responsesData || []).map(async (entry) => {
      const { data: profileData, error: profileError } = await supabase
        .from('user_account')
        .select('fullname')
        .eq('user_id', entry.uaid)
        .single();

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return {
          id: entry.did,
          message: entry.response,
          sender_name: 'Unknown',
          created_at: entry.created_at,
        };
      }

      return {
        id: entry.did,
        message: entry.response,
        sender_name: profileData?.fullname || 'Unknown',
        created_at: entry.created_at,
      };
    })
  );

  return {
    teacherQuestion: questionData && questionData.length > 0 ? questionData[0].question : '',
    responses: enrichedResponses
  };
}; 