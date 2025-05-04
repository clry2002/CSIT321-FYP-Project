import React from 'react';
import { detectNewGenresRequest } from '../../../../utils/uncertaintyDetector';

interface GenreSuggestionsProps {
  showGenreSuggestions: boolean;
  favoriteGenres: string[];
  showRandomGenres: boolean;
  randomGenres: string[];
  messageContent: string;
  handleGenreClick: (genre: string) => void;
}

const GenreSuggestions: React.FC<GenreSuggestionsProps> = ({
  showGenreSuggestions,
  favoriteGenres,
  showRandomGenres,
  randomGenres,
  messageContent,
  handleGenreClick
}) => {
  return (
    <>
      {/* Show favorite genres */}
      {showGenreSuggestions && favoriteGenres.length > 0 && (
        <div className="favorite-genres-section in-message">
          <h3>Here are some topics you might like:</h3>
          <div className="favorite-genres-buttons">
            {favoriteGenres.map((genre, index) => (
              <button 
                key={`fav-${index}`} 
                onClick={() => handleGenreClick(genre)} 
                className="genre-button"
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Show random genre suggestions */}
      {showRandomGenres && randomGenres.length > 0 && (
        <div className="random-genres-section in-message">
          <h3>
            {typeof messageContent === 'string' && detectNewGenresRequest(messageContent) 
              ? "Here are some different genres you might like:" 
              : "Or maybe try something new?"}
          </h3>
          <div className="random-genres-buttons">
            {randomGenres.map((genre, index) => (
              <button 
                key={`random-${index}`} 
                onClick={() => handleGenreClick(genre)} 
                className="genre-button random"
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default GenreSuggestions;