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
import { repo, useCollection, type Client } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({ component: ClientsPage });

const empty = { name: "", phone: "", address: "", notes: "" };

function ClientsPage() {
  const { t } = useI18n();
  const items = useCollection("clients");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(empty);

  const start = (c?: Client) => {
    if (c) { setEditing(c); setForm({ name: c.name, phone: c.phone, address: c.address ?? "", notes: c.notes ?? "" }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) return false;
    if (editing) repo.update("clients", editing.id, form);
    else repo.add("clients", form);
    toast.success(t("save"));
    return true;
  };

  return (
    <div>
      <PageHeader title={t("clients")} subtitle={t("realEstate")} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <F label={t("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></F>
        <F label={t("phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
        <F label={t("address")}><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></F>
        <F label={t("notes")}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("address")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-sm">{c.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{c.address || "—"}</TableCell>
                    <TableCell className="text-end">
                      <EditButton onClick={() => start(c)} />
                      <DeleteButton onConfirm={() => repo.remove("clients", c.id)} />
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
