import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { FormDialog } from "@/components/CrudHelpers";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store, DollarSign, TrendingUp, Percent, UserPlus, Receipt } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { repo, useCollection, type Shop, type ShopPayment } from "@/lib/storage";
import { PaymentReceiptDialog, type ReceiptData } from "@/components/PaymentReceipt";
import { toast } from "sonner";

export const Route = createFileRoute("/commercial")({ component: CommercialPage });

function CommercialPage() {
  const { t, formatMoney } = useI18n();
  const buildings = useCollection("buildings");
  const floors = useCollection("floors");
  const shops = useCollection("shops");
  const payments = useCollection("shopPayments");
  const clients = useCollection("clients");

  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [assignShop, setAssignShop] = useState<Shop | null>(null);
  const [payShop, setPayShop] = useState<Shop | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [aClient, setAClient] = useState("");
  const [aStatus, setAStatus] = useState<"rented" | "sold">("rented");
  const [aRent, setARent] = useState(0);
  const [aStart, setAStart] = useState(new Date().toISOString().slice(0, 10));

  const [pAmount, setPAmount] = useState(0);
  const [pType, setPType] = useState<ShopPayment["type"]>("rent");
  const [pPeriod, setPPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [pDate, setPDate] = useState(new Date().toISOString().slice(0, 10));
  const [pNotes, setPNotes] = useState("");

  const filteredShops = useMemo(
    () => (buildingFilter === "all" ? shops : shops.filter((s) => s.buildingId === buildingFilter)),
    [shops, buildingFilter],
  );

  const stats = useMemo(() => {
    const ids = new Set(filteredShops.map((s) => s.id));
    const relPayments = payments.filter((p) => ids.has(p.shopId));
    const rentRev = relPayments.filter((p) => p.type === "rent").reduce((s, p) => s + p.amount, 0);
    const saleRev = relPayments.filter((p) => p.type === "sale").reduce((s, p) => s + p.amount, 0);
    const total = relPayments.reduce((s, p) => s + p.amount, 0);
    const occupied = filteredShops.filter((s) => s.status !== "available").length;
    const occupancy = filteredShops.length ? Math.round((occupied / filteredShops.length) * 100) : 0;
    return { rentRev, saleRev, total, occupancy, occupied };
  }, [filteredShops, payments]);

  const openAssign = (s: Shop) => {
    setAssignShop(s);
    setAClient(s.clientId ?? "");
    setAStatus(s.status === "sold" ? "sold" : "rented");
    setARent(s.monthlyRent);
    setAStart(s.startDate ?? new Date().toISOString().slice(0, 10));
  };

  const saveAssign = () => {
    if (!assignShop) return true;
    if (!aClient) {
      toast.error(t("selectClient"));
      return false;
    }
    repo.update("shops", assignShop.id, {
      clientId: aClient,
      status: aStatus,
      monthlyRent: aRent,
      startDate: aStart,
    });
    toast.success(t("save"));
    return true;
  };

  const markAvailable = (s: Shop) => {
    repo.update("shops", s.id, { clientId: undefined, status: "available", startDate: undefined });
  };

  const openPay = (s: Shop) => {
    setPayShop(s);
    setPAmount(s.status === "rented" ? s.monthlyRent : s.salePrice);
    setPType(s.status === "sold" ? "sale" : "rent");
    setPPeriod(new Date().toISOString().slice(0, 7));
    setPDate(new Date().toISOString().slice(0, 10));
    setPNotes("");
  };

  const savePay = () => {
    if (!payShop) return true;
    if (pAmount <= 0) {
      toast.error(t("amount"));
      return false;
    }
    repo.add("shopPayments", {
      shopId: payShop.id,
      clientId: payShop.clientId,
      amount: pAmount,
      date: pDate,
      type: pType,
      period: pType === "rent" ? pPeriod : undefined,
      notes: pNotes,
    });
    const c = clients.find((x) => x.id === payShop.clientId);
    const typeLabel = pType === "rent" ? t("rentPayment") : pType === "sale" ? t("salePayment") : pType === "deposit" ? t("deposit") : t("other");
    setReceipt({
      receiptNo: payShop.id.slice(-6).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase(),
      date: pDate,
      clientName: c?.name ?? "—",
      clientPhone: c?.phone,
      title: `${typeLabel} — ${t("shop")} ${payShop.shopNo}`,
      amount: pAmount,
      lines: [
        { label: t("building"), value: buildingName(payShop.buildingId) },
        { label: t("shopNo"), value: payShop.shopNo },
        ...(pType === "rent" && pPeriod ? [{ label: t("period"), value: pPeriod }] : []),
      ],
      notes: pNotes,
    });
    toast.success(t("save"));
    return true;
  };

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const floorLabel = (id: string) => {
    const fl = floors.find((f) => f.id === id);
    return fl?.label ?? String(fl?.floorNumber ?? "");
  };
  const buildingName = (id: string) => buildings.find((b) => b.id === id)?.name ?? "—";

  const statusBadge = (s: Shop["status"]) => {
    const map = {
      available: { v: "secondary" as const, l: t("available") },
      rented: { v: "default" as const, l: t("rented") },
      sold: { v: "destructive" as const, l: t("sold") },
    };
    const x = map[s];
    return <Badge variant={x.v}>{x.l}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title={t("commercial_dashboard")}
        subtitle={t("commercial")}
        actions={
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("buildings")}</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-4">
        <StatCard icon={Store} label={t("shops")} value={String(filteredShops.length)} />
        <StatCard icon={Percent} label={t("occupancy")} value={`${stats.occupancy}%`} sub={`${stats.occupied}/${filteredShops.length}`} />
        <StatCard icon={DollarSign} label={t("rentRevenue")} value={formatMoney(stats.rentRev)} />
        <StatCard icon={TrendingUp} label={t("totalRevenue")} value={formatMoney(stats.total)} accent />
      </div>

      {filteredShops.length === 0 ? (
        <EmptyState />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" /> {t("shops")}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("shopNo")}</TableHead>
                  <TableHead>{t("building")}</TableHead>
                  <TableHead>{t("floor")}</TableHead>
                  <TableHead>{t("area")}</TableHead>
                  <TableHead>{t("monthlyRent")}</TableHead>
                  <TableHead>{t("salePrice")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead>{t("totalRevenue")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShops.map((s) => {
                  const shopRev = payments
                    .filter((p) => p.shopId === s.id)
                    .reduce((sum, p) => sum + p.amount, 0);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.shopNo}</TableCell>
                      <TableCell>{buildingName(s.buildingId)}</TableCell>
                      <TableCell>{floorLabel(s.floorId)}</TableCell>
                      <TableCell>{s.area} m²</TableCell>
                      <TableCell>{formatMoney(s.monthlyRent)}</TableCell>
                      <TableCell>{formatMoney(s.salePrice)}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell>{clientName(s.clientId)}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatMoney(shopRev)}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openAssign(s)}>
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={s.status === "available"}
                            onClick={() => openPay(s)}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                          {s.status !== "available" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => markAvailable(s)}
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> {t("payments")}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("shop")}</TableHead>
                  <TableHead>{t("client")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("period")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  <TableHead className="text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments
                  .filter((p) =>
                    buildingFilter === "all"
                      ? true
                      : shops.find((s) => s.id === p.shopId)?.buildingId === buildingFilter,
                  )
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((p) => {
                    const sh = shops.find((s) => s.id === p.shopId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.date}</TableCell>
                        <TableCell>{sh?.shopNo ?? "—"}</TableCell>
                        <TableCell>{clientName(p.clientId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t((p.type === "rent" ? "rentPayment" : p.type === "sale" ? "salePayment" : p.type) as never)}</Badge>
                        </TableCell>
                        <TableCell>{p.period ?? "—"}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(p.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{p.notes ?? ""}</TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const c = clients.find((x) => x.id === p.clientId);
                              const typeLabel = p.type === "rent" ? t("rentPayment") : p.type === "sale" ? t("salePayment") : p.type === "deposit" ? t("deposit") : t("other");
                              setReceipt({
                                receiptNo: p.id.slice(-6).toUpperCase(),
                                date: p.date,
                                clientName: c?.name ?? "—",
                                clientPhone: c?.phone,
                                title: `${typeLabel} — ${t("shop")} ${sh?.shopNo ?? ""}`,
                                amount: p.amount,
                                lines: [
                                  ...(sh ? [{ label: t("building"), value: buildingName(sh.buildingId) }] : []),
                                  ...(sh ? [{ label: t("shopNo"), value: sh.shopNo }] : []),
                                  ...(p.period ? [{ label: t("period"), value: p.period }] : []),
                                ],
                                notes: p.notes,
                              });
                            }}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign client */}
      <FormDialog
        title={`${t("assignClient")} — ${assignShop?.shopNo ?? ""}`}
        open={!!assignShop}
        onOpenChange={(o) => !o && setAssignShop(null)}
        onSave={saveAssign}
      >
        <div className="grid gap-3">
          <F label={t("client")}>
            <Select value={aClient} onValueChange={setAClient}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label={t("status")}>
            <Select value={aStatus} onValueChange={(v: "rented" | "sold") => setAStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rented">{t("rented")}</SelectItem>
                <SelectItem value="sold">{t("sold")}</SelectItem>
              </SelectContent>
            </Select>
          </F>
          {aStatus === "rented" && (
            <F label={t("monthlyRent")}>
              <Input type="number" value={aRent} onChange={(e) => setARent(+e.target.value)} />
            </F>
          )}
          <F label={t("startDate")}>
            <Input type="date" value={aStart} onChange={(e) => setAStart(e.target.value)} />
          </F>
        </div>
      </FormDialog>

      {/* Record payment */}
      <FormDialog
        title={`${t("recordPayment")} — ${payShop?.shopNo ?? ""}`}
        open={!!payShop}
        onOpenChange={(o) => !o && setPayShop(null)}
        onSave={savePay}
      >
        <div className="grid gap-3">
          <F label={t("type")}>
            <Select value={pType} onValueChange={(v: ShopPayment["type"]) => setPType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">{t("rentPayment")}</SelectItem>
                <SelectItem value="sale">{t("salePayment")}</SelectItem>
                <SelectItem value="deposit">{t("deposit")}</SelectItem>
                <SelectItem value="other">{t("other")}</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <F label={t("amount")}>
            <Input type="number" value={pAmount} onChange={(e) => setPAmount(+e.target.value)} />
          </F>
          <F label={t("date")}>
            <Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} />
          </F>
          {pType === "rent" && (
            <F label={t("period")}>
              <Input type="month" value={pPeriod} onChange={(e) => setPPeriod(e.target.value)} />
            </F>
          )}
          <F label={t("notes")}>
            <Textarea value={pNotes} onChange={(e) => setPNotes(e.target.value)} />
          </F>
        </div>
      </FormDialog>

      <PaymentReceiptDialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} data={receipt} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-base font-bold leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
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
