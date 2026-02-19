import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText, Play, CheckCircle, XCircle, ArrowRight, Timer } from "lucide-react";
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

const TEST_DURATION_SECONDS = 30 * 60;
const OPTION_LABELS = ["F1", "F2", "F3", "F4"];

export default function StudentTestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);

  // Anti copy-paste
  useEffect(() => {
    if (!activeTicketId || showResults) return;
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("contextmenu", prevent);
    const preventKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "u"].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j"].includes(e.key.toLowerCase()))) e.preventDefault();
    };
    document.addEventListener("keydown", preventKeys);
    return () => {
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("keydown", preventKeys);
    };
  }, [activeTicketId, showResults]);

  // Timer
  useEffect(() => {
    if (!activeTicketId || showResults) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = TEST_DURATION_SECONDS - elapsed;
      if (remaining <= 0) {
        clearInterval(interval);
        handleFinish();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTicketId, showResults, startTime]);

  // Tickets with IndexedDB cache
  const { data: tickets } = useQuery({
    queryKey: ["student-tickets"],
    queryFn: async () => {
      const cached = await getCachedTickets();
      if (cached.length > 0) return cached;
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      if (data && data.length > 0) await cacheTickets(data);
      return data || [];
    },
  });

  // Questions with IndexedDB cache
  const { data: questions } = useQuery({
    queryKey: ["ticket-questions", activeTicketId],
    enabled: !!activeTicketId,
    queryFn: async () => {
      const cached = await getCachedQuestions(activeTicketId!);
      if (cached.length > 0) return cached as Question[];
      const { data } = await supabase.from("questions").select("*").eq("ticket_id", activeTicketId!).order("order_num");
      if (data && data.length > 0) await cacheQuestions(data);
      return (data || []) as Question[];
    },
  });

  const { data: myResults, refetch: refetchResults } = useQuery({
    queryKey: ["my-results"],
    queryFn: async () => {
      const { data } = await supabase.from("test_results").select("*").eq("user_id", user!.id).order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const q = questions?.[currentQ];
  const totalQ = questions?.length || 0;

  const handleAnswer = (option: string) => {
    if (revealed[currentQ]) return; // already answered
    setAnswers({ ...answers, [currentQ]: option });
    setRevealed({ ...revealed, [currentQ]: true });
  };

  const handleFinish = useCallback(async () => {
    if (!questions || !activeTicketId || !user || showResults) return;
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const answersArray = questions.map((q, i) => ({
      question_id: q.id,
      selected: answers[i] || null,
      correct: answers[i] === q.correct_answer,
    }));

    await supabase.from("test_results").insert({
      user_id: user.id, ticket_id: activeTicketId, score,
      total_questions: questions.length, correct_answers: correct,
      answers: answersArray, time_spent_seconds: timeSpent,
    });

    setShowResults(true);
    refetchResults();
    toast({ title: `Test yakunlandi! Natija: ${score}%` });
  }, [questions, activeTicketId, user, answers, startTime, showResults]);

  const resetTest = () => {
    setActiveTicketId(null);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    setShowResults(false);
    setTimeLeft(TEST_DURATION_SECONDS);
  };

  const startTest = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    setShowResults(false);
    setStartTime(Date.now());
    setTimeLeft(TEST_DURATION_SECONDS);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const goNext = () => {
    if (currentQ < totalQ - 1) {
      setCurrentQ(currentQ + 1);
    }
  };

  // Active test view
  if (activeTicketId && questions && !showResults) {
    const isRevealed = revealed[currentQ];
    const selectedAnswer = answers[currentQ];
    const isCorrect = selectedAnswer === q?.correct_answer;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto select-none" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">{currentQ + 1} / {totalQ}</span>
            <span className={`flex items-center gap-1 text-sm font-mono font-bold px-3 py-1 rounded-full ${
              timeLeft < 60 ? "bg-destructive/10 text-destructive animate-pulse" : timeLeft < 300 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            }`}>
              <Timer className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
            </span>
          </div>

          <div className="h-2 rounded-full bg-muted mb-6 overflow-hidden">
            <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }} />
          </div>

          {q && (
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <p className="text-base font-medium text-foreground mb-4">{q.question_text}</p>
              {q.image_url && <img src={q.image_url} alt="" className="w-full max-h-48 object-contain rounded-lg mb-4 bg-muted/30" draggable={false} />}
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isThisCorrect = opt === q.correct_answer;
                  const isThisSelected = selectedAnswer === opt;
                  let optClass = "border-border hover:border-primary/50 text-foreground";
                  if (isRevealed) {
                    if (isThisCorrect) {
                      optClass = "border-success bg-success/10 text-success font-medium";
                    } else if (isThisSelected && !isThisCorrect) {
                      optClass = "border-destructive bg-destructive/10 text-destructive font-medium";
                    } else {
                      optClass = "border-border text-muted-foreground opacity-60";
                    }
                  } else if (isThisSelected) {
                    optClass = "border-primary bg-primary/10 text-primary font-medium";
                  }
                  return (
                    <button key={oi} onClick={() => handleAnswer(opt)} disabled={isRevealed}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optClass}`}>
                      <span className="font-bold mr-2">{OPTION_LABELS[oi] || `F${oi + 1}`}.</span>{opt}
                    </button>
                  );
                })}
              </div>

              {/* Instant feedback */}
              {isRevealed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    {isCorrect ? (
                      <><CheckCircle className="w-4 h-4 text-success" /><span className="text-sm font-medium text-success">To'g'ri!</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-destructive" /><span className="text-sm font-medium text-destructive">Noto'g'ri</span></>
                    )}
                  </div>
                  {!isCorrect && <p className="text-xs text-muted-foreground">To'g'ri javob: <span className="text-success font-medium">{q.correct_answer}</span></p>}
                  {q.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>}
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="flex justify-end mt-4">
            {isRevealed && currentQ < totalQ - 1 && (
              <Button size="sm" onClick={goNext}>Keyingi <ArrowRight className="w-4 h-4 ml-1" /></Button>
            )}
            {isRevealed && currentQ === totalQ - 1 && (
              <Button size="sm" onClick={handleFinish}>Yakunlash <CheckCircle className="w-4 h-4 ml-1" /></Button>
            )}
          </div>

          {/* Question navigator */}
          <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  i === currentQ ? "bg-primary text-primary-foreground" :
                  revealed[i] && answers[i] === questions[i].correct_answer ? "bg-success/20 text-success border border-success/30" :
                  revealed[i] ? "bg-destructive/20 text-destructive border border-destructive/30" :
                  "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Results view
  if (showResults && questions) {
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-3 ${
              score >= 80 ? "bg-success/10 text-success" : score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
            }`}>{score}%</div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {score >= 80 ? "Ajoyib!" : score >= 60 ? "Yaxshi" : "Ko'proq mashq qiling"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{correct} / {questions.length} ta to'g'ri javob</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Timer className="w-3 h-3" /> {formatTime(timeSpent)}
            </p>
          </div>
          <div className="mt-6 text-center"><Button onClick={resetTest}>Biletlar ro'yxatiga qaytish</Button></div>
        </div>
      </DashboardLayout>
    );
  }

  // Tickets list
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Testlar</h1>
        <p className="text-sm text-muted-foreground">Biletni tanlang va test yechishni boshlang</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tickets || []).map((ticket) => {
          const lastResult = myResults?.find((r) => r.ticket_id === ticket.id);
          return (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all cursor-pointer"
              onClick={() => startTest(ticket.id)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">Bilet #{ticket.ticket_number}</p>
                  <p className="text-xs text-muted-foreground">{ticket.title}</p>
                </div>
              </div>
              {lastResult ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-medium ${lastResult.score >= 80 ? "text-success" : lastResult.score >= 60 ? "text-warning" : "text-destructive"}`}>{lastResult.score}%</span>
                  <span className="text-muted-foreground">· so'nggi natija</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Play className="w-3 h-3" /> Hali yechilmagan</div>
              )}
            </motion.div>
          );
        })}
      </div>
      {(!tickets || tickets.length === 0) && (
        <div className="text-center py-12 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Hali biletlar yo'q</p></div>
      )}
    </DashboardLayout>
  );
}
