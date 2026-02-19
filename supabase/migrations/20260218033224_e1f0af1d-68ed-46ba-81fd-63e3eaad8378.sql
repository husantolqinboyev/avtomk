
-- Assignments table (teacher assigns tickets to students)
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  ticket_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own assignments" ON public.assignments FOR ALL
  USING (has_role(auth.uid(), 'teacher'::app_role) AND teacher_id = auth.uid());

CREATE POLICY "Students can view own assignments" ON public.assignments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update own assignments" ON public.assignments FOR UPDATE
  USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all assignments" ON public.assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Categorized test groups (admin/teacher selects which tickets go into a group)
CREATE TABLE public.categorized_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  ticket_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categorized_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categorized tests" ON public.categorized_tests FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categorized tests" ON public.categorized_tests FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Teachers can manage categorized tests" ON public.categorized_tests FOR ALL
  USING (has_role(auth.uid(), 'teacher'::user_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
