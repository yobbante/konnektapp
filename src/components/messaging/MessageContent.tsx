/**
 * MessageContent - Renders message content with interactive action buttons
 * 
 * Features:
 * - Parses Waze/Google Maps links and renders them as buttons
 * - Parses WhatsApp links and renders them as buttons
 * - Parses phone numbers and renders call buttons
 * - Parses QR code mentions and renders link to QR page
 * - Removes markdown ** syntax and displays clean text
 */

import { useState } from "react";
import { 
  MapPin, Phone, MessageCircle, Navigation, QrCode,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  orderId?: string;
  isOwn?: boolean;
}

interface ActionButton {
  type: "waze" | "maps" | "call" | "whatsapp" | "qrcode";
  label: string;
  url?: string;
  phone?: string;
}

export function MessageContent({ content, orderId, isOwn = false }: MessageContentProps) {
  // Extract action buttons from content
  const extractActions = (text: string): ActionButton[] => {
    const actions: ActionButton[] = [];
    
    // Extract Waze links
    const wazeMatch = text.match(/\[.*?Waze.*?\]\((https:\/\/waze\.com\/[^\)]+)\)/i);
    if (wazeMatch) {
      actions.push({ type: "waze", label: "Waze", url: wazeMatch[1] });
    }
    
    // Extract Google Maps links
    const mapsMatch = text.match(/\[.*?Google Maps.*?\]\((https:\/\/maps\.google\.com\/[^\)]+)\)/i);
    if (mapsMatch) {
      actions.push({ type: "maps", label: "Maps", url: mapsMatch[1] });
    }
    
    // Extract WhatsApp links
    const waMatch = text.match(/\[.*?WhatsApp.*?\]\((https:\/\/wa\.me\/(\d+))\)/i);
    if (waMatch) {
      actions.push({ type: "whatsapp", label: "WhatsApp", url: waMatch[1], phone: waMatch[2] });
    }
    
    // Extract phone numbers
    const phoneMatch = text.match(/Téléphone\s*:\s*(\+?[\d\s-]+)/i);
    if (phoneMatch) {
      const phone = phoneMatch[1].replace(/\s+/g, "").trim();
      actions.push({ type: "call", label: "Appeler", phone });
    }
    
    // Check for QR code mentions
    if (text.includes("QR code") || text.includes("QR Code") || text.includes("qr code")) {
      if (orderId) {
        actions.push({ type: "qrcode", label: "Mon QR Code", url: `/order/${orderId}/qrcode` });
      }
    }
    
    return actions;
  };
  
  // Clean content: remove markdown ** and links that will be replaced by buttons
  const cleanContent = (text: string): string => {
    let cleaned = text;
    
    // Remove markdown bold ** syntax
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
    
    // Remove Waze markdown links
    cleaned = cleaned.replace(/→?\s*\[📍?\s*Waze\]\([^\)]+\)/gi, "");
    
    // Remove Google Maps markdown links
    cleaned = cleaned.replace(/→?\s*\[🗺️?\s*Google Maps\]\([^\)]+\)/gi, "");
    
    // Remove WhatsApp markdown links
    cleaned = cleaned.replace(/💬\s*WhatsApp\s*:\s*\[.*?\]\([^\)]+\)/gi, "");
    
    // Remove "Ouvrir dans :" section if empty after link removal
    cleaned = cleaned.replace(/🗺️\s*Ouvrir dans\s*:\s*\n?\s*$/gm, "");
    
    // Clean up empty lines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    
    return cleaned.trim();
  };
  
  const actions = extractActions(content);
  const cleanedContent = cleanContent(content);
  
  const handleAction = (action: ActionButton) => {
    switch (action.type) {
      case "waze":
      case "maps":
        window.open(action.url, "_blank");
        break;
      case "call":
        window.open(`tel:${action.phone}`, "_self");
        break;
      case "whatsapp":
        window.open(action.url, "_blank");
        break;
      case "qrcode":
        window.location.href = action.url!;
        break;
    }
  };
  
  const getActionIcon = (type: ActionButton["type"]) => {
    switch (type) {
      case "waze":
        return <Navigation className="w-3.5 h-3.5" />;
      case "maps":
        return <MapPin className="w-3.5 h-3.5" />;
      case "call":
        return <Phone className="w-3.5 h-3.5" />;
      case "whatsapp":
        return <MessageCircle className="w-3.5 h-3.5" />;
      case "qrcode":
        return <QrCode className="w-3.5 h-3.5" />;
    }
  };
  
  const getActionColor = (type: ActionButton["type"], isOwn: boolean) => {
    if (isOwn) {
      return "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground";
    }
    switch (type) {
      case "waze":
        return "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 border-cyan-200";
      case "maps":
        return "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border-blue-200";
      case "call":
        return "bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-200";
      case "whatsapp":
        return "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-200";
      case "qrcode":
        return "bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border-purple-200";
    }
  };
  
  return (
    <div className="space-y-2">
      {/* Main text content */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{cleanedContent}</p>
      
      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border",
                getActionColor(action.type, isOwn)
              )}
            >
              {getActionIcon(action.type)}
              {action.label}
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
