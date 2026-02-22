import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { getCachedTickets, cacheTickets, getCachedQuestions, cacheQuestions } from "@/lib/indexedDB";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  order_num: number;
}

const OPTION_LABELS = ["F1", "F2", "F3", "F4"];

export default function StudentCategorizedTestsPage() {
  const { user } = useAuth();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  // Categorized test groups
  const { data: catTests } = useQuery({
    queryKey: ["student-categorized-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("categorized_tests").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // All tickets for name lookup
  const { data: tickets } = useQuery({
    queryKey: ["student-tickets-cat"],
    queryFn: async () => {
      const cached = await getCachedTickets();
      if (cached.length > 0) return cached;
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      if (data && data.length > 0) await cacheTickets(data);
      return data || [];
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["cat-ticket-questions", activeTicketId],
    enabled: !!activeTicketId,
    queryFn: async () => {
      const cached = await getCachedQuestions(activeTicketId!);
      if (cached.length > 0) return cached as Question[];
      const { data } = await supabase.from("questions").select("*").eq("ticket_id", activeTicketId!).order("order_num");
      if (data && data.length > 0) await cacheQuestions(data);
      return (data || []) as Question[];
    },
  });

  const q = questions?.[currentQ];
  const totalQ = questions?.length || 0;

  const nextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAnswer = (option: string) => {
    if (revealed[currentQ]) return;
    setAnswers({ ...answers, [currentQ]: option });
    setRevealed({ ...revealed, [currentQ]: true });

    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    nextTimeoutRef.current = setTimeout(() => {
      if (currentQ < totalQ - 1) {
        setCurrentQ(prev => prev + 1);
      } else {
        resetToTickets();
      }
    }, 3000);
  };

  const resetToTickets = () => {
    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    setActiveTicketId(null);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
  };

  const resetToGroups = () => {
    setActiveGroupId(null);
    setActiveTicketId(null);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
  };

  // Practice mode
  if (activeTicketId && questions) {
    const isRevealed = revealed[currentQ];
    const selectedAnswer = answers[currentQ];
    const isCorrect = selectedAnswer === q?.correct_answer;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={resetToTickets}>← Ortga</Button>
            <span className="text-sm text-muted-foreground">{currentQ + 1} / {totalQ}</span>
          </div>

          <div className="h-2 rounded-full bg-muted mb-6 overflow-hidden">
            <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }} />
          </div>

          {q && (
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <p className="text-base font-medium text-foreground mb-4">{q.question_text}</p>
              {q.image_url && <img src={q.image_url} alt="" className="w-full max-h-48 object-contain rounded-lg mb-4 bg-muted/30" />}
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isThisCorrect = opt === q.correct_answer;
                  const isThisSelected = selectedAnswer === opt;
                  let optClass = "border-border hover:border-primary/50 text-foreground";
                  if (isRevealed) {
                    if (isThisCorrect) optClass = "border-success bg-success/10 text-success font-medium";
                    else if (isThisSelected) optClass = "border-destructive bg-destructive/10 text-destructive font-medium";
                    else optClass = "border-border text-muted-foreground opacity-60";
                  }
                  return (
                    <button key={oi} onClick={() => handleAnswer(opt)} disabled={isRevealed}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optClass}`}>
                      <span className="font-bold mr-2">{OPTION_LABELS[oi] || `F${oi + 1}`}.</span>{opt}
                    </button>
                  );
                })}
              </div>
              {isRevealed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-success"><CheckCircle className="w-4 h-4" /><span className="text-sm font-medium">To'g'ri!</span></div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 text-destructive mb-1"><XCircle className="w-4 h-4" /><span className="text-sm font-medium">Noto'g'ri</span></div>
                      <p className="text-xs text-muted-foreground">To'g'ri javob: <span className="text-success font-medium">{q.correct_answer}</span></p>
                    </div>
                  )}
                  {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>}
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="flex justify-end mt-4">
            {isRevealed && currentQ < totalQ - 1 && (
              <Button size="sm" onClick={() => { if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current); setCurrentQ(currentQ + 1); }}>Keyingi <ArrowRight className="w-4 h-4 ml-1" /></Button>
            )}
            {isRevealed && currentQ === totalQ - 1 && (
              <Button size="sm" onClick={resetToTickets}>Yakunlash <CheckCircle className="w-4 h-4 ml-1" /></Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show tickets in selected group
  if (activeGroupId) {
    const group = catTests?.find((ct: any) => ct.id === activeGroupId);
    const groupTicketIds = (group?.ticket_ids as string[]) || [];
    const groupTickets = (tickets || []).filter((t: any) => groupTicketIds.includes(t.id));

    return (
      <DashboardLayout>
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={resetToGroups} className="mb-2">← Ortga</Button>
          <h1 className="text-2xl font-display font-bold text-foreground">{group?.title}</h1>
          <p className="text-sm text-muted-foreground">Biletni tanlang va mashq qiling</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupTickets.map((ticket: any) => (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer"
              onClick={() => { setActiveTicketId(ticket.id); setCurrentQ(0); setAnswers({}); setRevealed({}); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">Bilet #{ticket.ticket_number}</p>
                  <p className="text-xs text-muted-foreground">{ticket.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {groupTickets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Biletlar yo'q</p></div>
        )}
      </DashboardLayout>
    );
  }

  // Groups list
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Mavzulashtirilgan testlar</h1>
        <p className="text-sm text-muted-foreground">Guruhni tanlang va mashq qiling</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(catTests || []).map((ct: any) => (
          <motion.div key={ct.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer"
            onClick={() => setActiveGroupId(ct.id)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-display font-semibold text-foreground text-sm">{ct.title}</p>
                <p className="text-xs text-muted-foreground">{(ct.ticket_ids as string[]).length} ta bilet</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {(!catTests || catTests.length === 0) && (
        <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Hali guruhlar yo'q</p></div>
      )}
    </DashboardLayout>
  );
}
