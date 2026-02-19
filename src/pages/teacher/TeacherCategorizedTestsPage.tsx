import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { getCachedTickets, cacheTickets } from "@/lib/indexedDB";

export default function TeacherCategorizedTestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const { data: tickets } = useQuery({
    queryKey: ["cat-manage-tickets"],
    queryFn: async () => {
      const cached = await getCachedTickets();
      if (cached.length > 0) return cached;
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      if (data?.length) await cacheTickets(data);
      return data || [];
    },
  });

  const { data: catTests, refetch } = useQuery({
    queryKey: ["categorized-tests-manage"],
    queryFn: async () => {
      const { data } = await supabase.from("categorized_tests").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const toggleTicket = (id: string) => {
    setSelectedTickets((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!title || selectedTickets.length === 0 || !user) return;
    const { error } = await supabase.from("categorized_tests").insert({
      title,
      ticket_ids: selectedTickets,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mavzulashtirilgan test yaratildi!" });
    setDialog(false);
    setTitle("");
    setSelectedTickets([]);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("categorized_tests").delete().eq("id", id);
    toast({ title: "O'chirildi" });
    refetch();
  };

  const getTicketNames = (ids: string[]) => {
    return ids.map((id) => {
      const t = (tickets || []).find((t: any) => t.id === id);
      return t ? `#${t.ticket_number}` : "";
    }).filter(Boolean).join(", ");
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Mavzulashtirilgan testlar</h1>
          <p className="text-sm text-muted-foreground">Biletlarni guruhlarga ajrating</p>
        </div>
        <Button size="sm" onClick={() => setDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Yangi guruh
        </Button>
      </div>

      <div className="space-y-3">
        {(catTests || []).map((ct: any) => (
          <motion.div key={ct.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{ct.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Biletlar: {getTicketNames(ct.ticket_ids as string[])}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(ct.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </motion.div>
        ))}
        {(!catTests || catTests.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Hali guruhlar yo'q</p>
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yangi guruh yaratish</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Guruh nomi</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: YHQ qoidalari" />
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
            <Button onClick={handleCreate} disabled={!title || selectedTickets.length === 0}>Yaratish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
