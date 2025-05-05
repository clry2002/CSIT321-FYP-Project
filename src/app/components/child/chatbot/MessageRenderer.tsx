import React from 'react';

// Update the interface to include the optional onGenreClick prop
interface MessageRendererProps {
  message: string;
  onGenreClick?: (genre: string) => Promise<void> | void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message, onGenreClick }) => {
  if (!message) return null;
  
  // Define genres to make clickable
  const genres = [
    'Adventure', 'Animals', 'Behaviour', 'Friendship', 'Fantasy', 'Intermediate English', 
    'Sea Creatures', 'African Story Book', 'Beginner English', 'Early Reader', 
    'Reptiles', 'Counting', 'Maths', 'Science', 'Documentary', 'Superhero', 'Sports',
    'Dinosaurs', 'Magic', 'Robot', 'Space', 'Cars', 'Disney', 'Mystery', 'Horror'
  ];
  
  // First, replace <br> tags with actual line breaks
  const textWithLineBreaks = message.replace(/<br>/g, '\n');
  
  // Split the message by ** markers or newlines
  const parts = textWithLineBreaks.split(/(\*\*.*?\*\*|\n)/g);
  
  // Process each part to potentially make genres clickable
  return (
    <>
      {parts.map((part, index) => {
        if (part === '\n') {
          // This is a line break
          return <br key={index} />;
        } else if (part.startsWith('**') && part.endsWith('**')) {
          // This is bold text - remove the ** markers and make it bold
          const boldText = part.slice(2, -2);
          return <strong key={index}>{onGenreClick ? processGenres(boldText, genres, onGenreClick) : boldText}</strong>;
        } else {
          // This is regular text
          return <span key={index}>{onGenreClick ? processGenres(part, genres, onGenreClick) : part}</span>;
        }
      })}
    </>
  );
};

// Helper function to make genres clickable
const processGenres = (text: string, genres: string[], onGenreClick: (genre: string) => Promise<void> | void) => {
  // Split the text by known genres to preserve their positions
  const parts: React.ReactNode[] = [];
  let remainingText = text;
  
  // Track which genres were found and at what positions
  const matches: {genre: string, index: number}[] = [];
  
  // Find all genre matches with their positions
  genres.forEach(genre => {
    const regex = new RegExp(`\\b${genre}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        genre: genre,
        index: match.index
      });
    }
  });
  
  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);
  
  // If no matches were found, return the original text
  if (matches.length === 0) {
    return text;
  }
  
  // Process text with matches
  let lastIndex = 0;
  
  matches.forEach(match => {
    // Calculate the real index in the remaining text
    const matchIndex = match.index - lastIndex;
    
    // Get the exact matched text (preserving original case)
    const matchedText = remainingText.substring(matchIndex, matchIndex + match.genre.length);
    
    // Add text before the match
    if (matchIndex > 0) {
      parts.push(remainingText.substring(0, matchIndex));
    }
    
    // Create tooltip text based on the genre
    const tooltipText = `Find ${match.genre} books & videos`;
    
    // Add the clickable genre with tooltip
    parts.push(
      <button 
        key={`genre-${match.genre}-${match.index}`}
        onClick={() => onGenreClick(match.genre)}
        className="genre-link-button"
        data-tooltip={tooltipText}
        aria-label={tooltipText}
      >
        {matchedText}
      </button>
    );
    
    // Update the remaining text
    remainingText = remainingText.substring(matchIndex + match.genre.length);
    lastIndex = match.index + match.genre.length;
  });
  
  // Add any remaining text
  if (remainingText) {
    parts.push(remainingText);
  }
  
  // Return the array of text and clickable genres
  return <>{parts}</>;
};

export default MessageRenderer;