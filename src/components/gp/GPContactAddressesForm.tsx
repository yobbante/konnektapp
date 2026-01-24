import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, MessageCircle, Check, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface GPContactAddresses {
  deposit_address: string;
  reception_address: string;
  phone: string;
  phone_secondary: string;
  whatsapp_phone: string; // 'primary' or 'secondary'
}

interface GPContactAddressesFormProps {
  initialData?: Partial<GPContactAddresses>;
  onChange: (data: GPContactAddresses, isValid: boolean) => void;
  showValidation?: boolean;
}

/**
 * Form component for GP mandatory contact addresses (PRD V1 Section 9)
 * Required fields:
 * - Adresse 1 (dépôt)
 * - Adresse 2 (réception)
 * - Téléphone 1
 * - Téléphone 2
 * - WhatsApp (primary or secondary phone)
 */
export function GPContactAddressesForm({
  initialData = {},
  onChange,
  showValidation = false,
}: GPContactAddressesFormProps) {
  const [data, setData] = useState<GPContactAddresses>({
    deposit_address: initialData.deposit_address || "",
    reception_address: initialData.reception_address || "",
    phone: initialData.phone || "",
    phone_secondary: initialData.phone_secondary || "",
    whatsapp_phone: initialData.whatsapp_phone || "primary",
  });

  const [useReceptionSameAsDeposit, setUseReceptionSameAsDeposit] = useState(false);

  // Validation
  const isDepositValid = data.deposit_address.trim().length >= 10;
  const isReceptionValid = useReceptionSameAsDeposit || data.reception_address.trim().length >= 10;
  const isPhoneValid = /^[+]?[\d\s-]{8,}$/.test(data.phone);
  const isPhone2Valid = /^[+]?[\d\s-]{8,}$/.test(data.phone_secondary);
  
  const isValid = isDepositValid && isReceptionValid && isPhoneValid && isPhone2Valid;

  useEffect(() => {
    const finalData = {
      ...data,
      reception_address: useReceptionSameAsDeposit ? data.deposit_address : data.reception_address,
    };
    onChange(finalData, isValid);
  }, [data, isValid, useReceptionSameAsDeposit]);

  const handleChange = (field: keyof GPContactAddresses, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const ValidationIcon = ({ isValid }: { isValid: boolean }) => {
    if (!showValidation) return null;
    return isValid ? (
      <Check className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-destructive" />
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Adresses & Contacts</CardTitle>
          <Badge variant="destructive" className="text-[10px]">Obligatoire</Badge>
        </div>
        <CardDescription className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Ces informations seront dévoilées progressivement aux clients selon l'avancement de leur commande.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deposit Address */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="deposit_address" className="flex items-center gap-2">
              <span>Adresse de dépôt (Adresse 1)</span>
              <Badge variant="secondary" className="text-[10px]">Visible après paiement</Badge>
            </Label>
            <ValidationIcon isValid={isDepositValid} />
          </div>
          <Input
            id="deposit_address"
            placeholder="Ex: 12 Rue de la Paix, 75001 Paris"
            value={data.deposit_address}
            onChange={(e) => handleChange("deposit_address", e.target.value)}
            className={cn(
              showValidation && !isDepositValid && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Adresse où les clients déposent leurs colis avant votre départ
          </p>
        </motion.div>

        {/* Reception Address */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="reception_address" className="flex items-center gap-2">
              <span>Adresse de réception (Adresse 2)</span>
              <Badge variant="secondary" className="text-[10px]">Visible après livraison</Badge>
            </Label>
            <ValidationIcon isValid={isReceptionValid} />
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Switch
              id="same_address"
              checked={useReceptionSameAsDeposit}
              onCheckedChange={setUseReceptionSameAsDeposit}
            />
            <Label htmlFor="same_address" className="text-sm text-muted-foreground cursor-pointer">
              Identique à l'adresse de dépôt
            </Label>
          </div>

          {!useReceptionSameAsDeposit && (
            <Input
              id="reception_address"
              placeholder="Ex: Quartier Plateau, Dakar, Sénégal"
              value={data.reception_address}
              onChange={(e) => handleChange("reception_address", e.target.value)}
              className={cn(
                showValidation && !isReceptionValid && "border-destructive focus-visible:ring-destructive"
              )}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Adresse où les destinataires récupèrent leurs colis à l'arrivée
          </p>
        </motion.div>

        {/* Phone numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>Téléphone 1</span>
              </Label>
              <ValidationIcon isValid={isPhoneValid} />
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={data.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={cn(
                showValidation && !isPhoneValid && "border-destructive focus-visible:ring-destructive"
              )}
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor="phone_secondary" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>Téléphone 2</span>
              </Label>
              <ValidationIcon isValid={isPhone2Valid} />
            </div>
            <Input
              id="phone_secondary"
              type="tel"
              placeholder="+221 77 123 45 67"
              value={data.phone_secondary}
              onChange={(e) => handleChange("phone_secondary", e.target.value)}
              className={cn(
                showValidation && !isPhone2Valid && "border-destructive focus-visible:ring-destructive"
              )}
            />
          </motion.div>
        </div>

        {/* WhatsApp selection */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <Label className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <span>Numéro WhatsApp</span>
            <Badge variant="secondary" className="text-[10px]">Visible après paiement</Badge>
          </Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleChange("whatsapp_phone", "primary")}
              className={cn(
                "flex-1 p-3 rounded-lg border transition-all text-sm",
                data.whatsapp_phone === "primary"
                  ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {data.whatsapp_phone === "primary" && <Check className="w-4 h-4" />}
                <span>Téléphone 1</span>
              </div>
              {data.phone && (
                <p className="text-xs text-muted-foreground mt-1">{data.phone}</p>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleChange("whatsapp_phone", "secondary")}
              className={cn(
                "flex-1 p-3 rounded-lg border transition-all text-sm",
                data.whatsapp_phone === "secondary"
                  ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {data.whatsapp_phone === "secondary" && <Check className="w-4 h-4" />}
                <span>Téléphone 2</span>
              </div>
              {data.phone_secondary && (
                <p className="text-xs text-muted-foreground mt-1">{data.phone_secondary}</p>
              )}
            </button>
          </div>
        </motion.div>

        {/* Validation summary */}
        {showValidation && !isValid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
          >
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Veuillez compléter tous les champs obligatoires
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
