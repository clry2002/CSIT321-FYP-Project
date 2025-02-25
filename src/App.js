import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './signup';
import Profile from './profile';

function App() {
  return (
    <Router>
      <div>
        <h1>Chatterbot</h1>
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
