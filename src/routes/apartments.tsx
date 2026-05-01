import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Apartment } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/apartments")({ component: ApartmentsPage });

const empty = {
  block: "",
  floor: 1,
  apartmentNo: "",
  rooms: 2,
  area: 0,
  price: 0,
  status: "available" as Apartment["status"],
  notes: "",
};

const statusVariant: Record<Apartment["status"], "default" | "secondary" | "outline"> = {
  available: "default",
  reserved: "secondary",
  sold: "outline",
};

function ApartmentsPage() {
  const { t, formatMoney } = useI18n();
  const items = useCollection("apartments");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [form, setForm] = useState(empty);

  const start = (a?: Apartment) => {
    if (a) { setEditing(a); setForm({ block: a.block, floor: a.floor, apartmentNo: a.apartmentNo, rooms: a.rooms, area: a.area, price: a.price, status: a.status, notes: a.notes ?? "" }); }
    else { setEditing(null); setForm(empty); }
    setOpen(true);
  };
  const save = () => {
    if (!form.apartmentNo.trim()) return false;
    if (editing) repo.update("apartments", editing.id, form);
    else repo.add("apartments", form);
    toast.success(t("save"));
    return true;
  };

  return (
    <div>
      <PageHeader title={t("apartments")} subtitle={t("realEstate")} actions={<AddButton onClick={() => start()} />} />
      <FormDialog title={editing ? t("edit") : t("add")} open={open} onOpenChange={setOpen} onSave={save}>
        <div className="grid grid-cols-3 gap-3">
          <F label={t("block")}><Input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} /></F>
          <F label={t("floor")}><Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: +e.target.value })} /></F>
          <F label={t("apartmentNo")}><Input value={form.apartmentNo} onChange={(e) => setForm({ ...form, apartmentNo: e.target.value })} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("rooms")}><Input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: +e.target.value })} /></F>
          <F label={t("area")}><Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: +e.target.value })} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("price")}><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></F>
          <F label={t("status")}>
            <Select value={form.status} onValueChange={(v: Apartment["status"]) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("available")}</SelectItem>
                <SelectItem value="reserved">{t("reserved")}</SelectItem>
                <SelectItem value="sold">{t("sold")}</SelectItem>
              </SelectContent>
            </Select>
          </F>
        </div>
        <F label={t("notes")}><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
      </FormDialog>

      {items.length === 0 ? <EmptyState /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="group transition-all hover:shadow-elegant hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">#{a.apartmentNo}</CardTitle>
                    <p className="text-xs text-muted-foreground">{t("block")} {a.block} · {t("floor")} {a.floor}</p>
                  </div>
                </div>
                <Badge variant={statusVariant[a.status]}>{t(a.status)}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("rooms")}</span>
                  <span className="font-medium">{a.rooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("area")}</span>
                  <span className="font-medium">{a.area} m²</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">{t("price")}</span>
                  <span className="font-bold text-primary">{formatMoney(a.price)}</span>
                </div>
                <div className="flex justify-end gap-1 pt-2">
                  <EditButton onClick={() => start(a)} />
                  <DeleteButton onConfirm={() => repo.remove("apartments", a.id)} />
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
