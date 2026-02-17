-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rating TEXT NOT NULL CHECK (rating IN ('helpful', 'neutral', 'not_helpful')),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Everyone can read feedback (for the public/admin page)
-- Or restrict to admins if needed. For now, assuming it's a visible page as per requirements.
CREATE POLICY "Everyone can read feedback" 
ON public.feedback 
FOR SELECT 
USING (true);

-- Policy: Only admins can delete (optional, skipping for now)
