import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, CheckCircle, XCircle, ArrowRight, Maximize, Minimize } from "lucide-react";
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
  const { user, t } = useAuth();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        setShowExplanation(false);
      } else {
        resetToTickets();
      }
    }, 1500);
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

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Keyboard support for F1-F4
  useEffect(() => {
    if (!activeTicketId || !questions || !q || revealed[currentQ]) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        "F1": 0, "F2": 1, "F3": 2, "F4": 3
      };

      if (e.key in keyMap) {
        e.preventDefault();
        const index = keyMap[e.key];
        if (q.options[index]) {
          handleAnswer(q.options[index]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTicketId, questions, currentQ, revealed, q, handleAnswer]);

  // Practice mode
  if (activeTicketId && questions) {
    const isRevealed = revealed[currentQ];
    const selectedAnswer = answers[currentQ];
    const isCorrect = selectedAnswer === q?.correct_answer;

    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto select-none px-4" style={{ userSelect: "none" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={resetToTickets} className="h-9 px-4 rounded-lg">← {t("Ortga")}</Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
            <span className="text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">{currentQ + 1} / {totalQ}</span>
          </div>

          <div className="h-2.5 rounded-full bg-muted mb-8 overflow-hidden shadow-inner">
            <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }} />
          </div>

          {q && (
            <motion.div key={currentQ} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 md:p-8 shadow-xl">
              <div className="mb-8 p-6 rounded-xl bg-muted/30 border border-border/50">
                <h2 className="text-xl md:text-2xl font-bold text-foreground leading-relaxed">
                  {t(q.question_text)}
                </h2>
              </div>

              <div className={`grid grid-cols-1 ${q.image_url ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'} gap-10 items-start`}>
                {q.image_url && (
                  <div className="w-full overflow-hidden rounded-xl border border-border bg-muted/20">
                    <img
                      src={q.image_url}
                      alt=""
                      className="w-full h-auto max-h-[500px] object-contain mx-auto"
                    />
                  </div>
                )}

                <div className="space-y-3 w-full">
                  {q.options.map((opt, oi) => {
                    const isThisCorrect = opt === q.correct_answer;
                    const isThisSelected = selectedAnswer === opt;
                    let optClass = "border-border hover:border-primary/50 text-foreground bg-card";
                    if (isRevealed) {
                      if (isThisCorrect) optClass = "border-success bg-success/10 text-success font-semibold shadow-sm";
                      else if (isThisSelected) optClass = "border-destructive bg-destructive/10 text-destructive font-semibold shadow-sm";
                      else optClass = "border-border text-muted-foreground opacity-60";
                    }
                    return (
                      <button key={oi} onClick={() => handleAnswer(opt)} disabled={isRevealed}
                        className={`w-full text-left px-5 py-4 rounded-xl border text-sm md:text-base transition-all duration-200 ${optClass} active:scale-[0.98]`}>
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs">
                            {OPTION_LABELS[oi] || `F${oi + 1}`}
                          </span>
                          <span className="pt-1">{t(opt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {isRevealed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-success"><CheckCircle className="w-4 h-4" /><span className="text-sm font-medium">{t("To'g'ri!")}</span></div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 text-destructive mb-1"><XCircle className="w-4 h-4" /><span className="text-sm font-medium">{t("Noto'g'ri")}</span></div>
                      <p className="text-xs text-muted-foreground">{t("To'g'ri javob:")} <span className="text-success font-medium">{t(q.correct_answer)}</span></p>
                    </div>
                  )}
                  {q.explanation && (
                    <div className="mt-2">
                      {!showExplanation ? (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => {
                          if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
                          setShowExplanation(true);
                        }}>
                          {t("Izoh o'qish")}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-2">{t(q.explanation)}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="flex justify-end mt-4">
            {isRevealed && currentQ < totalQ - 1 && (
              <Button size="sm" onClick={() => { if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current); setCurrentQ(currentQ + 1); }}>{t("Keyingi")} <ArrowRight className="w-4 h-4 ml-1" /></Button>
            )}
            {isRevealed && currentQ === totalQ - 1 && (
              <Button size="sm" onClick={resetToTickets}>{t("Yakunlash")} <CheckCircle className="w-4 h-4 ml-1" /></Button>
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
          <Button variant="ghost" size="sm" onClick={resetToGroups} className="mb-2">← {t("Ortga")}</Button>
          <h1 className="text-2xl font-display font-bold text-foreground">{t(group?.title || "")}</h1>
          <p className="text-sm text-muted-foreground">{t("Biletni tanlang va mashq qiling")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupTickets.map((ticket: any) => (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer"
              onClick={() => { setActiveTicketId(ticket.id); setCurrentQ(0); setAnswers({}); setRevealed({}); }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">{t("Bilet")} #{ticket.ticket_number}</p>
                  <p className="text-xs text-muted-foreground">{t(ticket.title)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {groupTickets.length === 0 && (
          <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">{t("Biletlar yo'q")}</p></div>
        )}
      </DashboardLayout>
    );
  }

  // Groups list
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{t("Mavzulashtirilgan testlar")}</h1>
        <p className="text-sm text-muted-foreground">{t("Guruhni tanlang va mashq qiling")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(catTests || []).map((ct: any) => (
          <motion.div key={ct.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer"
            onClick={() => setActiveGroupId(ct.id)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-display font-semibold text-foreground text-sm">{t(ct.title)}</p>
                <p className="text-xs text-muted-foreground">{(ct.ticket_ids as string[]).length} {t("ta bilet")}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {(!catTests || catTests.length === 0) && (
        <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">{t("Hali guruhlar yo'q")}</p></div>
      )}
    </DashboardLayout>
  );
}
