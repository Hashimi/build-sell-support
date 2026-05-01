import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Sale } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/sales")({ component: SalesPage });

const empty = {
  clientId: "",
  apartmentId: "",
  salePrice: 0,
  paidAmount: 0,
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

function SalesPage() {
  const { t, formatMoney } = useI18n();
  const clients = useCollection("clients");
  const apartments = useCollection("apartments");
  const items = useCollection("sales");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState(empty);

  const start = (s?: Sale) => {
    if (s) { setEditing(s); setForm({ clientId: s.clientId, apartmentId: s.apartmentId, salePrice: s.salePrice, paidAmount: s.paidAmount, date: s.date, notes: s.notes ?? "" }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.clientId || !form.apartmentId) { toast.error(t("selectClient")); return false; }
    if (editing) {
      repo.update("sales", editing.id, form);
    } else {
      repo.add("sales", form);
      // mark apartment as sold if fully paid, otherwise reserved
      repo.update("apartments", form.apartmentId, { status: form.paidAmount >= form.salePrice ? "sold" : "reserved" });
    }
    toast.success(t("save"));
    return true;
  };

  const cName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const aLabel = (id: string) => {
    const a = apartments.find((x) => x.id === id);
    return a ? `${a.block}-${a.apartmentNo}` : "—";
  };

  return (
    <div>
      <PageHeader title={t("sales")} subtitle={t("realEstate")} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <F label={t("selectClient")}>
          <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
            <SelectTrigger><SelectValue placeholder={t("selectClient")} /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label={t("selectApartment")}>
          <Select value={form.apartmentId} onValueChange={(v) => {
            const a = apartments.find((x) => x.id === v);
            setForm({ ...form, apartmentId: v, salePrice: form.salePrice || (a?.price ?? 0) });
          }}>
            <SelectTrigger><SelectValue placeholder={t("selectApartment")} /></SelectTrigger>
            <SelectContent>
              {apartments
                .filter((a) => editing?.apartmentId === a.id || a.status === "available")
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.block} · {t("floor")} {a.floor} · #{a.apartmentNo} ({t(a.status)})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("salePrice")}><Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: +e.target.value })} /></F>
          <F label={t("paidAmount")}><Input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: +e.target.value })} /></F>
        </div>
        <F label={t("date")}><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></F>
        <F label={t("notes")}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead>{t("apartment")}</TableHead>
                  <TableHead>{t("salePrice")}</TableHead>
                  <TableHead>{t("paidAmount")}</TableHead>
                  <TableHead>{t("remaining")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const rem = s.salePrice - s.paidAmount;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground">{s.date}</TableCell>
                      <TableCell className="font-medium">{cName(s.clientId)}</TableCell>
                      <TableCell>{aLabel(s.apartmentId)}</TableCell>
                      <TableCell>{formatMoney(s.salePrice)}</TableCell>
                      <TableCell className="text-success">{formatMoney(s.paidAmount)}</TableCell>
                      <TableCell>
                        {rem > 0 ? <Badge variant="secondary">{formatMoney(rem)}</Badge> : <Badge>{t("paid")}</Badge>}
                      </TableCell>
                      <TableCell className="text-end">
                        <EditButton onClick={() => start(s)} />
                        <DeleteButton onConfirm={() => repo.remove("sales", s.id)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
