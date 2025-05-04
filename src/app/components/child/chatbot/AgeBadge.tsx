import React from 'react';

interface AgeBadgeProps {
  minimumAge: number | null | undefined;
}

const AgeBadge: React.FC<AgeBadgeProps> = ({ minimumAge }) => {
  if (minimumAge === null || minimumAge === undefined) return null;
  
  // Determine age bracket for styling (for range 2-8)
  let ageBracket = "2";
  if (minimumAge >= 7) {
    ageBracket = "7"; // Ages 7-8
  } else if (minimumAge >= 5) {
    ageBracket = "5"; // Ages 5-6
  } else if (minimumAge >= 3) {
    ageBracket = "3"; // Ages 3-4
  } else {
    ageBracket = "2"; // Age 2
  }
  
  return (
    <div className="age-badge" data-age={ageBracket}>
      Ages {minimumAge}+
    </div>
  );
};

export default AgeBadge;