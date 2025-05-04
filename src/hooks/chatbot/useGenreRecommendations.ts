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

/**
 * Custom hook to handle genre recommendations, suggestions, and uncertainty tracking
 * @param favoriteGenres The user's favorite genres to exclude from random suggestions
 * @returns State and handlers for genre recommendations
 */
export const useGenreRecommendations = ({ favoriteGenres }: UseGenreRecommendationsProps) => {
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);
  const [randomGenres, setRandomGenres] = useState<string[]>([]);
  const [showRandomGenres, setShowRandomGenres] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Process a user message to determine if and what genre suggestions to show
   * @param message The user's message
   */
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

  /**
   * Process a predefined question to determine if and what genre suggestions to show
   * @param question The predefined question text
   */
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

  /**
   * Check if a bot message suggests uncertainty that would benefit from genre suggestions
   * @param message The bot's message content
   */
  const processBotMessage = (message: string): void => {
    if (typeof message === 'string' && detectBotSuggestion(message)) {
      setShowGenreSuggestions(true);
    }
  };

  /**
   * Handle a user's request for different genre suggestions
   */
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

  /**
   * Fetch random genre recommendations
   * @param count The number of random genres to fetch
   */
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

  /**
   * Reset all genre suggestion states
   */
  const resetSuggestions = (): void => {
    UncertaintyTracker.reset();
    setShowGenreSuggestions(false);
    setShowRandomGenres(false);
  };

  /**
   * Handle when a user selects a specific genre
   */
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