import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, HardHat, Building2, ShoppingCart, Wrench, Receipt, ArrowRight, ArrowLeft, CheckCircle2, Clock, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCollection } from "@/lib/storage";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { t, formatMoney, dir } = useI18n();
  const materials = useCollection("materials");
  const workers = useCollection("workers");
  const apartments = useCollection("apartments");
  const buildings = useCollection("buildings");
  const sales = useCollection("sales");
  const requests = useCollection("requests");
  const expenses = useCollection("expenses");

  const totalSales = sales.reduce((s, x) => s + x.salePrice, 0);
  const paidFromSales = sales.reduce((s, x) => s + x.paidAmount, 0);
  const pendingFromSales = Math.max(0, totalSales - paidFromSales);
  const soldCount = apartments.filter((a) => a.status === "sold").length;
  const availableCount = apartments.filter((a) => a.status === "available").length;
  const monthlyExp = expenses
    .filter((e) => e.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, x) => s + x.amount, 0);
  const openReqs = requests.filter((r) => r.status !== "completed").length;
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const perBuilding = buildings.map((b) => {
    const units = apartments.filter((a) => a.buildingId === b.id);
    return {
      id: b.id,
      name: b.name,
      total: units.length,
      sold: units.filter((u) => u.status === "sold").length,
      available: units.filter((u) => u.status === "available").length,
      reserved: units.filter((u) => u.status === "reserved").length,
    };
  });

  const cards = [
    { icon: Package, label: t("totalMaterials"), value: materials.length.toString(), to: "/materials", color: "from-chart-1/20 to-chart-1/5" },
    { icon: HardHat, label: t("totalWorkers"), value: workers.length.toString(), to: "/workers", color: "from-chart-2/20 to-chart-2/5" },
    { icon: Building2, label: t("totalApartments"), value: apartments.length.toString(), to: "/apartments", color: "from-chart-3/20 to-chart-3/5" },
    { icon: CheckCircle2, label: t("soldApartments"), value: soldCount.toString(), to: "/apartments", color: "from-chart-2/20 to-chart-2/5" },
    { icon: Building2, label: t("availableApartments"), value: availableCount.toString(), to: "/apartments", color: "from-chart-3/20 to-chart-3/5" },
    { icon: ShoppingCart, label: t("totalSales"), value: formatMoney(totalSales), to: "/sales", color: "from-chart-4/20 to-chart-4/5" },
    { icon: Wallet, label: t("paidFromSales"), value: formatMoney(paidFromSales), to: "/sales", color: "from-chart-2/20 to-chart-2/5" },
    { icon: Clock, label: t("pendingFromSales"), value: formatMoney(pendingFromSales), to: "/sales", color: "from-destructive/20 to-destructive/5" },
    { icon: Wrench, label: t("openRequests"), value: openReqs.toString(), to: "/requests", color: "from-chart-5/20 to-chart-5/5" },
    { icon: Receipt, label: t("monthlyExpenses"), value: formatMoney(monthlyExp), to: "/expenses", color: "from-destructive/20 to-destructive/5" },
  ] as const;

  return (
    <div>
      <PageHeader title={`${t("welcome")}!`} subtitle={t("appName")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className={`group relative overflow-hidden transition-all hover:shadow-elegant hover:-translate-y-0.5 bg-gradient-to-br ${c.color}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-foreground">{c.value}</div>
                  <Arrow className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")} — {t("sales")}</CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {sales.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">{new Date(s.date).toLocaleDateString()}</span>
                    <span className="font-medium">{formatMoney(s.salePrice)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")} — {t("requests")}</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noData")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {requests.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span className="truncate">{r.issue}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t(r.status as "open" | "inProgress" | "completed")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
