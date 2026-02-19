import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCachedQuestions } from "@/lib/indexedDB";

interface ErrorQuestion {
  question_id: string;
  question_text: string;
  correct_answer: string;
  explanation: string | null;
  image_url: string | null;
  options: string[];
  selected: string | null;
  ticket_title: string;
}

export default function StudentErrorsPage() {
  const { user } = useAuth();
  const [errors, setErrors] = useState<ErrorQuestion[]>([]);
  const [practiceIdx, setPracticeIdx] = useState<number | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<string | null>(null);
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  const OPTION_LABELS = ["F1", "F2", "F3", "F4"];

  const { data: results } = useQuery({
    queryKey: ["my-results-errors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!results) return;
    const loadErrors = async () => {
      const errorMap = new Map<string, ErrorQuestion>();

      for (const result of results) {
        const answersArr = (result.answers as any[]) || [];
        const wrongAnswers = answersArr.filter((a) => !a.correct);

        for (const wa of wrongAnswers) {
          if (errorMap.has(wa.question_id)) continue;
          // Try cache first
          let question: any = null;
          try {
            const cached = await getCachedQuestions(result.ticket_id);
            question = cached.find((q: any) => q.id === wa.question_id);
          } catch {}

          if (!question) {
            const { data } = await supabase
              .from("questions")
              .select("*")
              .eq("id", wa.question_id)
              .single();
            question = data;
          }

          if (question) {
            errorMap.set(wa.question_id, {
              question_id: wa.question_id,
              question_text: question.question_text,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
              image_url: question.image_url,
              options: question.options as string[],
              selected: wa.selected,
              ticket_title: (result as any).tickets?.title || "",
            });
          }
        }
      }
      setErrors(Array.from(errorMap.values()));
    };
    loadErrors();
  }, [results]);

  const handlePracticeAnswer = (opt: string) => {
    if (practiceRevealed) return;
    setPracticeAnswer(opt);
    setPracticeRevealed(true);
  };

  const handleCorrect = (questionId: string) => {
    setErrors((prev) => prev.filter((e) => e.question_id !== questionId));
    setPracticeIdx(null);
    setPracticeAnswer(null);
    setPracticeRevealed(false);
  };

  if (practiceIdx !== null && errors[practiceIdx]) {
    const eq = errors[practiceIdx];
    const isCorrect = practiceAnswer === eq.correct_answer;

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => { setPracticeIdx(null); setPracticeAnswer(null); setPracticeRevealed(false); }}>
              ← Ortga
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs text-muted-foreground mb-2">{eq.ticket_title}</p>
            <p className="text-base font-medium text-foreground mb-4">{eq.question_text}</p>
            {eq.image_url && <img src={eq.image_url} alt="" className="w-full max-h-48 object-contain rounded-lg mb-4 bg-muted/30" />}
            <div className="space-y-2">
              {eq.options.map((opt, oi) => {
                const isThisCorrect = opt === eq.correct_answer;
                const isThisSelected = practiceAnswer === opt;
                let cls = "border-border hover:border-primary/50 text-foreground";
                if (practiceRevealed) {
                  if (isThisCorrect) cls = "border-success bg-success/10 text-success font-medium";
                  else if (isThisSelected) cls = "border-destructive bg-destructive/10 text-destructive font-medium";
                  else cls = "border-border text-muted-foreground opacity-60";
                }
                return (
                  <button key={oi} onClick={() => handlePracticeAnswer(opt)} disabled={practiceRevealed}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${cls}`}>
                    <span className="font-bold mr-2">{OPTION_LABELS[oi] || `F${oi+1}`}.</span>{opt}
                  </button>
                );
              })}
            </div>
            {practiceRevealed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-lg border border-border bg-muted/30">
                {isCorrect ? (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" /><span className="text-sm font-medium">To'g'ri! Xato ro'yxatdan olib tashlandi.</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-destructive mb-1">
                      <XCircle className="w-4 h-4" /><span className="text-sm font-medium">Noto'g'ri</span>
                    </div>
                    <p className="text-xs text-muted-foreground">To'g'ri javob: <span className="text-success font-medium">{eq.correct_answer}</span></p>
                  </div>
                )}
                {eq.explanation && <p className="text-xs text-muted-foreground mt-1 italic">{eq.explanation}</p>}
                <div className="mt-3 flex gap-2">
                  {isCorrect && (
                    <Button size="sm" variant="outline" onClick={() => handleCorrect(eq.question_id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Tayyor
                    </Button>
                  )}
                  {!isCorrect && (
                    <Button size="sm" variant="outline" onClick={() => { setPracticeAnswer(null); setPracticeRevealed(false); }}>
                      Qayta urinish
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Xatolar</h1>
        <p className="text-sm text-muted-foreground">Noto'g'ri javob bergan savollaringiz. To'g'ri javob bering va ular yo'qoladi.</p>
      </div>
      {errors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Xatolar yo'q! Ajoyib natija!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {errors.map((eq, i) => (
              <motion.div key={eq.question_id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }}
                className="rounded-xl border border-border bg-card p-4 shadow-card cursor-pointer hover:shadow-elevated transition-all"
                onClick={() => { setPracticeIdx(i); setPracticeAnswer(null); setPracticeRevealed(false); }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{eq.question_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{eq.ticket_title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </DashboardLayout>
  );
}
