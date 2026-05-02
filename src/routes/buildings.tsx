import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AddButton, DeleteButton, FormDialog } from "@/components/CrudHelpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Layers, Home as HomeIcon, Store, Car } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  repo,
  useCollection,
  type FloorPurpose,
} from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/buildings")({ component: BuildingsPage });

const PURPOSES: FloorPurpose[] = [
  "residential",
  "parking",
  "commercial",
  "storage",
  "amenity",
  "mixed",
];

interface FlatTypeDraft {
  name: string;
  count: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  area: number;
  price: number;
}

interface FloorDraft {
  floorNumber: number;
  label: string;
  purpose: FloorPurpose;
  types: FlatTypeDraft[];
  // Parking
  parkingSlots: number;
  // Commercial
  shopsCount: number;
  shopArea: number;
  shopMonthlyRent: number;
  shopSalePrice: number;
}

function defaultType(name = "3-Bedroom"): FlatTypeDraft {
  return {
    name,
    count: 2,
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    area: 110,
    price: 70000,
  };
}

function defaultFloor(num: number, purpose: FloorPurpose, label?: string): FloorDraft {
  return {
    floorNumber: num,
    label: label ?? String(num),
    purpose,
    types:
      purpose === "residential"
        ? [defaultType("3-Bedroom"), { ...defaultType("2-Bedroom"), bedrooms: 2, area: 85, price: 55000, count: 2 }]
        : [],
    parkingSlots: purpose === "parking" ? 20 : 0,
    shopsCount: purpose === "commercial" ? 6 : 0,
    shopArea: 30,
    shopMonthlyRent: 500,
    shopSalePrice: 30000,
  };
}

function defaultFloors(basements: number, above: number): FloorDraft[] {
  const arr: FloorDraft[] = [];
  for (let i = basements; i >= 1; i--) {
    arr.push(defaultFloor(-i, "parking", `B${i}`));
  }
  for (let i = 0; i < above; i++) {
    arr.push(defaultFloor(i, i === 0 ? "commercial" : "residential", i === 0 ? "GF" : String(i)));
  }
  return arr;
}

