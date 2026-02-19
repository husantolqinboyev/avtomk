
-- Topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  content TEXT,
  order_num INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage topics" ON public.topics FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage topics" ON public.topics FOR ALL TO authenticated USING (has_role(auth.uid(), 'teacher'));

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tickets (biletlar)
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tickets" ON public.tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage tickets" ON public.tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'teacher'));

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  order_num INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage questions" ON public.questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'teacher'));
