import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Material } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/materials")({ component: MaterialsPage });

const empty = {
  name: "",
  unit: "",
  quantity: 0,
  pricePerUnit: 0,
  supplier: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

function MaterialsPage() {
  const { t, formatMoney } = useI18n();
  const items = useCollection("materials");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const start = (m?: Material) => {
    if (m) {
      setEditing(m);
      setForm({
        name: m.name,
        unit: m.unit,
        quantity: m.quantity,
        pricePerUnit: m.pricePerUnit,
        supplier: m.supplier ?? "",
        purchaseDate: m.purchaseDate,
        notes: m.notes ?? "",
      });
    } else {
      setEditing(null);
      setForm(empty);
    }
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error(t("name")); return false; }
    if (editing) repo.update("materials", editing.id, form);
    else repo.add("materials", form);
    toast.success(t("save"));
    return true;
  };

  return (
    <div>
      <PageHeader
        title={t("materials")}
        subtitle={t("construction")}
        actions={<AddButton onClick={() => start()} />}
      />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <Field label={t("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("unit")}><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, bag, m³" /></Field>
          <Field label={t("quantity")}><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("price")}><Input type="number" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: +e.target.value })} /></Field>
          <Field label={t("purchaseDate")}><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
        </div>
        <Field label={t("supplier")}><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
        <Field label={t("notes")}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("quantity")}</TableHead>
                  <TableHead>{t("price")}</TableHead>
                  <TableHead>{t("total")}</TableHead>
                  <TableHead>{t("supplier")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.quantity} {m.unit}</TableCell>
                    <TableCell>{formatMoney(m.pricePerUnit)}</TableCell>
                    <TableCell className="font-semibold">{formatMoney(m.quantity * m.pricePerUnit)}</TableCell>
                    <TableCell className="text-muted-foreground">{m.supplier || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.purchaseDate}</TableCell>
                    <TableCell className="text-end">
                      <EditButton onClick={() => start(m)} />
                      <DeleteButton onConfirm={() => repo.remove("materials", m.id)} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
