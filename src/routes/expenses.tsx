import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Expense } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

const empty = {
  category: "",
  description: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash" as "cash" | "bank",
  project: "",
};

function ExpensesPage() {
  const { t, formatMoney } = useI18n();
  const items = useCollection("expenses");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(empty);

  const start = (x?: Expense) => {
    if (x) { setEditing(x); setForm({ category: x.category, description: x.description, amount: x.amount, date: x.date, paymentMethod: x.paymentMethod, project: x.project ?? "" }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.category.trim() || !form.amount) return false;
    if (editing) repo.update("expenses", editing.id, form);
    else repo.add("expenses", form);
    toast.success(t("save"));
    return true;
  };

  const total = items.reduce((s, x) => s + x.amount, 0);

  return (
    <div>
      <PageHeader title={t("expenses")} subtitle={`${t("total")}: ${formatMoney(total)}`} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <F label={t("category")}><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></F>
        <F label={t("description")}><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("amount")}><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></F>
          <F label={t("date")}><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("paymentMethod")}>
            <Select value={form.paymentMethod} onValueChange={(v: "cash" | "bank") => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("cash")}</SelectItem>
                <SelectItem value="bank">{t("bank")}</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label={t("project")}><Input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} /></F>
        </div>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("paymentMethod")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="text-muted-foreground">{x.date}</TableCell>
                    <TableCell className="font-medium">{x.category}</TableCell>
                    <TableCell className="max-w-xs truncate">{x.description}</TableCell>
                    <TableCell className="font-semibold">{formatMoney(x.amount)}</TableCell>
                    <TableCell>{t(x.paymentMethod)}</TableCell>
                    <TableCell className="text-end">
                      <EditButton onClick={() => start(x)} />
                      <DeleteButton onConfirm={() => repo.remove("expenses", x.id)} />
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
