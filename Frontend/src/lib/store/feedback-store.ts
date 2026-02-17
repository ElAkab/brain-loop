import { create } from 'zustand';

interface FeedbackStore {
  isOpen: boolean;
  triggerFeedback: () => void;
  closeFeedback: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  isOpen: false,
  triggerFeedback: () => {
    // Check if user has already given feedback or seen the prompt
    // For now, we'll check a localStorage key 'echoflow_feedback_seen'
    if (typeof window !== 'undefined') {
      const hasSeen = localStorage.getItem('echoflow_feedback_seen');
      if (!hasSeen) {
        set({ isOpen: true });
      }
    }
  },
  closeFeedback: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('echoflow_feedback_seen', 'true');
    }
    set({ isOpen: false });
  },
}));
