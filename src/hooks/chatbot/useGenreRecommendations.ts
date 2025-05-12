import { useState } from 'react';
import { getRandomGenres } from '../../utils/genreRecommender';
import UncertaintyTracker from '../../utils/uncertaintyTracker';
import { 
  detectUserUncertainty, 
  detectBotSuggestion, 
  isUncertaintyQuestion,
  detectNewGenresRequest
} from '../../utils/uncertaintyDetector';

interface UseGenreRecommendationsProps {
  favoriteGenres: string[];
}

export const useGenreRecommendations = ({ favoriteGenres }: UseGenreRecommendationsProps) => {
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [randomGenres, setRandomGenres] = useState<string[]>([]);
  const [showRandomGenres, setShowRandomGenres] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processUserMessage = async (message: string): Promise<void> => {
    const isRequestingNewGenres = detectNewGenresRequest(message);
    const isUncertain = detectUserUncertainty(message);
    
    if (isRequestingNewGenres) {
      await handleRequestDifferentGenres();
    } else if (isUncertain) {
      // Increment uncertainty counter
      UncertaintyTracker.increment();
      
      // Show favorite genres first
      setShowGenreSuggestions(true);
      
      // If the child has expressed uncertainty multiple times, suggest random genres
      if (UncertaintyTracker.shouldShowRandomSuggestions()) {
        await handleRequestRandomGenres(3);
      } else {
        setShowRandomGenres(false);
      }
    } else {
      // Reset for non-uncertainty messages
      resetSuggestions();
    }
  };

  const processQuestion = async (question: string): Promise<void> => {
    const isUncertain = isUncertaintyQuestion(question);
    
    if (isUncertain) {
      // Increment uncertainty counter
      UncertaintyTracker.increment();
      
      // Show favorite genres first
      setShowGenreSuggestions(true);
      
      // If the child has expressed uncertainty multiple times, suggest random genres
      if (UncertaintyTracker.shouldShowRandomSuggestions()) {
        await handleRequestRandomGenres(3);
      } else {
        setShowRandomGenres(false);
      }
    } else {
      // Reset for non-uncertainty questions
      resetSuggestions();
    }
  };

  const processBotMessage = (message: string): void => {
    if (typeof message === 'string' && detectBotSuggestion(message)) {
      setShowGenreSuggestions(true);
    }
  };

  const handleRequestDifferentGenres = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const differentGenres = await getRandomGenres(5, favoriteGenres);
      setRandomGenres(differentGenres);
      setShowRandomGenres(true);
      setShowGenreSuggestions(false); // Hide favorite genres
    } catch (error) {
      console.error("Error getting different genres:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRandomGenres = async (count: number): Promise<void> => {
    setIsLoading(true);
    try {
      const recommendations = await getRandomGenres(count, favoriteGenres);
      setRandomGenres(recommendations);
      setShowRandomGenres(true);
    } catch (error) {
      console.error("Error getting random genres:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSuggestions = (): void => {
    UncertaintyTracker.reset();
    setShowGenreSuggestions(false);
    setShowRandomGenres(false);
  };

  const handleGenreSelected = (): void => {
    resetSuggestions();
  };

  return {
    // State
    showGenreSuggestions,
    randomGenres,
    showRandomGenres,
    isLoading,
    
    // Methods
    processUserMessage,
    processQuestion,
    processBotMessage,
    handleRequestDifferentGenres,
    handleGenreSelected,
    resetSuggestions
  };
};

export default useGenreRecommendations;