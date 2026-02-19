
-- Test results table for storing student attempts
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Students can view own results
CREATE POLICY "Users can view own results"
ON public.test_results FOR SELECT
USING (user_id = auth.uid());

-- Students can insert own results
CREATE POLICY "Users can insert own results"
ON public.test_results FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all results
CREATE POLICY "Admins can view all results"
ON public.test_results FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view all results
CREATE POLICY "Teachers can view all results"
ON public.test_results FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Admins can manage results
CREATE POLICY "Admins can manage results"
ON public.test_results FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX idx_test_results_ticket_id ON public.test_results(ticket_id);
