-- Create whois_queries table
CREATE TABLE IF NOT EXISTS public.whois_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    registrar TEXT,
    country TEXT,
    threat_score TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.whois_queries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own history" 
ON public.whois_queries FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history" 
ON public.whois_queries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a view for dashboard stats (optional but helpful)
CREATE OR REPLACE VIEW public.whois_stats AS
SELECT 
    domain,
    threat_score,
    count(*) as search_count
FROM 
    public.whois_queries
GROUP BY 
    domain, threat_score;
