
import React from 'react';
import { Volume2, Pause } from 'lucide-react';

interface AudioButtonProps {
  title: string;
  description: string;
  itemId: string;
  isSpeaking: boolean;
  isPaused: boolean;
  onToggle: (title: string, description: string, itemId: string) => void;
}

const AudioButton: React.FC<AudioButtonProps> = ({
  title,
  description,
  itemId,
  isSpeaking,
  isPaused,
  onToggle
}) => {
  return (
    <button
      className={`audio-button relative ${isSpeaking ? (isPaused ? 'paused' : 'speaking') : ''}`}
      onClick={() => onToggle(title, description, itemId)}
    >
      {isSpeaking ? 
        (isPaused ? <Volume2 size={15} /> : <Pause size={15} />) : 
        <Volume2 size={15} />
      }
      <span className="description-text">
        {isSpeaking ? 
          (isPaused ? 'Resume Reading' : 'Pause Reading') : 
          'Read Description'
        }
      </span>
      <span className="hover-hint">
        {isSpeaking ? 
          (isPaused ? 'Click to resume reading' : 'Click to pause reading') : 
          'Click to read aloud'
        }
      </span>
    </button>
  );
};

export default AudioButton;