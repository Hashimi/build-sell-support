import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Salary } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/salaries")({ component: SalariesPage });

const empty = {
  workerId: "",
  period: new Date().toISOString().slice(0, 7),
  daysWorked: 0,
  amount: 0,
  paid: false,
  payDate: "",
  notes: "",
};

function SalariesPage() {
  const { t, formatMoney } = useI18n();
  const workers = useCollection("workers");
  const items = useCollection("salaries");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Salary | null>(null);
  const [form, setForm] = useState(empty);

  const start = (s?: Salary) => {
    if (s) { setEditing(s); setForm({ ...s, payDate: s.payDate ?? "", notes: s.notes ?? "" }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.workerId) { toast.error(t("selectWorker")); return false; }
    const data = { ...form, amount: form.amount || (workers.find((w) => w.id === form.workerId)?.dailyWage ?? 0) * form.daysWorked };
    if (editing) repo.update("salaries", editing.id, data);
    else repo.add("salaries", data);
    toast.success(t("save"));
    return true;
  };

  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader title={t("salaries")} subtitle={t("construction")} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <F label={t("selectWorker")}>
          <Select value={form.workerId} onValueChange={(v) => setForm({ ...form, workerId: v })}>
            <SelectTrigger><SelectValue placeholder={t("selectWorker")} /></SelectTrigger>
            <SelectContent>
              {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} — {w.role}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("period")}><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></F>
          <F label={t("daysWorked")}><Input type="number" value={form.daysWorked} onChange={(e) => setForm({ ...form, daysWorked: +e.target.value })} /></F>
        </div>
        <F label={t("amount")}><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} placeholder="auto = wage × days" /></F>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label>{t("paid")}</Label>
          <Switch checked={form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} />
        </div>
        {form.paid && <F label={t("payDate")}><Input type="date" value={form.payDate} onChange={(e) => setForm({ ...form, payDate: e.target.value })} /></F>}
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("period")}</TableHead>
                  <TableHead>{t("daysWorked")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{workerName(s.workerId)}</TableCell>
                    <TableCell>{s.period}</TableCell>
                    <TableCell>{s.daysWorked}</TableCell>
                    <TableCell className="font-semibold">{formatMoney(s.amount)}</TableCell>
                    <TableCell><Badge variant={s.paid ? "default" : "secondary"}>{s.paid ? t("paid") : t("pending")}</Badge></TableCell>
                    <TableCell className="text-end">
                      <EditButton onClick={() => start(s)} />
                      <DeleteButton onConfirm={() => repo.remove("salaries", s.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
