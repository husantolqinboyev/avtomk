import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherResultsPage() {
  const { user } = useAuth();

  const { data: results } = useQuery({
    queryKey: ["teacher-my-students-results", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get assigned students
      const { data: assignments } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user!.id);

      if (!assignments?.length) return [];

      const studentIds = assignments.map((a) => a.student_id);

      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title, ticket_number)")
        .in("user_id", studentIds)
        .order("completed_at", { ascending: false })
        .limit(100);

      if (!data?.length) return [];

      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));

      return data.map((r) => ({ ...r, student_name: profileMap[r.user_id] || "Noma'lum" }));
    },
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Natijalar</h1>
        <p className="text-sm text-muted-foreground">Faqat sizga biriktirilgan o'quvchilarning natijalari</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">O'quvchi</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Bilet</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Ball</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Natija</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Sana</th>
              </tr>
            </thead>
            <tbody>
              {(results || []).map((r: any, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium text-foreground">{r.student_name}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">
                    #{r.tickets?.ticket_number}: {r.tickets?.title}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`font-semibold ${r.score >= 80 ? "text-success" : r.score >= 60 ? "text-warning" : "text-destructive"}`}>
                      {r.score}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground hidden md:table-cell">
                    {r.correct_answers}/{r.total_questions} to'g'ri
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(r.completed_at).toLocaleDateString("uz")}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!results || results.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sizga biriktirilgan o'quvchilar natijalari yo'q</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
