import { ShieldAlert, Monitor, Smartphone, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function DeviceBlockedScreen() {
  const { logout, t } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-8 shadow-card text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground mb-2">
          {t("Qurilma cheklangan")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("Sizning akkauntingiz boshqa qurilmada ro'yxatdan o'tgan. Har bir o'quvchiga faqat 1 ta kompyuter va 1 ta mobil qurilma ruxsat etiladi.")}
        </p>
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex flex-col items-center gap-1">
            <Monitor className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">1 PC</span>
          </div>
          <span className="text-muted-foreground">+</span>
          <div className="flex flex-col items-center gap-1">
            <Smartphone className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">1 Mobile</span>
          </div>
        </div>
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 mb-6">
          <p className="text-xs text-warning font-medium">
            ⚠️ {t("Qurilmangizni almashtirish uchun adminstratorga murojaat qiling")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="destructive"
            onClick={() => logout()}
            className="w-full gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t("Hisobdan chiqish")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => logout()}
            className="w-full text-muted-foreground"
          >
            {t("Login sahifasiga qaytish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
