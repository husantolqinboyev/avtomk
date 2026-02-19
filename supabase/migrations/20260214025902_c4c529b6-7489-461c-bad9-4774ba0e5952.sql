
-- Teacher-student assignments table
CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teacher_students"
  ON public.teacher_students FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own assignments"
  ON public.teacher_students FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage own assignments"
  ON public.teacher_students FOR ALL
  USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());
