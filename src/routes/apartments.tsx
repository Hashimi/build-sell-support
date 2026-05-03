import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DeleteButton, EditButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Bed, Bath, ChefHat, Sofa } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Apartment } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/apartments")({
  component: ApartmentsPage,
  validateSearch: (s: Record<string, unknown>) => ({
    buildingId: typeof s.buildingId === "string" ? s.buildingId : undefined,
  }),
});

const empty = {
  block: "",
  floor: 1,
  apartmentNo: "",
  rooms: 2,
  bathrooms: 1,
  kitchens: 1,
  livingRooms: 1,
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
  const { buildingId: initialBuildingId } = Route.useSearch();
  const buildings = useCollection("buildings");
  const items = useCollection("apartments");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [form, setForm] = useState(empty);

  const startEdit = (a: Apartment) => {
    setEditing(a);
    setForm({
      block: a.block,
      floor: a.floor,
      apartmentNo: a.apartmentNo,
      rooms: a.rooms,
      bathrooms: a.bathrooms ?? 1,
      kitchens: a.kitchens ?? 1,
      livingRooms: a.livingRooms ?? 1,
      area: a.area,
      price: a.price,
      status: a.status,
      notes: a.notes ?? "",
    });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return false;
    repo.update("apartments", editing.id, form);
    toast.success(t("save"));
    return true;
  };

  const buildingName = (id?: string) =>
    buildings.find((b) => b.id === id)?.name ?? "—";

  const buildingsWithFlats = useMemo(
    () => buildings.filter((b) => items.some((a) => a.buildingId === b.id)),
    [buildings, items],
  );
  const orphan = useMemo(
    () => items.filter((a) => !a.buildingId || !buildings.find((b) => b.id === a.buildingId)),
    [items, buildings],
  );

  const tabBuildings = buildingsWithFlats;
  const defaultTab =
    initialBuildingId && tabBuildings.find((b) => b.id === initialBuildingId)
      ? initialBuildingId
      : tabBuildings[0]?.id ?? (orphan.length ? "_none" : "");

  const renderFloors = (list: Apartment[]) => {
    const fmap = new Map<number, Apartment[]>();
    list.forEach((a) => {
      if (!fmap.has(a.floor)) fmap.set(a.floor, []);
      fmap.get(a.floor)!.push(a);
    });
    return (
      <div className="space-y-6">
        {Array.from(fmap.entries())
          .sort(([a], [b]) => b - a)
          .map(([floorNum, flats]) => (
            <div key={floorNum}>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                {t("floor")} {floorNum}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {flats.map((a) => (
                  <Card key={a.id} className="group transition-all hover:shadow-elegant">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <CardTitle className="text-sm">#{a.apartmentNo}</CardTitle>
                      <Badge variant={statusVariant[a.status]}>{t(a.status)}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Bed className="h-3 w-3" />{a.rooms}</span>
                        <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" />{a.bathrooms ?? 0}</span>
                        <span className="inline-flex items-center gap-1"><ChefHat className="h-3 w-3" />{a.kitchens ?? 0}</span>
                        <span className="inline-flex items-center gap-1"><Sofa className="h-3 w-3" />{a.livingRooms ?? 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t("area")}</span>
                        <span>{a.area} m²</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 text-sm">
                        <span className="text-muted-foreground">{t("price")}</span>
                        <span className="font-bold text-primary">{formatMoney(a.price)}</span>
                      </div>
                      <div className="flex justify-end gap-1">
                        <EditButton onClick={() => startEdit(a)} />
                        <DeleteButton onConfirm={() => repo.remove("apartments", a.id)} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title={t("apartments")} subtitle={t("realEstate")} />

      <FormDialog title={t("edit")} open={open} onOpenChange={setOpen} onSave={save}>
        <div className="grid grid-cols-3 gap-3">
          <F label={t("block")}>
            <Input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} />
          </F>
          <F label={t("floor")}>
            <Input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: +e.target.value })}
            />
          </F>
          <F label={t("apartmentNo")}>
            <Input
              value={form.apartmentNo}
              onChange={(e) => setForm({ ...form, apartmentNo: e.target.value })}
            />
          </F>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <F label={t("bedrooms")}>
            <Input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: +e.target.value })} />
          </F>
          <F label={t("bathrooms")}>
            <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: +e.target.value })} />
          </F>
          <F label={t("kitchens")}>
            <Input type="number" value={form.kitchens} onChange={(e) => setForm({ ...form, kitchens: +e.target.value })} />
          </F>
          <F label={t("livingRooms")}>
            <Input type="number" value={form.livingRooms} onChange={(e) => setForm({ ...form, livingRooms: +e.target.value })} />
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label={t("area")}>
            <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: +e.target.value })} />
          </F>
          <F label={t("price")}>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
          </F>
        </div>
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
        <F label={t("notes")}>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </F>
      </FormDialog>

      {items.length === 0 || (tabBuildings.length === 0 && orphan.length === 0) ? (
        <EmptyState />
      ) : (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1">
            {tabBuildings.map((b) => {
              const count = items.filter((a) => a.buildingId === b.id).length;
              return (
                <TabsTrigger key={b.id} value={b.id} className="gap-2">
                  <Building2 className="h-4 w-4" />
                  {b.name}
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
            {orphan.length > 0 && (
              <TabsTrigger value="_none" className="gap-2">
                —
                <Badge variant="secondary" className="ml-1">{orphan.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {tabBuildings.map((b) => (
            <TabsContent key={b.id} value={b.id}>
              {renderFloors(items.filter((a) => a.buildingId === b.id))}
            </TabsContent>
          ))}
          {orphan.length > 0 && (
            <TabsContent value="_none">{renderFloors(orphan)}</TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
