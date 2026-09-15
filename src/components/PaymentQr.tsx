"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2, QrCode, ScanLine } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parsePaymentQr } from "@/lib/payment-qr";
import { cn } from "@/lib/utils";

/**
 * To'lov QR kodi (Paynet / Click / Payme / Uzum — bank ilovasi kamerasi bilan).
 *
 * QR brauzerda `qrcode` bilan yasaladi (serverga so'rov ketmaydi). Kodning o'zi
 * OQ fonda, qora naqsh bilan — bank ilovalari faqat shunda ishonchli o'qiydi
 * (qorong'i mavzuda ham fon oq qoladi).
 * Karta raqami va egasining ismi KO'RSATILMAYDI.
 */
const PaymentQr: React.FC<{ url: string; className?: string }> = ({ url, className }) => {
  const { t } = useTranslation();
  const [png, setPng] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const [failed, setFailed] = useState(false);

  // QR ichiga EMVCo to'lov kodi joylanadi (havola emas) — bank ilovalari faqat shuni o'qiydi
  const { qrData, openUrl } = useMemo(() => parsePaymentQr(url), [url]);

  useEffect(() => {
    let cancelled = false;
    setPng(null);
    setFailed(false);
    if (!qrData) return;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        // "M" darajasi — bank ilovalari uchun standart muvozanat: naqsh juda zich
        // bo'lib ketmaydi (H bo'lsa modul soni ~25% ko'payib, ekrandan o'qish qiyinlashadi)
        const data = await QRCode.toDataURL(qrData, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 720,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setPng(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qrData]);

  return (
    <div className={cn("rounded-2xl bg-white/12 p-4 backdrop-blur", className)}>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        {/* QR — doim OQ fonda (qorong'i mavzuda ham), bosilsa kattalashadi */}
        <button
          type="button"
          onClick={() => png && setBig(true)}
          title={t("billing.qr_zoom")}
          className="shrink-0 rounded-xl bg-white p-2.5 shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          {png ? (
            <img src={png} alt={t("billing.qr_badge")} className="h-44 w-44 sm:h-52 sm:w-52" />
          ) : (
            <div className="grid h-44 w-44 place-items-center sm:h-52 sm:w-52">
              {failed ? <QrCode className="h-10 w-10 text-slate-400" /> : <Loader2 className="h-8 w-8 animate-spin text-slate-400" />}
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
            <ScanLine className="h-3.5 w-3.5" />
            {t("billing.qr_badge")}
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug">{t("billing.qr_hint")}</p>
          <p className="mt-1 text-xs text-white/75">{t("billing.qr_apps")}</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-indigo-700 shadow transition-colors hover:bg-white/90"
              >
                <ExternalLink className="h-4 w-4" />
                {t("billing.qr_open")}
              </a>
            )}
            <CopyButton text={openUrl || qrData} label={t("billing.qr_copy")} copiedLabel={t("registrations_page.copied")} />
          </div>
          {openUrl && <p className="mt-2 text-[11px] text-white/70">{t("billing.qr_phone_hint")}</p>}
        </div>
      </div>

      {/* Kattalashtirilgan QR — boshqa telefondan skanerlash uchun qulay */}
      <Dialog open={big} onOpenChange={setBig}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-base">{t("billing.qr_badge")}</DialogTitle>
            <DialogDescription className="text-center text-xs">{t("billing.qr_hint")}</DialogDescription>
          </DialogHeader>
          {png && (
            <div className="mx-auto rounded-2xl bg-white p-4 shadow-inner">
              <img src={png} alt={t("billing.qr_badge")} className="h-64 w-64 sm:h-72 sm:w-72" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentQr;
