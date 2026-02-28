import { useState, useEffect } from "react";
import { ShieldAlert, Monitor, Smartphone, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export default function DeviceBlockedScreen() {
  const { logout, t, user } = useAuth();
  const [limits, setLimits] = useState({ pc: 1, mobile: 1 });

  useEffect(() => {
    if (user?.id) {
      supabase
        .from("profiles")
        .select("pc_limit, mobile_limit")
        .eq("user_id", user.id)
        .single()
        .then(({ data }: { data: any }) => {
          if (data) {
            setLimits({ pc: data.pc_limit || 1, mobile: data.mobile_limit || 1 });
          }
        });
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-3xl border border-destructive/20 bg-card p-10 shadow-2xl text-center space-y-8"
      >
        <div className="relative mx-auto w-24 h-24">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-destructive/10 rounded-full"
          />
          <div className="relative w-full h-full rounded-full bg-destructive/5 flex items-center justify-center border border-destructive/20">
            <ShieldAlert className="w-12 h-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            {t("Kirish cheklangan")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("Sizning akkauntingiz uchun ruxsat etilgan qurilmalar soni oshib ketdi. Har bir o'quvchi uchun belgilangan limitlar:")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center gap-3 transition-colors hover:bg-primary/10">
            <div className="p-3 rounded-xl bg-background border border-border shadow-sm">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{limits.pc}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/80">Kompyuter</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-success/5 border border-success/10 flex flex-col items-center gap-3 transition-colors hover:bg-success/10">
            <div className="p-3 rounded-xl bg-background border border-border shadow-sm">
              <Smartphone className="w-6 h-6 text-success" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{limits.mobile}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/80">Telefon</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-start gap-4 text-left">
          <span className="text-xl">💡</span>
          <p className="text-xs font-medium leading-normal">
            {t("Qurilmangizni almashtirish yoki limitlarni kengaytirish uchun administratorga murojaat qiling.")}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => logout()}
            className="h-14 w-full gap-3 rounded-2xl text-sm font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            {t("Hisobdan chiqish")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="w-full text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground transition-colors"
          >
            {t("Login sahifasiga qaytish")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
