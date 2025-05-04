/**
 * Tracks how many times the user has expressed uncertainty
 * to determine when to show random genre suggestions
 */
class UncertaintyTrackerClass {
    private uncertaintyCount: number = 0;
    private readonly THRESHOLD: number = 2; // Display random genres after the uncertainty expressions
    
    public increment(): void {
      this.uncertaintyCount++;
    }
    
    // Reset the uncertainty count
    public reset(): void {
      this.uncertaintyCount = 0;
    }
    
    // Check if we should show random genre suggestions
    public shouldShowRandomSuggestions(): boolean {
      return this.uncertaintyCount >= this.THRESHOLD;
    }
    
    public getCount(): number {
      return this.uncertaintyCount;
    }
  }
  
  const UncertaintyTracker = new UncertaintyTrackerClass();
  
  export default UncertaintyTracker;