import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function StudentTopicsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: topics } = useQuery({
    queryKey: ["student-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").order("order_num");
      return data || [];
    },
  });

  const selected = topics?.find((t) => t.id === selectedId);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Mavzular</h1>
        <p className="text-sm text-muted-foreground">O'quv mavzularini o'rganing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selected ? "lg:col-span-1" : "lg:col-span-3"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {(topics || []).map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedId(selectedId === topic.id ? null : topic.id)}
                className={`rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-elevated ${
                  selectedId === topic.id ? "border-primary ring-1 ring-primary" : "border-border"
                } bg-card shadow-card`}
              >
                {topic.image_url && (
                  <img src={topic.image_url} alt={topic.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <h4 className="font-display font-semibold text-foreground text-sm">{topic.title}</h4>
                  {topic.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                  )}
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

        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">{selected.title}</h2>
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}
              </div>
            </div>
            {selected.image_url && (
              <img src={selected.image_url} alt={selected.title} className="w-full max-h-64 object-cover rounded-lg mb-4" />
            )}
            <div className="bg-muted/30 border-l-4 border-success rounded-r-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selected.content || "Bu mavzu uchun hali kontent qo'shilmagan."}
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                Yopish
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
