import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, CheckCircle, Clock, Link2, UserMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");

  // My assigned students
  const { data: myAssignments, refetch: refetchAssign } = useQuery({
    queryKey: ["teacher-my-assignments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("teacher_students").select("*").eq("teacher_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const myStudentIds = (myAssignments || []).map((a) => a.student_id);

  const { data: allStudentProfiles } = useQuery({
    queryKey: ["all-student-profiles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (!roles?.length) return [];
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", ids);
      return profiles || [];
    },
  });

  const { data: results } = useQuery({
    queryKey: ["teacher-student-results"],
    queryFn: async () => {
      const { data } = await supabase.from("test_results").select("user_id, score");
      return data || [];
    },
  });

  const students = (allStudentProfiles || [])
    .filter((p) => myStudentIds.includes(p.user_id))
    .map((p) => {
      const userResults = (results || []).filter((r) => r.user_id === p.user_id);
      const avgScore = userResults.length ? Math.round(userResults.reduce((s, r) => s + r.score, 0) / userResults.length) : 0;
      const isExpired = p.expires_at ? new Date(p.expires_at) < new Date() : false;
      return { ...p, tests: userResults.length, avgScore, isExpired };
    });

  const unassignedStudents = (allStudentProfiles || []).filter((p) => !myStudentIds.includes(p.user_id));

  const filtered = students.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));

  const handleAssign = async () => {
    if (!selectedStudent || !user) return;
    try {
      const { error } = await supabase.from("teacher_students").insert({ teacher_id: user.id, student_id: selectedStudent });
      if (error) throw error;
      toast({ title: "O'quvchi biriktirildi!" });
      setAssignDialog(false); setSelectedStudent("");
      refetchAssign();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    }
  };

  const handleUnassign = async (studentId: string) => {
    if (!user) return;
    await supabase.from("teacher_students").delete().eq("teacher_id", user.id).eq("student_id", studentId);
    toast({ title: "Biriktirish bekor qilindi" });
    refetchAssign();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">O'quvchilar</h1>
          <p className="text-sm text-muted-foreground">Sizga biriktirilgan o'quvchilar</p>
        </div>
        <Button onClick={() => setAssignDialog(true)} size="sm">
          <Link2 className="w-4 h-4 mr-1" /> O'quvchi biriktirish
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-medium text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> {filtered.length} ta o'quvchi
          </span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Qidirish..." className="pl-9 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Ism</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Testlar</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">O'rtacha</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Muddat</th>
                <th className="text-left py-2 px-4 text-xs text-muted-foreground font-medium">Holat</th>
                <th className="text-right py-2 px-4 text-xs text-muted-foreground font-medium">Amal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{s.full_name.charAt(0)}</div>
                      <span className="font-medium text-foreground">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{s.tests} ta</td>
                  <td className="py-2.5 px-4">
                    <span className={`font-semibold ${s.avgScore >= 80 ? "text-success" : s.avgScore >= 60 ? "text-warning" : "text-destructive"}`}>{s.avgScore}%</span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground hidden md:table-cell">{s.expires_at ? new Date(s.expires_at).toLocaleDateString("uz") : "Cheksiz"}</td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.isExpired ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                      {s.isExpired ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {s.isExpired ? "Muddati tugagan" : "Faol"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleUnassign(s.user_id)}><UserMinus className="w-3.5 h-3.5 text-destructive" /></Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">O'quvchilar topilmadi</div>}
      </div>

      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>O'quvchi biriktirish</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">O'quvchini tanlang</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue placeholder="O'quvchi..." /></SelectTrigger>
              <SelectContent>
                {unassignedStudents.map((s) => (
                  <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Bekor qilish</Button>
            <Button onClick={handleAssign} disabled={!selectedStudent}>Biriktirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
