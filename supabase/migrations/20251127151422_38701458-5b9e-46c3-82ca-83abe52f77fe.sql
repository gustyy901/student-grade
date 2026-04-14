-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  kelas VARCHAR(20) NOT NULL,
  jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  alamat TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create assignments table (multiple allowed per student per semester)
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  semester VARCHAR(20) NOT NULL,
  nilai DECIMAL(5,2) NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create midterms table (only 1 per student per semester)
CREATE TABLE public.midterms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  semester VARCHAR(20) NOT NULL,
  nilai DECIMAL(5,2) NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester)
);

-- Create finals table (only 1 per student per semester)
CREATE TABLE public.finals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  semester VARCHAR(20) NOT NULL,
  nilai DECIMAL(5,2) NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester)
);

-- Create indexes for better performance
CREATE INDEX idx_assignments_student_semester ON public.assignments(student_id, semester);
CREATE INDEX idx_midterms_student_semester ON public.midterms(student_id, semester);
CREATE INDEX idx_finals_student_semester ON public.finals(student_id, semester);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.midterms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finals ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for educational app)
CREATE POLICY "Allow all operations on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on midterms" ON public.midterms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on finals" ON public.finals FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for students table
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();