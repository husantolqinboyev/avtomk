import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Trash2, Search, KeyRound, UserMinus, Link2, Smartphone, Monitor, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDisplayLogin } from "@/lib/utils";

export default function UsersPage() {
  const { user, t } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", role: "student" as "student" | "teacher", expires_at: "",
    pc_limit: 1, mobile_limit: 1
  });

  // Edit limits dialog
  const [limitsDialog, setLimitsDialog] = useState<{ open: boolean; userId: string; name: string; pc: number; mobile: number }>({
    open: false, userId: "", name: "", pc: 1, mobile: 1
  });
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Password dialog
  const [pwDialog, setPwDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Assign dialog
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; studentId: string; name: string }>({ open: false, studentId: "", name: "" });
  const [selectedTeacher, setSelectedTeacher] = useState("");

  const { data: profiles, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("*");

      return (profs || []).map((p: any) => {
        // Email ni profile dan olishga harakat qilamiz
        // Agar profile da email bo'lmasa, user_id dan login yasaymiz
        const email = p.email || `${p.user_id}@avto.uz`;
        return {
          ...p,
          email: email,
          role: roles?.find((r) => r.user_id === p.user_id)?.role || "student",
        };
      });
    },
  });

  const { data: assignments, refetch: refetchAssign } = useQuery({
    queryKey: ["teacher-student-assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("teacher_students").select("*");
      return data || [];
    },
  });

  const teachers = (profiles || []).filter((p) => p.role === "teacher");
  const students = (profiles || []).filter((p) => p.role === "student");

  const invokeEdge = async (body: any) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error(t("Siz tizimga kirmagansiz. Qayta kirishingiz kerak."));
    }

    const token = session.access_token;

    // Use Supabase client
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || "Foydalanuvchi yaratishda xatolik");
    }
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast({ title: t("Barcha maydonlarni to'ldiring"), variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const emailWithDomain = form.email.includes("@") ? form.email : `${form.email}@avto.uz`;
      const data = await invokeEdge({
        email: emailWithDomain,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        pc_limit: form.pc_limit,
        mobile_limit: form.mobile_limit
      });
      if (form.expires_at && data?.user?.id) {
        await supabase.from("profiles").update({ expires_at: form.expires_at }).eq("user_id", data.user.id);
      }
      toast({ title: t("Foydalanuvchi yaratildi!") });
      setForm({ full_name: "", email: "", password: "", role: "student", expires_at: "", pc_limit: 1, mobile_limit: 1 });
      refetch();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(t("{name} o'chirilsinmi?").replace("{name}", name))) return;
    try {
      await invokeEdge({ action: "delete", user_id: userId });
      toast({ title: t("Foydalanuvchi o'chirildi") });
      refetch(); refetchAssign();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: t("Parol kamida 6 belgidan iborat bo'lishi kerak"), variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      await invokeEdge({ action: "update_password", user_id: pwDialog.userId, password: newPassword });
      toast({ title: t("Parol yangilandi!") });
      setPwDialog({ open: false, userId: "", name: "" });
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTeacher) return;
    try {
      const { error } = await supabase.from("teacher_students").insert({
        teacher_id: selectedTeacher,
        student_id: assignDialog.studentId,
      });
      if (error) throw error;
      toast({ title: t("O'quvchi biriktirildi!") });
      setAssignDialog({ open: false, studentId: "", name: "" });
      setSelectedTeacher("");
      refetchAssign();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    }
  };

  const handleUnassign = async (teacherId: string, studentId: string) => {
    await supabase.from("teacher_students").delete().eq("teacher_id", teacherId).eq("student_id", studentId);
    toast({ title: t("Biriktirish bekor qilindi") });
    refetchAssign();
  };

  const handleUpdateLimits = async () => {
    setLimitsLoading(true);
    try {
      const { error } = await supabase.from("profiles").update({
        pc_limit: limitsDialog.pc,
        mobile_limit: limitsDialog.mobile
      }).eq("user_id", limitsDialog.userId);

      if (error) throw error;
      toast({ title: t("Qurilma limitlari yangilandi!") });
      setLimitsDialog({ ...limitsDialog, open: false });
      refetch();
    } catch (e: any) {
      toast({ title: "Xatolik", description: e.message, variant: "destructive" });
    } finally {
      setLimitsLoading(false);
    }
  };

  const getTeacherName = (teacherId: string) => teachers.find((t) => t.user_id === teacherId)?.full_name || "—";

  const filtered = (profiles || []).filter(
    (p) => p.full_name.toLowerCase().includes(search.toLowerCase()) || (p.phone || "").includes(search)
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{t("Foydalanuvchilar")}</h1>
        <p className="text-sm text-muted-foreground">{t("O'qituvchi va o'quvchi akkauntlarini boshqarish")}</p>
      </div>

      {/* Create form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 shadow-card mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" /> {t("Yangi akkaunt yaratish")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("To'liq ism")}</Label>
            <Input placeholder={t("Sardor Karimov")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Login")}</Label>
            <Input type="text" placeholder="sardor" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Parol")}</Label>
            <Input type="password" placeholder={t("Kamida 6 belgi")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Rol")}</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{t("O'quvchi")}</SelectItem>
                <SelectItem value="teacher">{t("O'qituvchi")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Faoliyat muddati")}</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          {form.role === "student" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("PC limiti")}</Label>
                <Input type="number" min={1} value={form.pc_limit} onChange={(e) => setForm({ ...form, pc_limit: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Mobil limiti")}</Label>
                <Input type="number" min={1} value={form.mobile_limit} onChange={(e) => setForm({ ...form, mobile_limit: parseInt(e.target.value) || 1 })} />
              </div>
            </>
          )}
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? t("Yaratilmoqda...") : t("Yaratish")}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Users list */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> {t("Barcha foydalanuvchilar")} ({filtered.length})
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("Qidirish...")} className="pl-9 h-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{t("Ism")}</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">{t("Login")}</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">{t("Telefon")}</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{t("Rol")}</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden md:table-cell">{t("O'qituvchi")}</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden md:table-cell">{t("Limitlar")}</th>
                <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium hidden md:table-cell">{t("Muddat")}</th>
                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">{t("Amallar")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const studentAssignment = assignments?.find((a) => a.student_id === p.user_id);
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-foreground">{p.full_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell">
                      <span className="text-xs font-mono">{formatDisplayLogin(p.email)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell">{p.phone || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.role === "admin" ? "bg-primary/10 text-primary" : p.role === "teacher" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>
                        {p.role === "admin" ? t("Admin") : p.role === "teacher" ? t("O'qituvchi") : t("O'quvchi")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      {p.role === "student" && studentAssignment ? (
                        <span className="flex items-center gap-1">
                          {getTeacherName(studentAssignment.teacher_id)}
                          <button onClick={() => handleUnassign(studentAssignment.teacher_id, p.user_id)} className="text-destructive hover:text-destructive/80">
                            <UserMinus className="w-3 h-3" />
                          </button>
                        </span>
                      ) : p.role === "student" ? (
                        <button onClick={() => setAssignDialog({ open: true, studentId: p.user_id, name: p.full_name })} className="text-primary hover:underline flex items-center gap-1">
                          <Link2 className="w-3 h-3" /> {t("Biriktirish")}
                        </button>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground hidden md:table-cell">
                      {p.role === "student" ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                            <div className="flex items-center gap-1">
                              <Monitor className="w-3 h-3" />
                              <span className="font-medium">{p.pc_limit || 1}</span>
                            </div>
                            <div className="w-[1px] h-3 bg-border" />
                            <div className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              <span className="font-medium">{p.mobile_limit || 1}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setLimitsDialog({ open: true, userId: p.user_id, name: p.full_name, pc: p.pc_limit || 1, mobile: p.mobile_limit || 1 })}
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs hidden md:table-cell">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString("uz") : t("Cheksiz")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.role !== "admin" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setPwDialog({ open: true, userId: p.user_id, name: p.full_name }); setNewPassword(""); }}
                            title="Parolni o'zgartirish">
                            <KeyRound className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          {p.role === "student" && (
                            <Button variant="ghost" size="sm" title="Qurilmalarni tiklash" onClick={async () => {
                              try {
                                await invokeEdge({ action: "reset_device", user_id: p.user_id });
                                toast({ title: `${p.full_name} qurilmalari tiklandi` });
                              } catch (e: any) {
                                toast({ title: "Xatolik", description: e.message, variant: "destructive" });
                              }
                            }}>
                              <Smartphone className="w-3.5 h-3.5 text-warning" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.user_id, p.full_name)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">{t("Foydalanuvchilar topilmadi")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Password Dialog */}
      <Dialog open={pwDialog.open} onOpenChange={(o) => setPwDialog({ ...pwDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{pwDialog.name} — {t("Parolni o'zgartirish")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">{t("Yangi parol")}</Label>
            <Input type="password" placeholder={t("Kamida 6 belgi")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog({ open: false, userId: "", name: "" })}>{t("Bekor qilish")}</Button>
            <Button onClick={handlePasswordChange} disabled={pwLoading}>{pwLoading ? t("Saqlanmoqda...") : t("Saqlash")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(o) => setAssignDialog({ ...assignDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{assignDialog.name} — {t("O'qituvchiga biriktirish")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">{t("O'qituvchini tanlang")}</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger><SelectValue placeholder={t("O'qituvchi...")} /></SelectTrigger>
              <SelectContent>
                {teachers.map((t_node) => (
                  <SelectItem key={t_node.user_id} value={t_node.user_id}>{t_node.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, studentId: "", name: "" })}>{t("Bekor qilish")}</Button>
            <Button onClick={handleAssign} disabled={!selectedTeacher}>{t("Biriktirish")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limits Dialog */}
      <Dialog open={limitsDialog.open} onOpenChange={(o) => setLimitsDialog({ ...limitsDialog, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{limitsDialog.name} — {t("Qurilma limitlari")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("PC limiti")}</Label>
              <Input type="number" min={1} value={limitsDialog.pc} onChange={(e) => setLimitsDialog({ ...limitsDialog, pc: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-2">
              <Label>{t("Mobil limiti")}</Label>
              <Input type="number" min={1} value={limitsDialog.mobile} onChange={(e) => setLimitsDialog({ ...limitsDialog, mobile: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsDialog({ ...limitsDialog, open: false })}>{t("Bekor qilish")}</Button>
            <Button onClick={handleUpdateLimits} disabled={limitsLoading}>{limitsLoading ? t("Saqlanmoqda...") : t("Saqlash")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
