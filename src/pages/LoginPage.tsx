import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Eye, EyeOff, Loader2 } from "lucide-react";
import heroImage from "@/assets/hero-car.jpg";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    }
    // Navigation happens via auth state change in App.tsx
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-hero">
        <img src={heroImage} alt="Avtomobil" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Car className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-primary-foreground">AvtoTa'lim</h1>
                <p className="text-sm text-primary-foreground/60">Aqlli ta'lim tizimi</p>
              </div>
            </div>
            <h2 className="text-4xl font-display font-bold text-primary-foreground leading-tight mb-4">
              Kelajak avtomaktabi —<br />
              <span className="gradient-text">shunchaki dars emas,</span><br />
              bu tizim.
            </h2>
            <p className="text-primary-foreground/60 max-w-md">
              Admin, o'qituvchi va o'quvchi uchun yagona platforma. Testlar, tahlillar, AI maslahatlar — barchasi bir joyda.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background min-h-screen lg:min-h-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">AvtoTa'lim</h1>
              <p className="text-xs text-muted-foreground">Aqlli ta'lim tizimi</p>
            </div>
          </div>

          <h3 className="text-2xl font-display font-bold text-foreground mb-1">Tizimga kirish</h3>
          <p className="text-sm text-muted-foreground mb-8">Email va parolingizni kiriting</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@avtotalim.uz"
                required
                className="w-full h-11 px-4 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Parol</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-4 pr-10 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-elevated disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Kirish...</> : "Kirish"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 AvtoTa'lim. Barcha huquqlar himoyalangan.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
