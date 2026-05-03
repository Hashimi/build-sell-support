import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Sale, type InstallmentEntry } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/sales")({ component: SalesPage });

const empty = {
  clientId: "",
  apartmentId: "",
  salePrice: 0,
  paidAmount: 0,
  date: new Date().toISOString().slice(0, 10),
  installmentsCount: 0,
  notes: "",
};

const INSTALLMENT_OPTIONS = [0, 3, 6, 12, 18, 24, 36, 48, 60];

function buildSchedule(remaining: number, count: number, startDate: string): InstallmentEntry[] {
  if (count <= 0 || remaining <= 0) return [];
  const monthly = Math.round((remaining / count) * 100) / 100;
  const start = new Date(startDate);
  const out: InstallmentEntry[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i + 1);
    const amount = i === count - 1 ? Math.round((remaining - monthly * (count - 1)) * 100) / 100 : monthly;
    out.push({ no: i + 1, dueDate: d.toISOString().slice(0, 10), amount, paid: false });
  }
  return out;
}

function SalesPage() {
  const { t, formatMoney } = useI18n();
  const clients = useCollection("clients");
  const apartments = useCollection("apartments");
  const items = useCollection("sales");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [form, setForm] = useState(empty);
  const [scheduleFor, setScheduleFor] = useState<Sale | null>(null);

  const start = (s?: Sale) => {
    if (s) {
      setEditing(s);
      setForm({
        clientId: s.clientId,
        apartmentId: s.apartmentId,
        salePrice: s.salePrice,
        paidAmount: s.paidAmount,
        date: s.date,
        installmentsCount: s.installmentsCount ?? 0,
        notes: s.notes ?? "",
      });
    } else {
      setEditing(null);
      setForm(empty);
    }
    setOpen(true);
  };

  const save = () => {
    if (!form.clientId || !form.apartmentId) {
      toast.error(t("selectClient"));
      return false;
    }
    const remaining = Math.max(0, form.salePrice - form.paidAmount);
    const installments = buildSchedule(remaining, form.installmentsCount, form.date);
    const payload = { ...form, installments };
    if (editing) {
      // preserve already-paid flags when possible
      if (editing.installments && editing.installmentsCount === form.installmentsCount) {
        payload.installments = installments.map((i, idx) => ({
          ...i,
          paid: editing.installments![idx]?.paid ?? false,
          paidDate: editing.installments![idx]?.paidDate,
        }));
      }
      repo.update("sales", editing.id, payload);
    } else {
      repo.add("sales", payload);
      repo.update("apartments", form.apartmentId, {
        status: form.paidAmount >= form.salePrice ? "sold" : "reserved",
      });
    }
    toast.success(t("save"));
    return true;
  };

  const togglePaid = (sale: Sale, idx: number) => {
    const installments = (sale.installments ?? []).map((i, k) =>
      k === idx ? { ...i, paid: !i.paid, paidDate: !i.paid ? new Date().toISOString().slice(0, 10) : undefined } : i,
    );
    const extraPaid = installments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const baseUpfront = sale.paidAmount - (sale.installments ?? []).filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const newPaid = baseUpfront + extraPaid;
    repo.update("sales", sale.id, { installments, paidAmount: newPaid });
    if (newPaid >= sale.salePrice) {
      repo.update("apartments", sale.apartmentId, { status: "sold" });
    }
    setScheduleFor({ ...sale, installments, paidAmount: newPaid });
  };

  const cName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const aLabel = (id: string) => {
    const a = apartments.find((x) => x.id === id);
    return a ? `${a.block}-${a.apartmentNo}` : "—";
  };

  const remaining = Math.max(0, form.salePrice - form.paidAmount);
  const monthly = form.installmentsCount > 0 ? remaining / form.installmentsCount : 0;
  const paidPct = form.salePrice > 0 ? Math.round((form.paidAmount / form.salePrice) * 100) : 0;

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
          <F label={`${t("paidAmount")} (${paidPct}%)`}><Input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: +e.target.value })} /></F>
        </div>
        <F label={t("installmentsCount")}>
          <Select value={String(form.installmentsCount)} onValueChange={(v) => setForm({ ...form, installmentsCount: +v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INSTALLMENT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n === 0 ? t("noInstallments") : `${n} ${t("installments")}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        {form.installmentsCount > 0 && remaining > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("remaining")}</span><span className="font-medium">{formatMoney(remaining)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("monthlyInstallment")}</span><span className="font-medium">{formatMoney(monthly)}</span></div>
          </div>
        )}
        <F label={t("date")}><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></F>
        <F label={t("notes")}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
      </FormDialog>

      <Dialog open={!!scheduleFor} onOpenChange={(o) => !o && setScheduleFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("installmentSchedule")} — {scheduleFor && cName(scheduleFor.clientId)}</DialogTitle></DialogHeader>
          {scheduleFor && (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("dueDate")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(scheduleFor.installments ?? []).map((inst, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{inst.no}</TableCell>
                      <TableCell>{inst.dueDate}</TableCell>
                      <TableCell>{formatMoney(inst.amount)}</TableCell>
                      <TableCell>{inst.paid ? <Badge>{t("paid")}</Badge> : <Badge variant="secondary">{t("pending")}</Badge>}</TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant={inst.paid ? "outline" : "default"} onClick={() => togglePaid(scheduleFor, idx)}>
                          {inst.paid ? t("pending") : t("markPaid")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                  <TableHead>{t("installments")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const rem = s.salePrice - s.paidAmount;
                  const cnt = s.installmentsCount ?? 0;
                  const paidCnt = (s.installments ?? []).filter((i) => i.paid).length;
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
                      <TableCell>
                        {cnt > 0 ? (
                          <Button size="sm" variant="outline" onClick={() => setScheduleFor(s)}>
                            {paidCnt}/{cnt}
                          </Button>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
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
