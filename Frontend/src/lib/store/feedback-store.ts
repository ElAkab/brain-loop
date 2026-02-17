import { create } from 'zustand';

interface FeedbackStore {
  isOpen: boolean;
  triggerFeedback: () => void;
  closeFeedback: () => void;
}

interface FeedbackStats {
  closeCount: number;
  lastShown: number;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  isOpen: false,
  triggerFeedback: () => {
    // Check if user has already given feedback or seen the prompt
    if (typeof window !== 'undefined') {
      const storageKey = 'echoflow_feedback_stats';
      const rawStats = localStorage.getItem(storageKey);
      
      // Initialize stats if not present
      let stats: FeedbackStats = rawStats ? JSON.parse(rawStats) : { closeCount: 0, lastShown: 0 };
      
      // Increment close count on every trigger (closing of the main feature)
      stats.closeCount += 1;
      
      const now = Date.now();
      const timeSinceLastShow = now - stats.lastShown;
      const minInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
      
      // Logic: 
      // 1. Show on 1st close (count === 1)
      // 2. Then show on every 4th close after (1 + 4n): 5, 9, 13...
      // 3. AND ensure at least 10 minutes have passed since last show
      
      const isFrequencyMatch = stats.closeCount === 1 || (stats.closeCount - 1) % 4 === 0;
      const isTimeReady = stats.lastShown === 0 || timeSinceLastShow > minInterval;
      
      if (isFrequencyMatch && isTimeReady) {
        // Add a small delay so it doesn't pop up immediately when the dialog closes
        setTimeout(() => {
          set({ isOpen: true });
        }, 1500);
        
        // Update last shown time
        stats.lastShown = now;
      }
      
      // Save updated stats
      localStorage.setItem(storageKey, JSON.stringify(stats));
    }
  },
  closeFeedback: () => {
    set({ isOpen: false });
  },
}));
