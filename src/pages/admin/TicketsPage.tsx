import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Upload, Trash2, ChevronDown, ChevronUp, Pencil, Save, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionInput {
  question_text: string;
  image_url: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export default function TicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketNumber, setTicketNumber] = useState(1);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNumber, setEditNumber] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editQ, setEditQ] = useState<any>({});

  const { data: tickets, refetch } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data } = await supabase.from("tickets").select("*").order("ticket_number");
      return data || [];
    },
  });

  const { data: allQuestions, refetch: refetchQuestions } = useQuery({
    queryKey: ["all-questions"],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("*").order("order_num");
      return data || [];
    },
  });

  const addQuestion = () => {
    setQuestions([...questions, { question_text: "", image_url: "", options: ["", "", "", ""], correct_answer: "", explanation: "" }]);
  };

  const updateQuestion = (idx: number, field: keyof QuestionInput, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push("");
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("JSON array bo'lishi kerak");
      const imported: QuestionInput[] = parsed.map((item: any) => ({
        question_text: item.question || "",
        image_url: item.image || "",
        options: item.options || [],
        correct_answer: item.correct_answer || "",
        explanation: item.explanation || "",
      }));
      setQuestions([...questions, ...imported]);
      setJsonInput("");
      toast({ title: `${imported.length} ta savol import qilindi` });
    } catch (e: any) {
      toast({ title: "JSON xatosi", description: e.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!ticketTitle) { toast({ title: "Bilet nomini kiriting", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const { data: ticket, error } = await supabase.from("tickets").insert({ ticket_number: ticketNumber, title: ticketTitle, created_by: user?.id }).select().single();
      if (error) throw error;
      if (questions.length > 0) {
        const qInsert = questions.map((q, i) => ({ ticket_id: ticket.id, question_text: q.question_text, image_url: q.image_url || null, options: q.options.filter((o) => o.trim()), correct_answer: q.correct_answer, explanation: q.explanation || null, order_num: i + 1 }));
        const { error: qErr } = await supabase.from("questions").insert(qInsert);
        if (qErr) throw qErr;
      }
      toast({ title: `Bilet #${ticketNumber} yaratildi` });
      setTicketTitle(""); setTicketNumber(ticketNumber + 1); setQuestions([]); setShowCreate(false);
      refetch(); refetchQuestions();
    } catch (e: any) { toast({ title: "Xatolik", description: e.message, variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const deleteTicket = async (id: string) => {
    await supabase.from("questions").delete().eq("ticket_id", id);
    await supabase.from("tickets").delete().eq("id", id);
    toast({ title: "Bilet o'chirildi" });
    refetch(); refetchQuestions();
  };

  const startEdit = (ticket: any) => {
    setEditingTicket(ticket.id);
    setEditTitle(ticket.title);
    setEditNumber(ticket.ticket_number);
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("tickets").update({ title: editTitle, ticket_number: editNumber }).eq("id", id);
    if (error) { toast({ title: "Xatolik", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Bilet yangilandi" });
    setEditingTicket(null);
    refetch();
  };

  const deleteQuestion = async (qId: string) => {
    await supabase.from("questions").delete().eq("id", qId);
    toast({ title: "Savol o'chirildi" });
    refetchQuestions();
  };

  const startEditQuestion = (q: any) => {
    setEditingQuestion(q.id);
    setEditQ({ question_text: q.question_text, image_url: q.image_url || "", options: [...(q.options as string[])], correct_answer: q.correct_answer, explanation: q.explanation || "" });
  };

  const saveEditQuestion = async (qId: string) => {
    const { error } = await supabase.from("questions").update({
      question_text: editQ.question_text,
      image_url: editQ.image_url || null,
      options: editQ.options.filter((o: string) => o.trim()),
      correct_answer: editQ.correct_answer,
      explanation: editQ.explanation || null,
    }).eq("id", qId);
    if (error) { toast({ title: "Xatolik", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Savol yangilandi" }); setEditingQuestion(null); refetchQuestions();
  };

  const [addingToTicket, setAddingToTicket] = useState<string | null>(null);
  const [newQ, setNewQ] = useState<QuestionInput>({ question_text: "", image_url: "", options: ["", "", "", ""], correct_answer: "", explanation: "" });

  const saveNewQuestion = async (ticketId: string) => {
    if (!newQ.question_text) { toast({ title: "Savol matnini kiriting", variant: "destructive" }); return; }
    const tQuestions = (allQuestions || []).filter((q) => q.ticket_id === ticketId);
    const { error } = await supabase.from("questions").insert({
      ticket_id: ticketId, question_text: newQ.question_text, image_url: newQ.image_url || null,
      options: newQ.options.filter((o) => o.trim()), correct_answer: newQ.correct_answer,
      explanation: newQ.explanation || null, order_num: tQuestions.length + 1,
    });
    if (error) { toast({ title: "Xatolik", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Savol qo'shildi" }); setAddingToTicket(null);
    setNewQ({ question_text: "", image_url: "", options: ["", "", "", ""], correct_answer: "", explanation: "" });
    refetchQuestions();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Biletlar</h1>
          <p className="text-sm text-muted-foreground">Test biletlarini yaratish va boshqarish</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-4 h-4 mr-1" /> Yangi bilet
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card mb-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Yangi bilet yaratish</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bilet raqami</Label>
                  <Input type="number" value={ticketNumber} onChange={(e) => setTicketNumber(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bilet nomi</Label>
                  <Input placeholder="Bilet #1 — Yo'l belgilari" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
                </div>
              </div>

              {/* JSON Import */}
              <div className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Upload className="w-4 h-4 text-primary" /> JSON orqali import
                </div>
                <Textarea placeholder='[{"question": "...", "options": [...], "correct_answer": "...", "explanation": "..."}]' value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={4} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={handleJsonImport} disabled={!jsonInput.trim()}>Import qilish</Button>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Savollar ({questions.length})</span>
                  <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="w-3 h-3 mr-1" /> Savol</Button>
                </div>
                {questions.map((q, qi) => (
                  <div key={qi} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Savol #{qi + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                    <Input placeholder="Savol matni..." value={q.question_text} onChange={(e) => updateQuestion(qi, "question_text", e.target.value)} />
                    <ImageUpload value={q.image_url} onChange={(url) => updateQuestion(qi, "image_url", url)} folder="questions" maxWidth={600} quality={0.4} />
                    <div className="space-y-1.5">
                      <Label className="text-xs">Variantlar</Label>
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" name={`correct-${qi}`} checked={q.correct_answer === opt && opt !== ""} onChange={() => updateQuestion(qi, "correct_answer", opt)} className="accent-primary" />
                          <Input placeholder={`Variant ${oi + 1}`} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} className="text-xs" />
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => addOption(qi)}><Plus className="w-3 h-3 mr-1" /> Variant</Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Izoh</Label>
                      <Textarea placeholder="Javob izohi..." value={q.explanation} onChange={(e) => updateQuestion(qi, "explanation", e.target.value)} rows={2} className="text-xs" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating}>{creating ? "Saqlanmoqda..." : "Saqlash"}</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Bekor qilish</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tickets list */}
      <div className="space-y-3">
        {(tickets || []).map((ticket) => {
          const tQuestions = (allQuestions || []).filter((q) => q.ticket_id === ticket.id);
          const isExpanded = expandedTicket === ticket.id;
          const isEditing = editingTicket === ticket.id;

          return (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => !isEditing && setExpandedTicket(isExpanded ? null : ticket.id)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input type="number" value={editNumber} onChange={(e) => setEditNumber(Number(e.target.value))} className="w-20 h-8 text-xs" />
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 text-xs flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(ticket.id)}><Save className="w-4 h-4 text-success" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTicket(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground text-sm">Bilet #{ticket.ticket_number}: {ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{tQuestions.length} ta savol</p>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startEdit(ticket); }}><Pencil className="w-3.5 h-3.5 text-primary" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteTicket(ticket.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-border p-4 space-y-3">
                      {tQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Savollar yo'q</p>
                      ) : (
                        tQuestions.map((q, i) => (
                          <div key={q.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                            {editingQuestion === q.id ? (
                              <div className="space-y-3">
                                <Input value={editQ.question_text} onChange={(e) => setEditQ({ ...editQ, question_text: e.target.value })} placeholder="Savol matni" />
                                <ImageUpload value={editQ.image_url} onChange={(url) => setEditQ({ ...editQ, image_url: url })} folder="questions" maxWidth={600} quality={0.4} />
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Variantlar</Label>
                                  {editQ.options.map((opt: string, oi: number) => (
                                    <div key={oi} className="flex items-center gap-2">
                                      <input type="radio" name="edit-correct" checked={editQ.correct_answer === opt && opt !== ""} onChange={() => setEditQ({ ...editQ, correct_answer: opt })} className="accent-primary" />
                                      <Input value={opt} onChange={(e) => { const opts = [...editQ.options]; opts[oi] = e.target.value; setEditQ({ ...editQ, options: opts }); }} className="text-xs" />
                                      <button onClick={() => { const opts = editQ.options.filter((_: any, idx: number) => idx !== oi); setEditQ({ ...editQ, options: opts }); }} className="text-destructive"><X className="w-3 h-3" /></button>
                                    </div>
                                  ))}
                                  <Button variant="ghost" size="sm" onClick={() => setEditQ({ ...editQ, options: [...editQ.options, ""] })}><Plus className="w-3 h-3 mr-1" /> Variant</Button>
                                </div>
                                <Textarea value={editQ.explanation} onChange={(e) => setEditQ({ ...editQ, explanation: e.target.value })} placeholder="Izoh" rows={2} className="text-xs" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveEditQuestion(q.id)}><Save className="w-3 h-3 mr-1" /> Saqlash</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingQuestion(null)}>Bekor</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between">
                                  <p className="text-sm font-medium text-foreground flex-1">{i + 1}. {q.question_text}</p>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => startEditQuestion(q)}><Pencil className="w-3 h-3 text-primary" /></Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                  </div>
                                </div>
                                {q.image_url && <img src={q.image_url} alt="" className="h-32 rounded-lg object-cover" />}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {(q.options as string[]).map((opt: string, oi: number) => (
                                    <div key={oi} className={`text-xs px-2 py-1.5 rounded ${opt === q.correct_answer ? "bg-success/10 text-success font-medium" : "bg-muted/50 text-muted-foreground"}`}>
                                      {String.fromCharCode(65 + oi)}. {opt}
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && <p className="text-xs text-muted-foreground italic">{q.explanation}</p>}
                              </>
                            )}
                          </div>
                        ))
                      )}

                      {/* Add new question to this ticket */}
                      {addingToTicket === ticket.id ? (
                        <div className="border border-primary/30 rounded-lg p-4 space-y-3 bg-primary/5">
                          <span className="text-xs font-semibold text-primary">Yangi savol</span>
                          <Input value={newQ.question_text} onChange={(e) => setNewQ({ ...newQ, question_text: e.target.value })} placeholder="Savol matni" />
                          <ImageUpload value={newQ.image_url} onChange={(url) => setNewQ({ ...newQ, image_url: url })} folder="questions" maxWidth={600} quality={0.4} />
                          <div className="space-y-1.5">
                            <Label className="text-xs">Variantlar</Label>
                            {newQ.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input type="radio" name="new-correct" checked={newQ.correct_answer === opt && opt !== ""} onChange={() => setNewQ({ ...newQ, correct_answer: opt })} className="accent-primary" />
                                <Input value={opt} onChange={(e) => { const opts = [...newQ.options]; opts[oi] = e.target.value; setNewQ({ ...newQ, options: opts }); }} className="text-xs" placeholder={`Variant ${oi + 1}`} />
                              </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => setNewQ({ ...newQ, options: [...newQ.options, ""] })}><Plus className="w-3 h-3 mr-1" /> Variant</Button>
                          </div>
                          <Textarea value={newQ.explanation} onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })} placeholder="Izoh" rows={2} className="text-xs" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveNewQuestion(ticket.id)}><Save className="w-3 h-3 mr-1" /> Saqlash</Button>
                            <Button size="sm" variant="outline" onClick={() => setAddingToTicket(null)}>Bekor</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingToTicket(ticket.id)}>
                          <Plus className="w-3 h-3 mr-1" /> Yangi savol qo'shish
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {(!tickets || tickets.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Hali biletlar yo'q</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
