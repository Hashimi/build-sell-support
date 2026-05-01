import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type ServiceRequest } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/requests")({ component: RequestsPage });

const empty = {
  clientId: "",
  apartmentId: "",
  issue: "",
  priority: "medium" as ServiceRequest["priority"],
  status: "open" as ServiceRequest["status"],
  assignedWorkerId: "",
  notes: "",
};

const priorityColor: Record<ServiceRequest["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning-foreground",
  high: "bg-destructive/15 text-destructive",
};

function RequestsPage() {
  const { t } = useI18n();
  const clients = useCollection("clients");
  const apartments = useCollection("apartments");
  const workers = useCollection("workers");
  const items = useCollection("requests");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRequest | null>(null);
  const [form, setForm] = useState(empty);

  const start = (r?: ServiceRequest) => {
    if (r) { setEditing(r); setForm({ clientId: r.clientId, apartmentId: r.apartmentId, issue: r.issue, priority: r.priority, status: r.status, assignedWorkerId: r.assignedWorkerId ?? "", notes: r.notes ?? "" }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.issue.trim() || !form.clientId) return false;
    if (editing) repo.update("requests", editing.id, form);
    else repo.add("requests", form);
    toast.success(t("save"));
    return true;
  };
  const setStatus = (id: string, status: ServiceRequest["status"]) => repo.update("requests", id, { status });

  const cName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const aLabel = (id: string) => { const a = apartments.find((x) => x.id === id); return a ? `${a.block}-${a.apartmentNo}` : "—"; };
  const wName = (id?: string) => id ? workers.find((w) => w.id === id)?.name ?? "—" : "—";

  return (
    <div>
      <PageHeader title={t("requests")} subtitle={t("support")} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <F label={t("requestedBy")}>
          <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
            <SelectTrigger><SelectValue placeholder={t("selectClient")} /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label={t("apartment")}>
          <Select value={form.apartmentId} onValueChange={(v) => setForm({ ...form, apartmentId: v })}>
            <SelectTrigger><SelectValue placeholder={t("selectApartment")} /></SelectTrigger>
            <SelectContent>{apartments.map((a) => <SelectItem key={a.id} value={a.id}>{a.block}-{a.apartmentNo}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label={t("issue")}><Textarea value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("priority")}>
            <Select value={form.priority} onValueChange={(v: ServiceRequest["priority"]) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("low")}</SelectItem>
                <SelectItem value="medium">{t("medium")}</SelectItem>
                <SelectItem value="high">{t("high")}</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label={t("status")}>
            <Select value={form.status} onValueChange={(v: ServiceRequest["status"]) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">{t("open")}</SelectItem>
                <SelectItem value="inProgress">{t("inProgress")}</SelectItem>
                <SelectItem value="completed">{t("completed")}</SelectItem>
              </SelectContent>
            </Select>
          </F>
        </div>
        <F label={t("assignedTo")}>
          <Select value={form.assignedWorkerId} onValueChange={(v) => setForm({ ...form, assignedWorkerId: v })}>
            <SelectTrigger><SelectValue placeholder={t("selectWorker")} /></SelectTrigger>
            <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} — {w.role}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label={t("notes")}><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id} className="transition-all hover:shadow-elegant">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{cName(r.clientId)}</p>
                    <p className="text-xs text-muted-foreground">{aLabel(r.apartmentId)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[r.priority]}`}>
                  {r.priority === "high" && <AlertTriangle className="h-3 w-3" />}
                  {t(r.priority)}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{r.issue}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("assignedTo")}: <span className="font-medium text-foreground">{wName(r.assignedWorkerId)}</span></span>
                  <Badge variant={r.status === "completed" ? "default" : r.status === "inProgress" ? "secondary" : "outline"}>
                    {t(r.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 border-t pt-2">
                  {(["open", "inProgress", "completed"] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(r.id, s)}
                      className={`rounded-md border px-2 py-1 text-xs transition-colors ${r.status === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      {t(s)}
                    </button>
                  ))}
                  <div className="ms-auto flex">
                    <EditButton onClick={() => start(r)} />
                    <DeleteButton onConfirm={() => repo.remove("requests", r.id)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
