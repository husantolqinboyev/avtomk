import { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className={isMobile ? "pt-14" : "ml-[260px] transition-all duration-200"}>
        <div className={isMobile ? "p-4" : "p-6"}>{children}</div>
      </main>
    </div>
  );
}
