import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, BookOpen, LogOut,
  ChevronLeft, ChevronRight, Sun, Moon, GraduationCap, Car, BarChart3,
  Bell, ClipboardList, Menu, X, Shuffle, Send, AlertTriangle, Languages
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

const adminLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "Boshqaruv paneli" },
  { to: "/admin/users", icon: Users, label: "Foydalanuvchilar" },
  { to: "/admin/tickets", icon: ClipboardList, label: "Biletlar" },
  { to: "/admin/topics", icon: BookOpen, label: "Mavzular" },
  { to: "/admin/categorized", icon: FileText, label: "Mavzulashtirilgan testlar" },
];

const teacherLinks = [
  { to: "/teacher", icon: LayoutDashboard, label: "Boshqaruv paneli" },
  { to: "/teacher/students", icon: Users, label: "O'quvchilar" },
  { to: "/teacher/tickets", icon: ClipboardList, label: "Biletlar" },
  { to: "/teacher/topics", icon: BookOpen, label: "Mavzular" },
  { to: "/teacher/assign", icon: Send, label: "Vazifalar" },
  { to: "/teacher/categorized", icon: FileText, label: "Mavzulashtirilgan testlar" },
  { to: "/teacher/results", icon: BarChart3, label: "Natijalar" },
  { to: "/teacher/notifications", icon: Bell, label: "Bildirishnomalar" },
];

const studentLinks = [
  { to: "/student", icon: LayoutDashboard, label: "Boshqaruv paneli" },
  { to: "/student/topics", icon: BookOpen, label: "Mavzular" },
  { to: "/student/tests", icon: ClipboardList, label: "Testlar" },
  { to: "/student/random", icon: Shuffle, label: "Tasodifiy testlar" },
  { to: "/student/categorized", icon: FileText, label: "Mavzulashtirilgan testlar" },
  { to: "/student/errors", icon: AlertTriangle, label: "Xatolar" },
  { to: "/student/results", icon: BarChart3, label: "Natijalar" },
  { to: "/student/notifications", icon: Bell, label: "Bildirishnomalar" },
];

export default function DashboardSidebar() {
  const { role, userName, logout, theme, toggleTheme, script, toggleScript, t, user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnreadCount(count || 0);
    };
    fetchCount();

    const channel = supabase
      .channel("sidebar-notif-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const links = role === "admin" ? adminLinks : role === "teacher" ? teacherLinks : studentLinks;
  const roleLabel = role === "admin" ? t("Administrator") : role === "teacher" ? t("O'qituvchi") : t("O'quvchi");
  const RoleIcon = role === "admin" ? Car : role === "teacher" ? GraduationCap : Users;

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-foreground text-sm leading-tight">AvtoTa'lim</h1>
              <p className="text-[10px] text-muted-foreground">{t("Aqlli ta'lim tizimi")}</p>
            </div>
          )}
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-3 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <RoleIcon className="w-4 h-4 text-primary" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          const isNotif = link.to.includes("notifications");
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${isActive
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
            >
              <link.icon className={`w-4 h-4 shrink-0 ${isActive ? "" : "text-muted-foreground group-hover:text-foreground"}`} />
              {(!collapsed || isMobile) && (
                <span className="truncate flex-1">{t(link.label)}</span>
              )}
              {isNotif && unreadCount > 0 && (!collapsed || isMobile) && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
              {isNotif && unreadCount > 0 && collapsed && !isMobile && (
                <span className="absolute right-1 top-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {(!collapsed || isMobile) && <span>{theme === "dark" ? t("Yorug' rejim") : t("Qorong'u rejim")}</span>}
        </button>
        <button
          onClick={toggleScript}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Languages className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>{script === "latin" ? "Lotincha" : "Кириллча"}</span>}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>{t("Chiqish")}</span>}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border flex items-center px-4 gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-sm">AvtoTa'lim</span>
          </div>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed left-0 top-0 h-screen w-[280px] z-50 bg-sidebar border-r border-sidebar-border"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 h-screen z-40 bg-sidebar border-r border-sidebar-border"
    >
      {sidebarContent}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
