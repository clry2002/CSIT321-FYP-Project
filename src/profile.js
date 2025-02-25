import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bexeexbozsosdtatunld.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJleGVleGJvenNvc2R0YXR1bmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNDc5MTUsImV4cCI6MjA1NTYyMzkxNX0.XnRrTmumli1CtLvTZYG-nPbBr3Wgc0tblZasnLnfOig';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError('');

      const params = new URLSearchParams(location.search);
      const email = params.get('email');

      if (!email) {
        navigate('/');
        return;
      }

      // Fetch user data from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setUserData(data);
      }

      setLoading(false);
    };

    fetchUserData();
  }, [location, navigate]);

  return (
    <div>
      <h2>Profile Page</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {userData && (
        <div>
          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Age:</strong> {userData.age}</p>
          <p><strong>Favorite Genres:</strong></p>
          <ul>
            {userData.favorite_genres.map((genre, index) => (
              <li key={index}>{genre}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Profile;
