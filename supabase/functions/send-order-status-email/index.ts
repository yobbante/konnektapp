import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Konnekt <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return response.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusPayload {
  order_id: string;
  old_status: string;
  new_status: string;
}

const statusLabels: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  collected: "Collectée",
  in_transit: "En transit",
  delivered: "Livrée",
  cancelled: "Annulée",
  disputed: "En litige",
};

const getStatusEmoji = (status: string): string => {
  const emojis: Record<string, string> = {
    pending: "⏳",
    accepted: "✅",
    collected: "📦",
    in_transit: "🚚",
    delivered: "🎉",
    cancelled: "❌",
    disputed: "⚠️",
  };
  return emojis[status] || "📋";
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, old_status, new_status }: OrderStatusPayload = await req.json();
    
    console.log(`Processing order status change: ${order_id} from ${old_status} to ${new_status}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get order details with client and GP info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        gp_profiles!orders_gp_id_fkey (
          business_name,
          phone,
          user_id
        )
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client profile
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", order.client_id)
      .single();

    // Get GP user profile for email
    const { data: gpUserProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", order.gp_profiles?.user_id)
      .single();

    const emails: { to: string; name: string; isClient: boolean }[] = [];
    
    if (clientProfile?.email) {
      emails.push({ to: clientProfile.email, name: clientProfile.full_name || "Client", isClient: true });
    }
    
    if (gpUserProfile?.email) {
      emails.push({ to: gpUserProfile.email, name: gpUserProfile.full_name || order.gp_profiles?.business_name || "Transporteur", isClient: false });
    }

    const statusLabel = statusLabels[new_status] || new_status;
    const emoji = getStatusEmoji(new_status);

    // Send emails to both parties
    const emailPromises = emails.map(async ({ to, name, isClient }) => {
      const subject = `${emoji} Commande ${order.order_number} - ${statusLabel}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0066CC 0%, #0055aa 100%); color: white; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .emoji { font-size: 48px; margin-bottom: 16px; display: block; }
            .content { padding: 32px 24px; }
            .status-badge { display: inline-block; background: #e8f4fd; color: #0066CC; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-bottom: 24px; }
            .info-card { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #6c757d; }
            .info-value { font-weight: 600; color: #212529; }
            .route { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 18px; font-weight: 600; margin: 20px 0; }
            .route-arrow { color: #0066CC; }
            .cta-button { display: inline-block; background: #0066CC; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
            .footer { text-align: center; padding: 24px; background: #f8f9fa; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="emoji">${emoji}</span>
              <h1>Mise à jour de commande</h1>
            </div>
            <div class="content">
              <p>Bonjour ${name},</p>
              
              <div class="status-badge">${statusLabel}</div>
              
              <p>${isClient 
                ? `Votre commande est maintenant <strong>${statusLabel.toLowerCase()}</strong>.` 
                : `La commande que vous gérez est maintenant <strong>${statusLabel.toLowerCase()}</strong>.`
              }</p>
              
              <div class="route">
                <span>${order.origin_city}</span>
                <span class="route-arrow">→</span>
                <span>${order.destination_city}</span>
              </div>
              
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">N° Commande</span>
                  <span class="info-value">${order.order_number}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Poids</span>
                  <span class="info-value">${order.weight} kg</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Prix total</span>
                  <span class="info-value">${order.total_price.toLocaleString('fr-FR')} ${order.currency}</span>
                </div>
                ${order.tracking_code ? `
                <div class="info-row">
                  <span class="info-label">Code de suivi</span>
                  <span class="info-value">${order.tracking_code}</span>
                </div>
                ` : ''}
              </div>
              
              <center>
                <a href="https://konnekt.app/tracking?order=${order.id}" class="cta-button">
                  Suivre ma commande
                </a>
              </center>
            </div>
            <div class="footer">
              <p>Konnekt — Votre partenaire logistique</p>
              <p>Cet email a été envoyé automatiquement. Merci de ne pas répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const result = await sendEmail(to, subject, html);
        console.log(`Email sent to ${to}:`, result);
        return { success: true, to };
      } catch (error: any) {
        console.error(`Failed to send email to ${to}:`, error);
        return { success: false, to, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    
    console.log("Email results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-order-status-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
