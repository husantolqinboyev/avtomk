import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import DeviceBlockedScreen from "@/components/DeviceBlockedScreen";
import { BookOpen, FileText, BarChart3, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";

export default function StudentDashboard() {
  const { user, t } = useAuth();
  const { allowed, checking } = useDeviceFingerprint(user?.id);

  const { data: results } = useQuery({
    queryKey: ["student-dash-results", user?.id],
    enabled: !!user && allowed === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title, ticket_number)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: topics } = useQuery({
    queryKey: ["student-dash-topics"],
    enabled: allowed === true,
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id").limit(100);
      return data || [];
    },
  });

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allowed === false) {
    return <DeviceBlockedScreen />;
  }

  const totalTests = results?.length || 0;
  const avgScore = totalTests ? Math.round(results!.reduce((s, r) => s + r.score, 0) / totalTests) : 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{t("O'quvchi paneli")}</h1>
        <p className="text-sm text-muted-foreground">{t("O'rganish jarayoningizni kuzating")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title={t("Mavzular")} value={topics?.length || 0} icon={BookOpen} variant="primary" />
        <StatCard title={t("Ishlangan testlar")} value={totalTests} icon={FileText} variant="success" />
        <StatCard title={t("O'rtacha ball")} value={`${avgScore}%`} icon={BarChart3} variant="warning" />
        <StatCard title={t("A'lo natijalar")} value={results?.filter((r) => r.score >= 80).length || 0} icon={CheckCircle} subtitle={t("80%+ ball")} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card p-5 shadow-card"
      >
        <h3 className="font-display font-semibold text-foreground mb-4">{t("So'nggi testlar")}</h3>
        <div className="space-y-3">
          {(results || []).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${r.score >= 80 ? "bg-success/10 text-success" : r.score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                }`}>
                {r.score}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {t("Bilet")} #{r.tickets?.ticket_number}: {t(r.tickets?.title || "")}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-success">{r.correct_answers} {t("to'g'ri")}</span> / {r.total_questions} {t("ta savol")}
                </p>
              </div>
              {r.score >= 80 ? <CheckCircle className="w-4 h-4 text-success shrink-0" /> : <XCircle className="w-4 h-4 text-warning shrink-0" />}
            </div>
          ))}
          {(!results || results.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">{t("Hali test yechilmagan")}</p>
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
