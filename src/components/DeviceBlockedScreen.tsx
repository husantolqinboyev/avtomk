import { ShieldAlert, Monitor, Smartphone } from "lucide-react";

export default function DeviceBlockedScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-8 shadow-card text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground mb-2">
          Qurilma cheklangan
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sizning akkauntingiz boshqa qurilmada ro'yxatdan o'tgan. Har bir o'quvchiga faqat 1 ta kompyuter va 1 ta mobil qurilma ruxsat etiladi.
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
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
          <p className="text-xs text-warning font-medium">
            ⚠️ Qurilmangizni almashtirish uchun adminstratorga murojaat qiling
          </p>
        </div>
      </div>
    </div>
  );
}
