import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Users, GraduationCap, FileText, BookOpen, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dash-stats"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("role");
      const students = roles?.filter((r) => r.role === "student").length || 0;
      const teachers = roles?.filter((r) => r.role === "teacher").length || 0;
      const { data: tickets } = await supabase.from("tickets").select("id");
      const { data: topics } = await supabase.from("topics").select("id");
      return { students, teachers, tickets: tickets?.length || 0, topics: topics?.length || 0 };
    },
  });

  const { data: recentResults } = useQuery({
    queryKey: ["admin-recent-results"],
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

  // Top 20 most active students
  const { data: top20 } = useQuery({
    queryKey: ["admin-top20"],
    queryFn: async () => {
      const { data: allResults } = await supabase
        .from("test_results")
        .select("user_id, score")
        .limit(1000);

      if (!allResults?.length) return [];

      // Aggregate by user
      const userMap: Record<string, { count: number; totalScore: number }> = {};
      allResults.forEach((r) => {
        if (!userMap[r.user_id]) userMap[r.user_id] = { count: 0, totalScore: 0 };
        userMap[r.user_id].count++;
        userMap[r.user_id].totalScore += r.score;
      });

      const sorted = Object.entries(userMap)
        .map(([user_id, s]) => ({ user_id, count: s.count, avg: Math.round(s.totalScore / s.count) }))
        .sort((a, b) => b.count - a.count || b.avg - a.avg)
        .slice(0, 20);

      const userIds = sorted.map((s) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));

      return sorted.map((s, i) => ({ ...s, rank: i + 1, name: map[s.user_id] || "Noma'lum" }));
    },
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Boshqaruv paneli</h1>
        <p className="text-sm text-muted-foreground">Avtomaktab tizimining umumiy ko'rinishi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="O'quvchilar" value={stats?.students || 0} icon={Users} variant="primary" />
        <StatCard title="O'qituvchilar" value={stats?.teachers || 0} icon={GraduationCap} variant="success" />
        <StatCard title="Biletlar" value={stats?.tickets || 0} icon={FileText} variant="warning" />
        <StatCard title="Mavzular" value={stats?.topics || 0} icon={BookOpen} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card"
        >
          <h3 className="font-display font-semibold text-foreground mb-4">So'nggi test natijalari</h3>
          <div className="space-y-3">
            {(recentResults || []).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  r.score >= 80 ? "bg-success/10 text-success" : r.score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                }`}>
                  {r.score}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Bilet #{r.tickets?.ticket_number} · {r.correct_answers}/{r.total_questions} to'g'ri
                  </p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {new Date(r.completed_at).toLocaleDateString("uz")}
                </span>
              </div>
            ))}
            {(!recentResults || recentResults.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Hali natijalar yo'q</p>
            )}
          </div>
        </motion.div>

        {/* Top 20 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card"
        >
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" /> Top 20 — eng faol o'quvchilar
          </h3>
          <div className="space-y-2">
            {(top20 || []).map((s: any) => (
              <div key={s.user_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  s.rank <= 3 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                }`}>
                  {s.rank <= 3 ? ["🥇", "🥈", "🥉"][s.rank - 1] : s.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.count} ta test · O'rtacha {s.avg}%</p>
                </div>
                <span className={`text-sm font-bold ${s.avg >= 80 ? "text-success" : s.avg >= 60 ? "text-warning" : "text-destructive"}`}>
                  {s.avg}%
                </span>
              </div>
            ))}
            {(!top20 || top20.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Hali ma'lumotlar yo'q</p>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
