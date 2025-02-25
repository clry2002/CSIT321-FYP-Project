import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bexeexbozsosdtatunld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJleGVleGJvenNvc2R0YXR1bmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNDc5MTUsImV4cCI6MjA1NTYyMzkxNX0.XnRrTmumli1CtLvTZYG-nPbBr3Wgc0tblZasnLnfOig';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication
export const signUp = async (email, password) => {
  const { user, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return user;
};

export const signIn = async (email, password) => {
  const { user, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// User Data
export const saveUserDetails = async (email, age, favoriteGenres) => {
  const { error } = await supabase.from('users').insert([
    { email, age, favorite_genres: favoriteGenres }
  ]);
  if (error) throw error;
};

export const getUserDetails = async (email) => {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error) throw error;
  return data;
};
