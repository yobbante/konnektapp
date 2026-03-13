/**
 * generateDepartureFlyer — Generates a branded promotional image
 * for GP departures to share on Facebook groups etc.
 * Uses Canvas 2D API for deterministic, fast generation.
 */

const COUNTRY_FLAGS: Record<string, string> = {
  France: "🇫🇷", Sénégal: "🇸🇳", "Côte d'Ivoire": "🇨🇮", Mali: "🇲🇱",
  Cameroun: "🇨🇲", Guinée: "🇬🇳", Belgique: "🇧🇪", Allemagne: "🇩🇪",
  Espagne: "🇪🇸", Italie: "🇮🇹", "États-Unis": "🇺🇸", Canada: "🇨🇦",
  Maroc: "🇲🇦", Tunisie: "🇹🇳", Algérie: "🇩🇿", Togo: "🇹🇬",
  Bénin: "🇧🇯", Gabon: "🇬🇦", Congo: "🇨🇬", Burkina: "🇧🇫",
};

export interface FlyerData {
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  departureDate: string;
  pricePerKg: number;
  currency: string;
  totalCapacity: number;
  airline?: string;
  flightNumber?: string;
  businessName: string;
  phone?: string;
  bookingUrl: string;
}

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] || "🌍";
}

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const FONT = "'Inter', system-ui, sans-serif";

export function generateDepartureFlyer(data: FlyerData): Promise<string> {
  return new Promise((resolve) => {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // ── Background gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0F172A");
    bgGrad.addColorStop(0.4, "#1E293B");
    bgGrad.addColorStop(1, "#0F172A");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Decorative circles ──
    const circleGrad = ctx.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, 400);
    circleGrad.addColorStop(0, "rgba(99, 102, 241, 0.15)");
    circleGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
    ctx.fillStyle = circleGrad;
    ctx.fillRect(0, 0, W, H);

    const circleGrad2 = ctx.createRadialGradient(W * 0.1, H * 0.7, 0, W * 0.1, H * 0.7, 350);
    circleGrad2.addColorStop(0, "rgba(16, 185, 129, 0.1)");
    circleGrad2.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = circleGrad2;
    ctx.fillRect(0, 0, W, H);

    // ── Top bar ──
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, "#6366F1");
    topGrad.addColorStop(1, "#8B5CF6");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 8);

    // ── KONNEKT logo ──
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 42px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("KONNEKT", W / 2, 80);
    
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `16px ${FONT}`;
    ctx.fillText("Transport de colis · Rapide · Sécurisé", W / 2, 110);

    // ── Main card ──
    const cardX = 50, cardY = 150, cardW = W - 100, cardH = 700;
    roundRect(ctx, cardX, cardY, cardW, cardH, 32);
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, "rgba(255,255,255,0.08)");
    cardGrad.addColorStop(1, "rgba(255,255,255,0.03)");
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── "DÉPART" badge ──
    const badgeW = 220, badgeH = 48;
    const badgeX = (W - badgeW) / 2, badgeY = cardY + 30;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 24);
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
    badgeGrad.addColorStop(0, "#6366F1");
    badgeGrad.addColorStop(1, "#8B5CF6");
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("✈️  NOUVEAU DÉPART", W / 2, badgeY + 32);

    // ── Flags + Cities ──
    const routeY = cardY + 140;
    ctx.font = "72px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(getFlag(data.originCountry), W / 2 - 200, routeY);
    ctx.fillText(getFlag(data.destinationCountry), W / 2 + 200, routeY);

    // Arrow
    ctx.strokeStyle = "#6366F1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 100, routeY - 18);
    ctx.lineTo(W / 2 + 100, routeY - 18);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = "#6366F1";
    ctx.beginPath();
    ctx.moveTo(W / 2 + 100, routeY - 18);
    ctx.lineTo(W / 2 + 85, routeY - 28);
    ctx.lineTo(W / 2 + 85, routeY - 8);
    ctx.closePath();
    ctx.fill();
    // Plane icon
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText("✈️", W / 2, routeY - 3);

    // City names
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 48px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(data.originCity.toUpperCase(), W / 2 - 200, routeY + 60);
    ctx.fillText(data.destinationCity.toUpperCase(), W / 2 + 200, routeY + 60);

    // Country labels
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `18px ${FONT}`;
    ctx.fillText(data.originCountry, W / 2 - 200, routeY + 88);
    ctx.fillText(data.destinationCountry, W / 2 + 200, routeY + 88);

    // ── Date section ──
    const dateY = routeY + 140;
    roundRect(ctx, cardX + 40, dateY, cardW - 80, 90, 16);
    ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("DATE DE DÉPART", W / 2, dateY + 30);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 36px ${FONT}`;
    ctx.fillText(formatDateFr(data.departureDate), W / 2, dateY + 70);

    // ── Info pills ──
    const pillY = dateY + 120;
    const pills = [
      { label: "Prix/kg", value: `${data.pricePerKg} ${data.currency}` },
      { label: "Capacité", value: `${data.totalCapacity} kg` },
    ];
    if (data.airline) pills.push({ label: "Compagnie", value: data.airline });
    if (data.flightNumber) pills.push({ label: "Vol", value: data.flightNumber });

    const pillW = pills.length <= 2 ? 320 : 220;
    const totalPillW = pills.length * pillW + (pills.length - 1) * 16;
    let pillStartX = (W - totalPillW) / 2;

    pills.forEach((pill, i) => {
      const px = pillStartX + i * (pillW + 16);
      roundRect(ctx, px, pillY, pillW, 80, 14);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `14px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(pill.label, px + pillW / 2, pillY + 30);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(pill.value, px + pillW / 2, pillY + 60);
    });

    // ── Business name ──
    const bizY = pillY + 130;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Transporteur", W / 2, bizY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(data.businessName, W / 2, bizY + 40);

    // ── Phone ──
    if (data.phone) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = `22px ${FONT}`;
      ctx.fillText(`📞 ${data.phone}`, W / 2, bizY + 78);
    }

    // ── CTA Button ──
    const ctaY = H - 280;
    const ctaW = 580, ctaH = 70;
    const ctaX = (W - ctaW) / 2;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 35);
    const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
    ctaGrad.addColorStop(0, "#6366F1");
    ctaGrad.addColorStop(1, "#8B5CF6");
    ctx.fillStyle = ctaGrad;
    ctx.fill();

    // CTA shadow
    ctx.shadowColor = "rgba(99, 102, 241, 0.4)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 35);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Réserver sur Konnekt →", W / 2, ctaY + 44);

    // ── Booking URL ──
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `16px ${FONT}`;
    ctx.fillText(data.bookingUrl, W / 2, ctaY + ctaH + 35);

    // ── Bottom branding ──
    const footY = H - 70;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(50, footY - 20, W - 100, 1);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("konnekt.app · Transport sécurisé · Paiement garanti", W / 2, footY + 10);

    // Export
    resolve(canvas.toDataURL("image/png", 1.0));
  });
}
