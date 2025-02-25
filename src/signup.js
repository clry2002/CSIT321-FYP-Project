import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bexeexbozsosdtatunld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJleGVleGJvenNvc2R0YXR1bmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNDc5MTUsImV4cCI6MjA1NTYyMzkxNX0.XnRrTmumli1CtLvTZYG-nPbBr3Wgc0tblZasnLnfOig';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function Signup() {
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    age: '',
    favorite_genres: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const genres = ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror', 'Thriller'];

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleGenreChange = (e) => {
    const genre = e.target.value;
    setUserData((prev) => ({
      ...prev,
      favorite_genres: prev.favorite_genres.includes(genre)
        ? prev.favorite_genres.filter((g) => g !== genre)
        : [...prev.favorite_genres, genre]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('users')
      .insert([{ 
        email: userData.email, 
        password: userData.password, 
        age: userData.age, 
        favorite_genres: userData.favorite_genres 
      }])
      .select(); // Ensures data is returned

    setLoading(false);

    if (error) {
      setError(error.message);
      return; // Stop execution if there's an error
    }

    if (!data || data.length === 0) {
      setError("User signup failed. Please try again.");
      return;
    }

    navigate(`/profile?email=${data[0].email}`);
  };

  return (
    <div>
      <h2>Signup Page</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input 
            type="email" 
            name="email" 
            value={userData.email} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div>
          <label>Password:</label>
          <input 
            type="password" 
            name="password" 
            value={userData.password} 
            onChange={handleChange} 
            required 
          />
        </div>
        
        <div>
          <label>Age:</label>
          <input 
            type="number" 
            name="age" 
            value={userData.age} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div>
          <label>Favorite Genres:</label>
          {genres.map((genre) => (
            <div key={genre}>
              <input 
                type="checkbox" 
                value={genre} 
                checked={userData.favorite_genres.includes(genre)}
                onChange={handleGenreChange}
              />
              <label>{genre}</label>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
}

export default Signup;
