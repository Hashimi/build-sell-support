import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { readSettings, writeSettings, type CompanySettings } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { t } = useI18n();
  const [form, setForm] = useState<CompanySettings>(readSettings());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(readSettings());
  }, []);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onLogo = (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error("Max 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    writeSettings(form);
    toast.success(t("save"));
  };

  return (
    <div>
      <PageHeader
        title={t("companySettings")}
        subtitle={t("settings")}
        actions={
          <Button onClick={save} className="gap-2">
            <Save className="h-4 w-4" /> {t("save")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>{t("companyLogo")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 overflow-hidden">
              {form.logoDataUrl ? (
                <img src={form.logoDataUrl} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
                <Upload className="h-3.5 w-3.5" /> {t("uploadLogo")}
              </Button>
              {form.logoDataUrl && (
                <Button variant="ghost" size="sm" className="text-destructive gap-2" onClick={() => set("logoDataUrl", undefined)}>
                  <Trash2 className="h-3.5 w-3.5" /> {t("removeLogo")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("companyName")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label={t("companyName")}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label={t("registrationNo")}>
              <Input value={form.registrationNo ?? ""} onChange={(e) => set("registrationNo", e.target.value)} />
            </Field>
            <Field label={t("companyPhone")}>
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label={t("companyPhone2")}>
              <Input value={form.phone2 ?? ""} onChange={(e) => set("phone2", e.target.value)} />
            </Field>
            <Field label={t("companyEmail")}>
              <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label={t("companyWebsite")}>
              <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("companyAddress")}>
                <Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={t("footerNote")}>
                <Textarea
                  value={form.footerNote ?? ""}
                  onChange={(e) => set("footerNote", e.target.value)}
                  placeholder="e.g. This receipt is computer generated."
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>
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
