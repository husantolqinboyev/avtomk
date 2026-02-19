import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { motion, AnimatePresence } from "framer-motion";

export default function TopicsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", content: "" });

  const { data: topics, refetch } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").order("order_num");
      if (error) console.error("Topics fetch error:", error);
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!form.title) {
      toast({ title: "Mavzu nomini kiriting", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("topics").insert({
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        content: form.content || null,
        order_num: (topics?.length || 0) + 1,
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast({ title: "Mavzu yaratildi" });
      setForm({ title: "", description: "", image_url: "", content: "" });
      setShowCreate(false);
      refetch();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteTopic = async (id: string) => {
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mavzu o'chirildi" });
    refetch();
  };

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Mavzular</h1>
          <p className="text-sm text-muted-foreground">O'quv mavzularini yaratish va boshqarish</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1" /> Yangi mavzu
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card mb-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Yangi mavzu yaratish</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mavzu nomi</Label>
                  <Input placeholder="Svetofor qoidalari" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rasm (ixtiyoriy)</Label>
                  <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} folder="topics" maxWidth={800} quality={0.45} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qisqa tavsif</Label>
                <Input placeholder="Mavzu haqida qisqacha..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mavzu matni (HTML yoki oddiy matn)</Label>
                <Textarea placeholder="Mavzu kontenti..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating}>{creating ? "Saqlanmoqda..." : "Saqlash"}</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Bekor qilish</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedTopic ? "lg:col-span-1" : "lg:col-span-3"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {(topics || []).map((topic, i) => (
              <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                className={`rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-elevated ${
                  selectedTopic === topic.id ? "border-primary ring-1 ring-primary" : "border-border"
                } bg-card shadow-card`}>
                {topic.image_url && <img src={topic.image_url} alt={topic.title} className="w-full h-32 object-cover" />}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-display font-semibold text-foreground text-sm">{topic.title}</h4>
                      {topic.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {(!topics || topics.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Hali mavzular yo'q</p>
            </div>
          )}
        </div>

        {selectedTopic && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
            {(() => {
              const topic = topics?.find((t) => t.id === selectedTopic);
              if (!topic) return null;
              return (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-success" /></div>
                    <div>
                      <h2 className="text-lg font-display font-bold text-foreground">{topic.title}</h2>
                      {topic.description && <p className="text-sm text-muted-foreground">{topic.description}</p>}
                    </div>
                  </div>
                  {topic.image_url && <img src={topic.image_url} alt={topic.title} className="w-full max-h-64 object-cover rounded-lg mb-4" />}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="bg-muted/30 border-l-4 border-success rounded-r-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {topic.content || "Bu mavzu uchun hali kontent qo'shilmagan."}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTopic(null)}>Yopish</Button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
