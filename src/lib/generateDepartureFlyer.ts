/**
 * generateDepartureFlyer — Generates a branded promotional image
 * Uses Canvas 2D API for deterministic, fast generation.
 * No emojis. Professional design.
 */

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

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"];
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

function drawPlaneIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 24, size / 24);
  ctx.beginPath();
  ctx.moveTo(12, -12);
  ctx.lineTo(8, -4);
  ctx.lineTo(-12, 2);
  ctx.lineTo(-12, 5);
  ctx.lineTo(8, 1);
  ctx.lineTo(8, 7);
  ctx.lineTo(4, 10);
  ctx.lineTo(4, 12);
  ctx.lineTo(12, 9);
  ctx.lineTo(20, 12);
  ctx.lineTo(20, 10);
  ctx.lineTo(16, 7);
  ctx.lineTo(16, 1);
  ctx.lineTo(36, 5);
  ctx.lineTo(36, 2);
  ctx.lineTo(16, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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

    // -- Background gradient --
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#0A0F1C");
    bgGrad.addColorStop(0.5, "#111827");
    bgGrad.addColorStop(1, "#0A0F1C");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // -- Decorative accent glow --
    const glow1 = ctx.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, 500);
    glow1.addColorStop(0, "rgba(20, 184, 166, 0.12)");
    glow1.addColorStop(1, "rgba(20, 184, 166, 0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W * 0.2, H * 0.75, 0, W * 0.2, H * 0.75, 400);
    glow2.addColorStop(0, "rgba(20, 184, 166, 0.06)");
    glow2.addColorStop(1, "rgba(20, 184, 166, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // -- Top accent bar --
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, "#14B8A6");
    topGrad.addColorStop(1, "#0D9488");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 6);

    // -- KONNEKT logo --
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 44px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("KONNEKT", W / 2, 80);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `500 15px ${FONT}`;
    ctx.fillText("Transport de colis  |  Rapide  |  Securise", W / 2, 108);

    // -- Main card --
    const cardX = 50, cardY = 145, cardW = W - 100, cardH = 720;
    roundRect(ctx, cardX, cardY, cardW, cardH, 28);
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, "rgba(255,255,255,0.07)");
    cardGrad.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // -- "NOUVEAU DEPART" badge --
    const badgeW = 240, badgeH = 44;
    const badgeX = (W - badgeW) / 2, badgeY = cardY + 28;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 22);
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
    badgeGrad.addColorStop(0, "#14B8A6");
    badgeGrad.addColorStop(1, "#0D9488");
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 17px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("NOUVEAU DEPART", W / 2, badgeY + 29);

    // -- Route: Cities --
    const routeY = cardY + 140;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 46px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(data.originCity.toUpperCase(), W / 2 - 200, routeY);
    ctx.fillText(data.destinationCity.toUpperCase(), W / 2 + 200, routeY);

    // Country labels
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText(data.originCountry, W / 2 - 200, routeY + 30);
    ctx.fillText(data.destinationCountry, W / 2 + 200, routeY + 30);

    // Arrow line
    const arrowY = routeY - 12;
    ctx.strokeStyle = "#14B8A6";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(W / 2 - 100, arrowY);
    ctx.lineTo(W / 2 + 100, arrowY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    ctx.fillStyle = "#14B8A6";
    ctx.beginPath();
    ctx.moveTo(W / 2 + 100, arrowY);
    ctx.lineTo(W / 2 + 88, arrowY - 8);
    ctx.lineTo(W / 2 + 88, arrowY + 8);
    ctx.closePath();
    ctx.fill();

    // Plane icon in center
    ctx.fillStyle = "#14B8A6";
    drawPlaneIcon(ctx, W / 2 - 12, arrowY, 1.2);

    // -- Date section --
    const dateY = routeY + 80;
    roundRect(ctx, cardX + 40, dateY, cardW - 80, 90, 14);
    ctx.fillStyle = "rgba(20, 184, 166, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(20, 184, 166, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("DATE DE DEPART", W / 2, dateY + 30);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText(formatDateFr(data.departureDate), W / 2, dateY + 68);

    // -- Info pills --
    const pillY = dateY + 120;
    const pills = [
      { label: "Capacite", value: `${data.totalCapacity} kg` },
    ];
    if (data.airline) pills.push({ label: "Compagnie", value: data.airline });
    if (data.flightNumber) pills.push({ label: "Vol", value: data.flightNumber });

    const pillW = pills.length <= 1 ? 400 : pills.length <= 2 ? 320 : 220;
    const totalPillW = pills.length * pillW + (pills.length - 1) * 16;
    let pillStartX = (W - totalPillW) / 2;

    pills.forEach((pill, i) => {
      const px = pillStartX + i * (pillW + 16);
      roundRect(ctx, px, pillY, pillW, 80, 12);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = `600 13px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(pill.label, px + pillW / 2, pillY + 30);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(pill.value, px + pillW / 2, pillY + 58);
    });

    // -- Business name --
    const bizY = pillY + 130;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `500 15px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Transporteur", W / 2, bizY);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(data.businessName, W / 2, bizY + 38);

    if (data.phone) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `500 20px ${FONT}`;
      ctx.fillText(data.phone, W / 2, bizY + 72);
    }

    // -- CTA Button --
    const ctaY = H - 280;
    const ctaW = 560, ctaH = 66;
    const ctaX = (W - ctaW) / 2;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 33);
    const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
    ctaGrad.addColorStop(0, "#14B8A6");
    ctaGrad.addColorStop(1, "#0D9488");
    ctx.fillStyle = ctaGrad;
    ctx.fill();

    ctx.shadowColor = "rgba(20, 184, 166, 0.35)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 33);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Reservez sur Konnekt", W / 2, ctaY + 42);

    // -- Booking URL --
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText(data.bookingUrl, W / 2, ctaY + ctaH + 32);

    // -- Bottom branding --
    const footY = H - 65;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(50, footY - 20, W - 100, 1);

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = `400 13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("konnekt.app  |  Transport securise  |  Paiement garanti", W / 2, footY + 8);

    // Export using toBlob for reliability, fallback to toDataURL
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        } else {
          resolve(canvas.toDataURL("image/png", 1.0));
        }
      }, "image/png");
    } catch {
      resolve(canvas.toDataURL("image/png", 1.0));
    }
  });
}
