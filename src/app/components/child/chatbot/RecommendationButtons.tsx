// // RecommendationButtons.tsx - Quick action buttons for recommendations
// import React from 'react';
// import useRecommendations from '../../../../hooks/chatbot/useChatbotRecommendations';

// interface RecommendationButtonsProps {
//   className?: string;
// }

// const RecommendationButtons: React.FC<RecommendationButtonsProps> = ({ 
//   className = '' 
// }) => {
//   const { 
//     requestTrending, 
//     requestPopular, 
//     requestRecommended,
//     isLoadingRecommendations
//   } = useRecommendations();
  
//   return (
//     <div className={`recommendation-buttons ${className}`}>
//       <div className="recommendation-buttons-title">Quick Recommendations:</div>
//       <div className="recommendation-buttons-container">
//         <button 
//           className="recommendation-button trending-button"
//           onClick={() => requestTrending()}
//           disabled={isLoadingRecommendations}
//         >
//           Trending Now
//         </button>
        
//         <button 
//           className="recommendation-button popular-button"
//           onClick={() => requestPopular()}
//           disabled={isLoadingRecommendations}
//         >
//           Popular Content
//         </button>
        
//         <button 
//           className="recommendation-button for-you-button"
//           onClick={() => requestRecommended()}
//           disabled={isLoadingRecommendations}
//         >
//           For You
//         </button>
//       </div>
//     </div>
//   );
// };

// export default RecommendationButtons;