import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { latinToCyrillic } from "@/lib/transliterate";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "teacher" | "student";

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole | null;
  userName: string;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  script: "latin" | "cyrillic";
  toggleScript: () => void;
  t: (text: string) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("");
  // loading: true faqat boshlang'ich holat aniqlanguncha
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "dark"
  );
  const [script, setScript] = useState<"latin" | "cyrillic">(
    () => (localStorage.getItem("script") as "latin" | "cyrillic") || "latin"
  );

  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }

  const fetchUserRole = async (userId: string): Promise<UserRole | null> => {
    try {
      const { data } = await supabase.rpc("get_user_role", { _user_id: userId });
      return data as UserRole | null;
    } catch {
      return null;
    }
  };

  const fetchProfile = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();
      if (error) {
        console.warn("Profile not found for user:", userId);
        return "";
      }
      return data?.full_name || "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    // Fallback: agar 8 soniyada holat aniqlanmasa, loading'ni o'chiramiz
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        if (session?.user) {
          setUser(session.user);
          // setTimeout: Supabase deadlock'dan qochish uchun
          setTimeout(async () => {
            const [userRole, name] = await Promise.all([
              fetchUserRole(session.user.id),
              fetchProfile(session.user.id),
            ]);
            console.log("User role:", userRole, "Name:", name);
            setRole(userRole);
            setUserName(name || session.user.email || "");
            clearTimeout(fallbackTimer);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setRole(null);
          setUserName("");
          clearTimeout(fallbackTimer);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session?.user?.email);
      // Agar session yo'q bo'lsa, darhol loading'ni o'chiramiz
      if (!session) {
        clearTimeout(fallbackTimer);
        setLoading(false);
      }
      // Session bo'lsa, onAuthStateChange event'i loading'ni o'chiradi
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  const toggleScript = () => {
    const next = script === "latin" ? "cyrillic" : "latin";
    setScript(next);
    localStorage.setItem("script", next);
  };

  const t = useCallback((text: string) => {
    if (script === "latin") return text;
    return latinToCyrillic(text);
  }, [script]);

  // isAuthenticated: user mavjud VA rol yuklanib bo'lgan bo'lsa true
  // loading=false bo'lganda role tekshiramiz (role null bo'lsa foydalanuvchi tizimda yo'q)
  const isAuthenticated = !!user && !!role;

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, userName, user, loading, login, logout, theme, toggleTheme, script, toggleScript, t }}>
      {children}
    </AuthContext.Provider>
  );
};
