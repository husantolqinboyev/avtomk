import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Users, FileText, BarChart3, Bell, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function TeacherDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["teacher-dash-stats"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      const studentCount = roles?.length || 0;

      const { data: tickets } = await supabase.from("tickets").select("id");
      const ticketCount = tickets?.length || 0;

      const { data: results } = await supabase.from("test_results").select("score, completed_at").order("completed_at", { ascending: false }).limit(100);
      const avgScore = results?.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

      const today = new Date().toISOString().split("T")[0];
      const todayResults = results?.filter((r) => r.completed_at.startsWith(today)).length || 0;

      return { studentCount, ticketCount, avgScore, todayResults };
    },
  });

  const { data: recentResults } = useQuery({
    queryKey: ["teacher-dash-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title, ticket_number)")
        .order("completed_at", { ascending: false })
        .limit(5);
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      return data.map((r) => ({ ...r, student_name: map[r.user_id] || "Noma'lum" }));
    },
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">O'qituvchi paneli</h1>
        <p className="text-sm text-muted-foreground">O'quvchilaringiz natijalarini kuzating</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="O'quvchilar" value={stats?.studentCount || 0} icon={Users} variant="primary" />
        <StatCard title="Biletlar" value={stats?.ticketCount || 0} icon={FileText} variant="success" />
        <StatCard title="O'rtacha ball" value={`${stats?.avgScore || 0}%`} icon={BarChart3} variant="warning" />
        <StatCard title="Bugungi testlar" value={stats?.todayResults || 0} icon={Bell} subtitle="Bugun" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">So'nggi natijalar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">O'quvchi</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">Bilet</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3">Ball</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Sana</th>
              </tr>
            </thead>
            <tbody>
              {(recentResults || []).map((r: any, i) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {r.student_name?.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{r.student_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">#{r.tickets?.ticket_number}</td>
                  <td className="px-5 py-3">
                    <span className={`text-sm font-semibold ${r.score >= 80 ? "text-success" : r.score >= 60 ? "text-warning" : "text-destructive"}`}>{r.score}%</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(r.completed_at).toLocaleDateString("uz")}
                  </td>
                </tr>
              ))}
              {(!recentResults || recentResults.length === 0) && (
                <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">Hali natijalar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
