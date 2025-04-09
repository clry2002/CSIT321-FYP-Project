-- Drop the old foreign key constraint
ALTER TABLE public.userInteractions
DROP CONSTRAINT IF EXISTS temp_favouritegenres_uaid_fkey;

-- Add the new foreign key constraint
ALTER TABLE public.userInteractions
ADD CONSTRAINT user_interactions_uaid_fkey
FOREIGN KEY (uaid)
REFERENCES public.user_account(user_id)
ON DELETE CASCADE; 