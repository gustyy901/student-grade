-- Create mata_pelajaran (subjects) table
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_mapel VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for mata_pelajaran
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;

-- Create policies for mata_pelajaran (public read/write for now)
CREATE POLICY "Allow public read access to mata_pelajaran"
  ON public.mata_pelajaran FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert to mata_pelajaran"
  ON public.mata_pelajaran FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to mata_pelajaran"
  ON public.mata_pelajaran FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete to mata_pelajaran"
  ON public.mata_pelajaran FOR DELETE
  USING (true);

-- Add mapel_id column to assignments table
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS mapel_id UUID REFERENCES public.mata_pelajaran(id) ON DELETE SET NULL;

-- Add mapel_id column to midterms table
ALTER TABLE public.midterms 
ADD COLUMN IF NOT EXISTS mapel_id UUID REFERENCES public.mata_pelajaran(id) ON DELETE SET NULL;

-- Add mapel_id column to finals table
ALTER TABLE public.finals 
ADD COLUMN IF NOT EXISTS mapel_id UUID REFERENCES public.mata_pelajaran(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_mapel ON public.assignments(mapel_id);
CREATE INDEX IF NOT EXISTS idx_midterms_mapel ON public.midterms(mapel_id);
CREATE INDEX IF NOT EXISTS idx_finals_mapel ON public.finals(mapel_id);

-- Insert some sample subjects
INSERT INTO public.mata_pelajaran (nama_mapel) VALUES 
  ('Matematika'),
  ('Bahasa Indonesia'),
  ('Bahasa Inggris'),
  ('IPA'),
  ('IPS')
ON CONFLICT DO NOTHING;