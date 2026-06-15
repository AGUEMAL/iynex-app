
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'pin';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'yellow';
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
