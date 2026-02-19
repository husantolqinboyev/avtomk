import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Send, ClipboardList, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { getCachedTickets, cacheTickets } from "@/lib/indexedDB";

export default function TeacherAssignPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [title, setTitle] = useState("");

  const { data: myStudents } = useQuery({
    queryKey: ["teacher-assign-students", user?.id],
    queryFn: async () => {
      const { data: assignments } = await supabase.from("teacher_students").select("student_id").eq("teacher_id", user!.id);
      if (!assignments?.length) return [];
      const ids = assignments.map((a) => a.student_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      return profiles || [];
    },
    enabled: !!user,
  });

  const { data: tickets } = useQuery({
    queryKey: ["teacher-assign-tickets"],
    queryFn: async () => {
      const cached = await getCachedTickets();
      if (cached.length > 0) return cached;
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      if (data?.length) await cacheTickets(data);
      return data || [];
    },
  });

  const { data: assignments, refetch: refetchAssignments } = useQuery({
    queryKey: ["teacher-assignments-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      if (!data?.length) return [];
      const studentIds = [...new Set(data.map((a: any) => a.student_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", studentIds);
      const map = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      return data.map((a: any) => ({ ...a, student_name: map[a.student_id] || "Noma'lum" }));
    },
    enabled: !!user,
  });

  const toggleTicket = (id: string) => {
    setSelectedTickets((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (!selectedStudent || selectedTickets.length === 0 || !user) return;
    try {
      // Create assignment
      const { error } = await supabase.from("assignments").insert({
        teacher_id: user.id,
        student_id: selectedStudent,
        ticket_ids: selectedTickets,
        title: title || "Yangi vazifa",
      });
      if (error) throw error;

      // Send notification to student
      const studentName = myStudents?.find((s) => s.user_id === selectedStudent)?.full_name || "";
      await supabase.from("notifications").insert({
        user_id: selectedStudent,
        title: "Yangi vazifa berildi",
        message: `${title || "Yangi vazifa"} — ${selectedTickets.length} ta bilet`,
        type: "assignment",
      });

      toast({ title: "Vazifa yuborildi!" });
      setDialog(false);
      setSelectedStudent("");
      setSelectedTickets([]);
      setTitle("");
      refetchAssignments();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Vazifalar</h1>
          <p className="text-sm text-muted-foreground">O'quvchilarga bilet vazifasi bering</p>
        </div>
        <Button size="sm" onClick={() => setDialog(true)}>
          <Send className="w-4 h-4 mr-1" /> Vazifa berish
        </Button>
      </div>

      <div className="space-y-3">
        {(assignments || []).map((a: any) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.student_name} • {(a.ticket_ids as string[]).length} ta bilet</p>
              </div>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                a.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}>
                {a.status === "completed" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {a.status === "completed" ? "Bajarildi" : "Kutilmoqda"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("uz")}</p>
          </motion.div>
        ))}
        {(!assignments || assignments.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Hali vazifalar yo'q</p>
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vazifa berish</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Vazifa nomi</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Imtihonga tayyorlanish" />
            </div>
            <div>
              <Label className="text-xs">O'quvchi</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="O'quvchini tanlang" /></SelectTrigger>
                <SelectContent>
                  {(myStudents || []).map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Biletlarni tanlang</Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {(tickets || []).map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-2 py-1.5 rounded">
                    <Checkbox checked={selectedTickets.includes(t.id)} onCheckedChange={() => toggleTicket(t.id)} />
                    <span>Bilet #{t.ticket_number}: {t.title}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedTickets.length} ta tanlandi</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Bekor qilish</Button>
            <Button onClick={handleAssign} disabled={!selectedStudent || selectedTickets.length === 0}>Yuborish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
