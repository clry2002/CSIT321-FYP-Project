import { supabase } from './supabaseClient';

// Save user details (age & favorite genres)
export const saveUserDetails = async (email, age, favoriteGenres) => {
  const { error } = await supabase.from('users').insert([
    {
      email,
      age,
      favorite_genres: favoriteGenres, // Example: ["Fantasy", "Sci-Fi"]
    },
  ]);

  if (error) {
    console.error('Error saving user details:', error.message);
    return { success: false, error: error.message };
  }

  console.log('User details saved successfully');
  return { success: true };
};

// Fetch user details by email
export const getUserDetails = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user details:', error.message);
    return { success: false, error: error.message };
  }

  console.log('User details:', data);
  return { success: true, data };
};