function BuildingsPage() {
  const { t, formatMoney } = useI18n();
  const buildings = useCollection("buildings");
  const floors = useCollection("floors");
  const apartments = useCollection("apartments");
  const shops = useCollection("shops");
  const parkingSlots = useCollection("parkingSlots");

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [basementCount, setBasementCount] = useState(2);
  const [aboveCount, setAboveCount] = useState(5);
  const [draft, setDraft] = useState<FloorDraft[]>(defaultFloors(2, 5));

  const reset = () => {
    setStep(1);
    setName("");
    setAddress("");
    setNotes("");
    setBasementCount(2);
    setAboveCount(5);
    setDraft(defaultFloors(2, 5));
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };

  const next = () => {
    if (!name.trim()) {
      toast.error(t("buildingName"));
      return;
    }
    setDraft(defaultFloors(basementCount, aboveCount));
    setStep(2);
  };

  const updateFloor = (idx: number, patch: Partial<FloorDraft>) => {
    setDraft((d) => d.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const updateType = (fIdx: number, tIdx: number, patch: Partial<FlatTypeDraft>) => {
    setDraft((d) =>
      d.map((f, i) =>
        i === fIdx
          ? { ...f, types: f.types.map((t, j) => (j === tIdx ? { ...t, ...patch } : t)) }
          : f,
      ),
    );
  };

  const addType = (fIdx: number) => {
    setDraft((d) =>
      d.map((f, i) => (i === fIdx ? { ...f, types: [...f.types, defaultType("New Type")] } : f)),
    );
  };

  const removeType = (fIdx: number, tIdx: number) => {
    setDraft((d) =>
      d.map((f, i) =>
        i === fIdx ? { ...f, types: f.types.filter((_, j) => j !== tIdx) } : f,
      ),
    );
  };

  const applyToAll = (fIdx: number) => {
    setDraft((d) => {
      const src = d[fIdx];
      const clonedTypes = src.types.map((t) => ({ ...t }));
      return d.map((f, i) =>
        i === fIdx
          ? f
          : {
              ...f,
              purpose: src.purpose,
              types: clonedTypes.map((t) => ({ ...t })),
              parkingSlots: src.parkingSlots,
              shopsCount: src.shopsCount,
              shopArea: src.shopArea,
              shopMonthlyRent: src.shopMonthlyRent,
              shopSalePrice: src.shopSalePrice,
            },
      );
    });
    toast.success(t("appliedToAll"));
  };

  const create = () => {
    const totalFloors = draft.length;
    const building = repo.add("buildings", {
      name,
      address,
      notes,
      floorsCount: totalFloors,
    });
    draft.forEach((f) => {
      const fl = repo.add("floors", {
        buildingId: building.id,
        floorNumber: f.floorNumber,
        label: f.label,
        purpose: f.purpose,
      });
      if (f.purpose === "residential" || f.purpose === "mixed") {
        let seq = 1;
        f.types.forEach((tp) => {
          for (let i = 0; i < tp.count; i++) {
            repo.add("apartments", {
              buildingId: building.id,
              floorId: fl.id,
              block: name,
              floor: f.floorNumber,
              apartmentNo: `${f.label}-${String(seq).padStart(2, "0")}`,
              rooms: tp.bedrooms,
              bathrooms: tp.bathrooms,
              kitchens: tp.kitchens,
              livingRooms: tp.livingRooms,
              area: tp.area,
              price: tp.price,
              status: "available",
              purpose: f.purpose,
              notes: tp.name,
            });
            seq++;
          }
        });
      } else if (f.purpose === "commercial") {
        for (let i = 1; i <= f.shopsCount; i++) {
          repo.add("shops", {
            buildingId: building.id,
            floorId: fl.id,
            shopNo: `${f.label}-S${String(i).padStart(2, "0")}`,
            area: f.shopArea,
            monthlyRent: f.shopMonthlyRent,
            salePrice: f.shopSalePrice,
            status: "available",
          });
        }
      } else if (f.purpose === "parking") {
        for (let i = 1; i <= f.parkingSlots; i++) {
          repo.add("parkingSlots", {
            buildingId: building.id,
            floorId: fl.id,
            slotNo: `${f.label}-P${String(i).padStart(3, "0")}`,
            status: "available",
          });
        }
      }
    });
    toast.success(t("save"));
    setOpen(false);
  };

  const removeBuilding = (id: string) => {
    floors.filter((f) => f.buildingId === id).forEach((f) => repo.remove("floors", f.id));
    apartments.filter((a) => a.buildingId === id).forEach((a) => repo.remove("apartments", a.id));
    shops.filter((s) => s.buildingId === id).forEach((s) => repo.remove("shops", s.id));
    parkingSlots.filter((p) => p.buildingId === id).forEach((p) => repo.remove("parkingSlots", p.id));
    repo.remove("buildings", id);
  };

  return (
    <div>
      <PageHeader
        title={t("buildings")}
        subtitle={t("realEstate")}
        actions={<AddButton onClick={openNew} />}
      />

      <FormDialog
        title={step === 1 ? t("addBuilding") : t("floorConfiguration")}
        open={open}
        onOpenChange={setOpen}
        onSave={() => {
          if (step === 1) {
            next();
            return false;
          }
          create();
          return true;
        }}
      >
        {step === 1 ? (
          <div className="grid gap-3">
            <F label={t("buildingName")}>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </F>
            <F label={t("address")}>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </F>
            <div className="grid grid-cols-2 gap-2">
              <F label={`${t("parking")} (${t("floorsCount")})`}>
                <Input
                  type="number"
                  min={0}
                  value={basementCount}
                  onChange={(e) => setBasementCount(Math.max(0, +e.target.value))}
                />
              </F>
              <F label={`${t("floor")} ↑ (${t("floorsCount")})`}>
                <Input
                  type="number"
                  min={1}
                  value={aboveCount}
                  onChange={(e) => setAboveCount(Math.max(1, +e.target.value))}
                />
              </F>
            </div>
            <p className="text-xs text-muted-foreground">
              {basementCount} basement(s) + {aboveCount} above-ground = {basementCount + aboveCount} {t("floor")}
            </p>
            <F label={t("notes")}>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </F>
          </div>
        ) : (
          <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {draft.map((f, idx) => (
              <Card key={idx} className="border-primary/20">
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    {t("floor")} <Badge variant="outline">{f.label}</Badge>
                  </CardTitle>
                  {draft.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => applyToAll(idx)}
                    >
                      ⇊ {t("applyToAll")}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="grid gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <F label={t("floorLabel")}>
                      <Input
                        value={f.label}
                        onChange={(e) => updateFloor(idx, { label: e.target.value })}
                        placeholder={t("floorLabelHint")}
                      />
                    </F>
                    <F label={t("floorPurpose")}>
                      <Select
                        value={f.purpose}
                        onValueChange={(v: FloorPurpose) => updateFloor(idx, { purpose: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PURPOSES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {t(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </F>
                    <div className="flex items-end justify-end">
                      <span className="text-xs text-muted-foreground">
                        {f.purpose === "parking"
                          ? `${f.parkingSlots} ${t("parkingSlots")}`
                          : f.purpose === "commercial"
                          ? `${f.shopsCount} ${t("shops")}`
                          : `${f.types.reduce((s, x) => s + x.count, 0)} ${t("flats")}`}
                      </span>
                    </div>
                  </div>

                  {f.purpose === "parking" && (
                    <div className="rounded-md border bg-muted/30 p-2 flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      <F label={t("parkingSlots")}>
                        <Input
                          type="number"
                          min={0}
                          value={f.parkingSlots}
                          onChange={(e) => updateFloor(idx, { parkingSlots: +e.target.value })}
                        />
                      </F>
                    </div>
                  )}

                  {f.purpose === "commercial" && (
                    <div className="rounded-md border bg-muted/30 p-2 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Store className="h-4 w-4 text-primary" /> {t("shops")}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label={t("shopsCount")}>
                          <Input
                            type="number"
                            min={0}
                            value={f.shopsCount}
                            onChange={(e) => updateFloor(idx, { shopsCount: +e.target.value })}
                          />
                        </F>
                        <F label={t("shopArea")}>
                          <Input
                            type="number"
                            min={0}
                            value={f.shopArea}
                            onChange={(e) => updateFloor(idx, { shopArea: +e.target.value })}
                          />
                        </F>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <F label={t("defaultMonthlyRent")}>
                          <Input
                            type="number"
                            min={0}
                            value={f.shopMonthlyRent}
                            onChange={(e) => updateFloor(idx, { shopMonthlyRent: +e.target.value })}
                          />
                        </F>
                        <F label={t("defaultSalePrice")}>
                          <Input
                            type="number"
                            min={0}
                            value={f.shopSalePrice}
                            onChange={(e) => updateFloor(idx, { shopSalePrice: +e.target.value })}
                          />
                        </F>
                      </div>
                    </div>
                  )}

                  {(f.purpose === "residential" || f.purpose === "mixed") && (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{t("flatTypes")}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => addType(idx)}>
                          + {t("addFlatType")}
                        </Button>
                      </div>
                      {f.types.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          {t("noFlatTypes")}
                        </p>
                      ) : (
                        f.types.map((tp, tIdx) => (
                          <div key={tIdx} className="rounded-md border bg-background p-2 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <F label={t("typeName")}>
                                <Input
                                  value={tp.name}
                                  onChange={(e) => updateType(idx, tIdx, { name: e.target.value })}
                                />
                              </F>
                              <F label={t("count")}>
                                <Input
                                  type="number"
                                  min={0}
                                  value={tp.count}
                                  onChange={(e) => updateType(idx, tIdx, { count: +e.target.value })}
                                />
                              </F>
                              <div className="flex items-end justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => removeType(idx, tIdx)}
                                >
                                  {t("remove")}
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <F label={t("bedrooms")}>
                                <Input
                                  type="number"
                                  value={tp.bedrooms}
                                  onChange={(e) => updateType(idx, tIdx, { bedrooms: +e.target.value })}
                                />
                              </F>
                              <F label={t("bathrooms")}>
                                <Input
                                  type="number"
                                  value={tp.bathrooms}
                                  onChange={(e) => updateType(idx, tIdx, { bathrooms: +e.target.value })}
                                />
                              </F>
                              <F label={t("kitchens")}>
                                <Input
                                  type="number"
                                  value={tp.kitchens}
                                  onChange={(e) => updateType(idx, tIdx, { kitchens: +e.target.value })}
                                />
                              </F>
                              <F label={t("livingRooms")}>
                                <Input
                                  type="number"
                                  value={tp.livingRooms}
                                  onChange={(e) => updateType(idx, tIdx, { livingRooms: +e.target.value })}
                                />
                              </F>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <F label={t("area")}>
                                <Input
                                  type="number"
                                  value={tp.area}
                                  onChange={(e) => updateType(idx, tIdx, { area: +e.target.value })}
                                />
                              </F>
                              <F label={t("price")}>
                                <Input
                                  type="number"
                                  value={tp.price}
                                  onChange={(e) => updateType(idx, tIdx, { price: +e.target.value })}
                                />
                              </F>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={() => setStep(1)}>
              ← {t("cancel")}
            </Button>
          </div>
        )}
      </FormDialog>

      {buildings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => {
            const flats = apartments.filter((a) => a.buildingId === b.id);
            const bShops = shops.filter((s) => s.buildingId === b.id);
            const bPark = parkingSlots.filter((p) => p.buildingId === b.id);
            const available = flats.filter((a) => a.status === "available").length;
            const totalValue = flats.reduce((s, a) => s + a.price, 0);
            return (
              <Card key={b.id} className="group transition-all hover:shadow-elegant hover:-translate-y-0.5">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{b.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{b.address || "—"}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {b.floorsCount} {t("floor")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("totalFlats")}</span>
                    <span className="font-medium">{flats.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("shops")}</span>
                    <span className="font-medium">{bShops.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("parkingSlots")}</span>
                    <span className="font-medium">{bPark.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("available_units")}</span>
                    <span className="font-medium text-success">{available}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm">
                    <span className="text-muted-foreground">{t("total")}</span>
                    <span className="font-bold text-primary">{formatMoney(totalValue)}</span>
                  </div>
                  <div className="flex justify-end gap-1 pt-2">
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link to="/apartments" search={{ buildingId: b.id } as never}>
                        <HomeIcon className="h-4 w-4" />
                        {t("viewFlats")}
                      </Link>
                    </Button>
                    <DeleteButton onConfirm={() => removeBuilding(b.id)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
