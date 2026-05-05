import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCompanySettings } from "@/lib/storage";

export interface ReceiptLine {
  label: string;
  value: string;
}

export interface ReceiptData {
  receiptNo: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  title: string; // e.g. "Installment #3" or "Rent Payment"
  amount: number;
  lines?: ReceiptLine[]; // extra detail lines
  notes?: string;
}

export function PaymentReceiptDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: ReceiptData | null;
}) {
  const { t, formatMoney, dir } = useI18n();
  const company = useCompanySettings();

  if (!data) return null;

  const handlePrint = () => {
    const node = document.getElementById("receipt-print-area");
    if (!node) {
      window.print();
      return;
    }
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      window.print();
      return;
    }
    // Copy stylesheets from current document so design tokens / tailwind apply
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");
    w.document.open();
    w.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${t("receipt")} #${data.receiptNo}</title>${styleTags}
<style>
  body { margin: 0; padding: 16px; background: #fff; color: #111; font-family: system-ui, -apple-system, "Vazirmatn", sans-serif; }
  .receipt-copy { border: 1px solid #ddd; border-radius: 8px; padding: 18px; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid; }
  .r-head { display:flex; justify-content:space-between; gap:16px; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px; }
  .r-brand { display:flex; gap:10px; align-items:center; }
  .r-brand img { height:56px; width:56px; object-fit:contain; }
  .r-title { font-size:18px; font-weight:700; }
  .r-muted { font-size:11px; color:#666; }
  .r-meta { text-align:end; }
  .r-tag { display:inline-block; border:1px solid #ccc; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:600; margin-top:4px; }
  .r-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin-bottom: 12px; }
  .r-row { display:flex; justify-content:space-between; gap:12px; border-bottom:1px dashed #eee; padding:4px 0; }
  .r-row .l { color:#666; } .r-row .v { font-weight:500; text-align:end; }
  .r-amount { display:flex; justify-content:space-between; align-items:center; background:#eef6f1; border:1px solid #cfe3d8; border-radius:8px; padding:10px 12px; margin-bottom:12px; }
  .r-amount .v { font-size:22px; font-weight:700; color:#1a7a55; }
  .r-sigs { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:28px; }
  .r-sig { border-top:1px solid #444; padding-top:4px; text-align:center; font-size:11px; color:#666; }
  .r-foot { text-align:center; font-size:10px; color:#666; margin-top:10px; }
  @page { margin: 12mm; }
</style>
</head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    // Wait for images then print
    const doPrint = () => { w.focus(); w.print(); setTimeout(() => w.close(), 300); };
    const imgs = Array.from(w.document.images);
    if (imgs.length === 0) {
      setTimeout(doPrint, 150);
    } else {
      let pending = imgs.length;
      const done = () => { if (--pending <= 0) doPrint(); };
      imgs.forEach((img) => {
        if (img.complete) done();
        else { img.onload = done; img.onerror = done; }
      });
      setTimeout(doPrint, 1500); // fallback
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>{t("receipt")}</DialogTitle>
        </DialogHeader>

        <div id="receipt-print-area" dir={dir}>
          {[t("customerCopy"), t("companyCopy")].map((copyLabel, idx) => (
            <div
              key={copyLabel}
              className={`receipt-copy border rounded-md p-5 bg-background ${idx === 0 ? "mb-4 print:mb-6" : ""} print:break-inside-avoid`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b pb-3 mb-3">
                <div className="flex items-center gap-3">
                  {company.logoDataUrl && (
                    <img src={company.logoDataUrl} alt="logo" className="h-14 w-14 object-contain" />
                  )}
                  <div>
                    <div className="text-lg font-bold">{company.name}</div>
                    {company.address && <div className="text-xs text-muted-foreground">{company.address}</div>}
                    <div className="text-xs text-muted-foreground">
                      {[company.phone, company.phone2, company.email, company.website].filter(Boolean).join(" · ")}
                    </div>
                    {company.registrationNo && (
                      <div className="text-xs text-muted-foreground">{t("registrationNo")}: {company.registrationNo}</div>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("receipt")}</div>
                  <div className="text-sm font-mono">#{data.receiptNo}</div>
                  <div className="text-xs text-muted-foreground">{data.date}</div>
                  <div className="mt-1 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold">
                    {copyLabel}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                <Row label={t("client")} value={data.clientName} />
                {data.clientPhone && <Row label={t("phone")} value={data.clientPhone} />}
                <Row label={t("paymentDetails")} value={data.title} />
                <Row label={t("date")} value={data.date} />
                {(data.lines ?? []).map((l) => (
                  <Row key={l.label} label={l.label} value={l.value} />
                ))}
              </div>

              {/* Amount */}
              <div className="rounded-md bg-primary/10 border border-primary/30 p-3 mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">{t("amount")}</span>
                <span className="text-2xl font-bold text-primary">{formatMoney(data.amount)}</span>
              </div>

              {data.notes && (
                <div className="text-xs text-muted-foreground mb-3">
                  <span className="font-medium">{t("notes")}: </span>{data.notes}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 mt-6 pt-2">
                <div>
                  <div className="border-t border-foreground/40 pt-1 text-xs text-muted-foreground text-center">
                    {t("customerSignature")}
                  </div>
                </div>
                <div>
                  <div className="border-t border-foreground/40 pt-1 text-xs text-muted-foreground text-center">
                    {t("authorizedSignature")}
                  </div>
                </div>
              </div>

              {company.footerNote && (
                <div className="mt-3 text-center text-[10px] text-muted-foreground border-t pt-2">
                  {company.footerNote}
                </div>
              )}
              <div className="mt-1 text-center text-[10px] text-muted-foreground">{t("thankYou")}</div>
            </div>
          ))}
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> {t("print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-end">{value}</span>
    </div>
  );
}
