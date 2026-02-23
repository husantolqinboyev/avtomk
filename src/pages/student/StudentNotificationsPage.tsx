import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentNotificationsPage() {
  const { user, t } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, refetch } = useQuery({
    queryKey: ["student-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-student")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    refetch();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    refetch();
  };

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{t("Bildirishnomalar")}</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} {t("ta o'qilmagan")}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> {t("Barchasini o'qilgan deb belgilash")}
          </Button>
        )}
      </div>

      {(!notifications || notifications.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("Bildirishnomalar yo'q")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((n: any) => (
              <motion.div key={n.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-4 shadow-card transition-all ${n.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.read ? "bg-muted" : "bg-primary/10"}`}>
                    <Bell className={`w-4 h-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? "text-muted-foreground" : "text-foreground"}`}>{t(n.title)}</p>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5">{t(n.message)}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("uz")}</p>
                  </div>
                  {!n.read && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </DashboardLayout>
  );
}
