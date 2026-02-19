import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function StudentResultsPage() {
  const { user, userName } = useAuth();

  const { data: results } = useQuery({
    queryKey: ["student-results", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("test_results")
        .select("*, tickets(title, ticket_number)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
  });

  const avgScore = results?.length
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  const handleDownloadPDF = () => {
    if (!results?.length) return;

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Test natijalari hisoboti", 14, 20);
    doc.setFontSize(10);
    doc.text(`O'quvchi: ${userName}`, 14, 28);
    doc.text(`Sana: ${new Date().toLocaleDateString("uz")}`, 14, 34);
    doc.text(`Jami testlar: ${results.length} | O'rtacha ball: ${avgScore}%`, 14, 40);

    const rows = results.map((r: any) => [
      `#${r.tickets?.ticket_number}: ${r.tickets?.title}`,
      `${r.score}%`,
      `${r.correct_answers}/${r.total_questions}`,
      `${Math.round((r.time_spent_seconds || 0) / 60)} min`,
      new Date(r.completed_at).toLocaleDateString("uz"),
    ]);

    autoTable(doc, {
      head: [["Bilet", "Ball", "To'g'ri", "Vaqt", "Sana"]],
      body: rows,
      startY: 46,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`natijalar_${userName.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Natijalar</h1>
          <p className="text-sm text-muted-foreground">Barcha test natijalaringiz</p>
        </div>
        {results && results.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-1" /> PDF yuklab olish
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-foreground">{results?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Jami testlar</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className={`text-2xl font-bold ${avgScore >= 80 ? "text-success" : avgScore >= 60 ? "text-warning" : "text-destructive"}`}>{avgScore}%</p>
          <p className="text-xs text-muted-foreground">O'rtacha ball</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-success">{results?.filter((r) => r.score >= 80).length || 0}</p>
          <p className="text-xs text-muted-foreground">A'lo natijalar</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-destructive">{results?.filter((r) => r.score < 60).length || 0}</p>
          <p className="text-xs text-muted-foreground">Qoniqarsiz</p>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {(results || []).map((r, i) => {
          const ticket = r.tickets as any;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                r.score >= 80 ? "bg-success/10 text-success" : r.score >= 60 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              }`}>
                {r.score}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  Bilet #{ticket?.ticket_number}: {ticket?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.correct_answers}/{r.total_questions} to'g'ri · {Math.round((r.time_spent_seconds || 0) / 60)} daqiqa
                </p>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">
                {new Date(r.completed_at).toLocaleDateString("uz")}
              </div>
              {r.score >= 80 ? <CheckCircle className="w-5 h-5 text-success shrink-0" /> : <XCircle className="w-5 h-5 text-destructive shrink-0" />}
            </motion.div>
          );
        })}
      </div>

      {(!results || results.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Hali test natijalaringiz yo'q</p>
        </div>
      )}
    </DashboardLayout>
  );
}
