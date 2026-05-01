import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Worker } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/workers")({ component: WorkersPage });

const empty = {
  name: "",
  role: "",
  phone: "",
  dailyWage: 0,
  hireDate: new Date().toISOString().slice(0, 10),
  active: true,
};

function WorkersPage() {
  const { t, formatMoney } = useI18n();
  const items = useCollection("workers");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [form, setForm] = useState(empty);

  const start = (w?: Worker) => {
    if (w) { setEditing(w); setForm({ name: w.name, role: w.role, phone: w.phone ?? "", dailyWage: w.dailyWage, hireDate: w.hireDate, active: w.active }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) return false;
    if (editing) repo.update("workers", editing.id, form);
    else repo.add("workers", form);
    toast.success(t("save"));
    return true;
  };

  return (
    <div>
      <PageHeader title={t("workers")} subtitle={t("construction")} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <F label={t("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("role")}><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></F>
          <F label={t("phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("dailyWage")}><Input type="number" value={form.dailyWage} onChange={(e) => setForm({ ...form, dailyWage: +e.target.value })} /></F>
          <F label={t("hireDate")}><Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></F>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label>{t("status")}</Label>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("dailyWage")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.role}</TableCell>
                    <TableCell className="text-muted-foreground">{w.phone || "—"}</TableCell>
                    <TableCell>{formatMoney(w.dailyWage)}</TableCell>
                    <TableCell>
                      <Badge variant={w.active ? "default" : "secondary"}>{w.active ? t("available") : t("none")}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <EditButton onClick={() => start(w)} />
                      <DeleteButton onConfirm={() => repo.remove("workers", w.id)} />
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
