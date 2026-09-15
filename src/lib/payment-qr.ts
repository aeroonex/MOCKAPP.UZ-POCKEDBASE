/**
 * To'lov QR kodi: bank ilovalari (Click, Payme, Uzum, Paynet) QR ichida HAVOLANI emas,
 * EMVCo standarti bo'yicha to'lov satrini kutadi — `000201...6304XXXX`.
 *
 * Paynet ilovasi ham shunday qiladi: QR ichida to'lov satri, ostidagi havola esa
 * faqat "ulashish" uchun. Shuning uchun `https://app.paynet.uz/qr-online/<to'lov satri>`
 * berilsa, QR ga faqat <to'lov satri> joylanadi (aks holda bank ilovasi o'qimaydi).
 */

/** EMVCo tekshiruv summasi: CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF). */
export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Satr EMVCo to'lov kodimi? (boshi 000201, oxiri 6304 + to'g'ri CRC) */
export function isEmvcoPayload(s: string): boolean {
  if (!/^000201/.test(s) || s.length < 20) return false;
  const tail = s.slice(-8);
  if (!/^6304[0-9A-F]{4}$/i.test(tail)) return false;
  return crc16ccitt(s.slice(0, -4)) === s.slice(-4).toUpperCase();
}

export interface PaymentQrParts {
  /** QR ichiga joylanadigan matn (bank ilovasi o'qiydigan) */
  qrData: string;
  /** "Havolani ochish" tugmasi uchun (bo'sh bo'lishi mumkin) */
  openUrl: string;
  /** To'lov kodi topildimi (aks holda oddiy havola QR qilinadi) */
  emvco: boolean;
}

/**
 * Sozlamalardagi qiymatni QR uchun ajratadi. Qabul qiladi:
 *  · `https://app.paynet.uz/qr-online/000201...`  → QR ga to'lov kodi, tugmaga havola
 *  · to'g'ridan-to'g'ri `000201...`               → QR ga to'lov kodi (havola yo'q)
 *  · boshqa har qanday havola                     → QR ga havolaning o'zi
 */
export function parsePaymentQr(value: string): PaymentQrParts {
  const v = (value || "").trim();
  if (!v) return { qrData: "", openUrl: "", emvco: false };

  // To'g'ridan-to'g'ri to'lov kodi kiritilgan
  if (isEmvcoPayload(v)) return { qrData: v, openUrl: "", emvco: true };

  // Havola ichidan to'lov kodini ajratib olamiz (oxirgi bo'lak yoki ?query qiymati)
  if (/^https?:\/\//i.test(v)) {
    const candidates: string[] = [];
    const [path, qs] = v.split("?");
    const last = path.split("/").filter(Boolean).pop() || "";
    candidates.push(last);
    try {
      candidates.push(decodeURIComponent(last));
    } catch {
      /* e'tiborsiz */
    }
    if (qs) {
      for (const part of qs.split("&")) {
        const val = part.split("=").slice(1).join("=");
        if (!val) continue;
        candidates.push(val);
        try {
          candidates.push(decodeURIComponent(val));
        } catch {
          /* e'tiborsiz */
        }
      }
    }
    const found = candidates.find((c) => isEmvcoPayload(c));
    if (found) return { qrData: found, openUrl: v, emvco: true };
    return { qrData: v, openUrl: v, emvco: false };
  }

  return { qrData: v, openUrl: "", emvco: false };
}
