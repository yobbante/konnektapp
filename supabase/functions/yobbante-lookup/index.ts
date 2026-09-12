const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-konnekt-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const ref = typeof body.ref_gp === "string" ? body.ref_gp.trim().toUpperCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!(ref && /^GP\d{3,10}$/.test(ref)) && !/^\+\d{8,15}$/.test(phone)) {
      return reply({ error: "Invalid lookup" }, 400);
    }
    // Fixed upstream only. Forward the existing partner credential, never log it.
    const key = req.headers.get("x-konnekt-key");
    if (!key) return reply({ error: "Unauthorized" }, 401);
    const upstream = await fetch("https://tlvuextleczdsqxoguyq.supabase.co/functions/v1/gp-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-konnekt-key": key },
      body: JSON.stringify(ref ? { ref_gp: ref } : { phone, telephone: phone, tel: phone }),
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return reply({ error: "Partner unavailable" }, 502);
    return reply(await upstream.json());
  } catch {
    return reply({ error: "Partner unavailable" }, 503);
  }
});