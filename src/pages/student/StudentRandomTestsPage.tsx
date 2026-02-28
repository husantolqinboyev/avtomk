import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shuffle, CheckCircle, XCircle, ArrowRight, Timer, Play, Maximize, Minimize } from "lucide-react";
import { motion } from "framer-motion";
import { getCachedTickets, cacheTickets, getCachedQuestions, cacheQuestions, getAllCachedQuestions } from "@/lib/indexedDB";

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  order_num: number;
  ticket_id: string;
}

const OPTION_LABELS = ["F1", "F2", "F3", "F4"];
const TEST_DURATION_SECONDS = 30 * 60;

export default function StudentRandomTestsPage() {
  const { user, t } = useAuth();
  const { toast } = useToast();
  const [testSize, setTestSize] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Timer
  useEffect(() => {
    if (!testSize || showResults || questions.length === 0) return;
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
  }, [testSize, showResults, startTime, questions.length]);

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
      document.exitFullscreen();
    }
  };

  const { data: tickets } = useQuery({
    queryKey: ["random-tickets"],
    queryFn: async () => {
      const cached = await getCachedTickets();
      if (cached.length > 0) return cached;
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      if (data?.length) await cacheTickets(data);
      return data || [];
    },
  });

  const startTest = async (size: number) => {
    setLoading(true);
    try {
      // Try to get all questions from IndexedDB first
      let allQuestions: Question[] = [];
      const allCached = await getAllCachedQuestions();

      if (allCached.length > 0) {
        allQuestions = allCached as Question[];
      } else {
        // Fetch all questions from server and cache them
        const tks = tickets || [];
        for (const t of tks) {
          const cached = await getCachedQuestions(t.id);
          if (cached.length > 0) {
            allQuestions.push(...(cached as Question[]));
          } else {
            const { data } = await supabase.from("questions").select("*").eq("ticket_id", t.id);
            if (data?.length) {
              await cacheQuestions(data);
              allQuestions.push(...(data as Question[]));
            }
          }
        }
      }

      // Shuffle and pick
      const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, size);
      setQuestions(shuffled);
      setTestSize(size);
      setCurrentQ(0);
      setAnswers({});
      setRevealed({});
      setShowResults(false);
      setStartTime(Date.now());
      setTimeLeft(TEST_DURATION_SECONDS);
    } catch (e) {
      toast({ title: t("Xatolik"), variant: "destructive" });
    }
    setLoading(false);
  };

  const nextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAnswer = (option: string) => {
    if (revealed[currentQ]) return;
    setAnswers({ ...answers, [currentQ]: option });
    setRevealed({ ...revealed, [currentQ]: true });

    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    nextTimeoutRef.current = setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setShowExplanation(false);
      } else {
        handleFinish();
      }
    }, 1500);
  };

  const handleFinish = useCallback(async () => {
    if (showResults || questions.length === 0) return;
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    setShowResults(true);
    toast({ title: t(`Test yakunlandi! Natija: ${score}%`) });
  }, [questions, answers, showResults, t]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const resetTest = () => {
    setTestSize(null);
    setQuestions([]);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    setShowExplanation(false);
    setShowResults(false);
  };

  // Keyboard support for F1-F4
  useEffect(() => {
    const q = questions[currentQ];
    if (!testSize || showResults || !questions.length || !q || revealed[currentQ]) return;

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
  }, [testSize, showResults, questions, currentQ, revealed, handleAnswer]);

  // Active test
  if (testSize && questions.length > 0 && !showResults) {
    const q = questions[currentQ];
    const totalQ = questions.length;
    const isRevealed = revealed[currentQ];
    const selectedAnswer = answers[currentQ];
    const isCorrect = selectedAnswer === q?.correct_answer;

    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto select-none px-4" style={{ userSelect: "none" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">{currentQ + 1} / {totalQ}</span>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>
            <span className={`flex items-center gap-2 text-base font-mono font-bold px-4 py-1.5 rounded-full shadow-sm ${timeLeft < 60 ? "bg-destructive/10 text-destructive animate-pulse" : timeLeft < 300 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
              }`}>
              <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
            </span>
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
                      draggable={false}
                    />
                  </div>
                )}

                <div className="space-y-3 w-full">
                  {q.options.map((opt: string, oi: number) => {
                    const isThisCorrect = opt === q.correct_answer;
                    const isThisSelected = selectedAnswer === opt;
                    let optClass = "border-border hover:border-primary/50 text-foreground bg-card";
                    if (isRevealed) {
                      if (isThisCorrect) optClass = "border-success bg-success/10 text-success font-semibold shadow-sm";
                      else if (isThisSelected && !isThisCorrect) optClass = "border-destructive bg-destructive/10 text-destructive font-semibold shadow-sm";
                      else optClass = "border-border text-muted-foreground opacity-60";
                    } else if (isThisSelected) {
                      optClass = "border-primary bg-primary/10 text-primary font-semibold shadow-sm";
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
                  <div className="flex items-center gap-2 mb-1">
                    {isCorrect ? (
                      <><CheckCircle className="w-4 h-4 text-success" /><span className="text-sm font-medium text-success">{t("To'g'ri!")}</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-destructive" /><span className="text-sm font-medium text-destructive">{t("Noto'g'ri")}</span></>
                    )}
                  </div>
                  {!isCorrect && <p className="text-xs text-muted-foreground">{t("To'g'ri javob:")} <span className="text-success font-medium">{t(q.correct_answer)}</span></p>}

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
              <Button size="sm" onClick={handleFinish}>{t("Yakunlash")} <CheckCircle className="w-4 h-4 ml-1" /></Button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-6 justify-center">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${i === currentQ ? "bg-primary text-primary-foreground" :
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

  // Results
  if (showResults && questions.length > 0) {
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center mb-6">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-3 ${score >= 80 ? "bg-success/10 text-success" : score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              }`}>{score}%</div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {score >= 80 ? t("Ajoyib!") : score >= 60 ? t("Yaxshi") : t("Ko'proq mashq qiling")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{correct} / {questions.length} {t("ta to'g'ri javob")}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Timer className="w-3 h-3" /> {formatTime(timeSpent)}
            </p>
          </div>
          <div className="text-center"><Button onClick={resetTest}>{t("Ortga qaytish")}</Button></div>
        </div>
      </DashboardLayout>
    );
  }

  // Selection screen
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{t("Tasodifiy testlar")}</h1>
        <p className="text-sm text-muted-foreground">{t("Barcha biletlardan aralash savollar")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all cursor-pointer text-center"
          onClick={() => !loading && startTest(20)}>
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Shuffle className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-display font-bold text-foreground text-lg">{t("20 ta savol")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("Aralash biletlardan")}</p>
          <Button size="sm" className="mt-3" disabled={loading}>
            <Play className="w-4 h-4 mr-1" /> {t("Boshlash")}
          </Button>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all cursor-pointer text-center"
          onClick={() => !loading && startTest(50)}>
          <div className="w-14 h-14 mx-auto rounded-xl bg-accent/50 flex items-center justify-center mb-3">
            <Shuffle className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-display font-bold text-foreground text-lg">{t("50 ta savol")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("Aralash biletlardan")}</p>
          <Button size="sm" className="mt-3" disabled={loading}>
            <Play className="w-4 h-4 mr-1" /> {t("Boshlash")}
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
