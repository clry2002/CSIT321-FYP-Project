/**
 * Utility functions for detecting uncertainty in user messages
 * This helps determine when to show genre suggestions in the chatbot
 */

// Phrases that indicate a user is uncertain about what to look for
const uncertaintyPhrases = [
  'not sure', 
  'don\'t know', 
  'idk', 
  'no idea', 
  'help me choose', 
  'what should i', 
  'what can i', 
  'what do you have', 
  'suggestions',
  'recommend',
  'not certain',
  'confused',
  'undecided',
  'options',
  'alternatives',
  'choices'
];

// Phrases for when a user specifically wants to see different genres
const newGenresRequestPhrases = [
  'recommend other genres',
  'recommend different genres',
  'show me other genres',
  'show different genres',
  'other genres',
  'different genres',
  'more genres',
  'show me more genres',
  'something else',
  'anything else',
  'not these',
  'other options',
  'different options',
  'other topics',
  'different topics'
];

// Phrases in bot responses that might suggest the user needs recommendations
const suggestiveBotPhrases = [
  'not sure', 
  'help you decide', 
  'suggest', 
  'recommendation', 
  'maybe you would like', 
  'what are you interested in', 
  'choose from', 
  'help you choose', 
  'not certain', 
  'need ideas',
  'would you like to see',
  'can help you find',
  'let me know what you',
  'happy to recommend',
  'are you looking for'
];

// Detect if a user message indicates uncertainty about what to look for
export const detectUserUncertainty = (message: string): boolean => {
  const lowerCaseMessage = message.toLowerCase();
  
  return uncertaintyPhrases.some(phrase => 
    lowerCaseMessage.includes(phrase)
  );
};

// Detect if a user is specifically asking for different/new genres

export const detectNewGenresRequest = (message: string): boolean => {
  const lowerCaseMessage = message.toLowerCase();
  
  return newGenresRequestPhrases.some(phrase => 
    lowerCaseMessage.includes(phrase)
  );
};

// Detect if a bot message suggests the user might need recommendations
  
export const detectBotSuggestion = (message: string): boolean => {
  if (typeof message !== 'string') return false;
  
  const lowerCaseMessage = message.toLowerCase();
  
  return suggestiveBotPhrases.some(phrase => 
    lowerCaseMessage.includes(phrase)
  );
};

// Detect uncertainty from specific predefined questions

export const isUncertaintyQuestion = (question: string): boolean => {
  const uncertaintyQuestions = [
    "I'm not sure what to look for",
    "Help me find something",
    "What do you recommend?",
    "I don't know what to read"
  ];
  
  return uncertaintyQuestions.includes(question);
};

const uncertaintyDetector = {
  detectUserUncertainty,
  detectBotSuggestion,
  isUncertaintyQuestion,
  detectNewGenresRequest
};

export default uncertaintyDetector;