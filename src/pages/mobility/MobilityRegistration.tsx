/**
 * Mobility Partner Registration — Multi-step form
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Building2, User, Shield, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";

const STEPS = ["Entreprise", "Chauffeur", "Véhicule", "Services"];

const VEHICLE_TYPES = [
  { value: "sedan", label: "Berline" },
  { value: "suv", label: "SUV" },
  { value: "minibus", label: "Minibus" },
  { value: "bus", label: "Bus" },
  { value: "van", label: "Van" },
  { value: "luxury", label: "Luxe" },
];

const SERVICE_TYPES = [
  { value: "shuttle", label: "Navette inter-ville" },
  { value: "private_driver", label: "Chauffeur privé" },
  { value: "group_mission", label: "Transport de groupe" },
  { value: "premium", label: "Premium / VIP" },
];

export default function MobilityRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Business
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("SN");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Step 2: Driver
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverLicense, setDriverLicense] = useState("");

  // Step 3: Vehicle
  const [vehicleType, setVehicleType] = useState("sedan");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [passengerCapacity, setPassengerCapacity] = useState("4");
  const [hasAC, setHasAC] = useState(false);

  // Step 4: Services
  const [selectedServices, setSelectedServices] = useState<string[]>(["shuttle"]);
  const [pricePerKm, setPricePerKm] = useState("");
  const [minimumFare, setMinimumFare] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: existing } = await supabase.from("mobility_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (existing) {
        toast({ title: "Profil existant", description: "Vous avez déjà un profil Mobility." });
        navigate("/mobility/apercu");
        return;
      }
      // Pre-fill from profile
      const { data: profile } = await supabase.from("profiles").select("full_name, phone, residence_city, country_code").eq("user_id", user.id).maybeSingle();
      if (profile) {
        setDriverName(profile.full_name || "");
        setPhone(profile.phone || "");
        setDriverPhone(profile.phone || "");
        setCity(profile.residence_city || "");
        setCountry(profile.country_code || "SN");
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Create mobility profile
      const { data: profile, error: profErr } = await supabase.from("mobility_profiles").insert({
        user_id: user.id,
        business_name: businessName || driverName,
        license_number: licenseNumber,
        base_city: city,
        base_country: country,
        mobility_types: selectedServices,
        price_per_km: pricePerKm ? parseFloat(pricePerKm) : null,
        minimum_fare: minimumFare ? parseFloat(minimumFare) : null,
        default_currency: "XOF",
      }).select("id").single();

      if (profErr) throw profErr;

      // Create vehicle
      const { error: vehErr } = await supabase.from("mobility_vehicles").insert({
        mobility_profile_id: profile.id,
        vehicle_type: vehicleType,
        brand: vehicleBrand,
        model: vehicleModel,
        year: vehicleYear ? parseInt(vehicleYear) : null,
        license_plate: vehiclePlate,
        passenger_capacity: parseInt(passengerCapacity) || 4,
        has_ac: hasAC,
      });

      if (vehErr) throw vehErr;

      // Also create gp_profiles entry for unified system
      const { data: existingGP } = await supabase.from("gp_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!existingGP) {
        await supabase.from("gp_profiles").insert({
          user_id: user.id,
          business_name: businessName || driverName,
          city,
          country_code: country,
          phone: phone || driverPhone,
          gp_type: "mobility",
        });
      }

      toast({ title: "Inscription réussie !", description: "Votre profil Mobility a été créé." });
      navigate("/mobility/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;

  const canNext = () => {
    if (step === 0) return (businessName || driverName) && city;
    if (step === 1) return driverName && driverPhone;
    if (step === 2) return vehiclePlate && vehicleBrand;
    if (step === 3) return selectedServices.length > 0;
    return true;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Mobility Partner</h1>
          <p className="text-xs text-muted-foreground">{STEPS[step]}</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{step + 1}/{STEPS.length}</span>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-4 pt-3">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-transport-mobility" : "bg-muted"}`} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {step === 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">Informations entreprise</h2>
                    <p className="text-xs text-muted-foreground">Ou identité personnelle</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div><Label>Nom / Entreprise *</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ex: Transport Express Dakar" /></div>
                  <div><Label>Ville *</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dakar" /></div>
                  <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221 77..." /></div>
                  <div><Label>N° Licence transport</Label><Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="Optionnel" /></div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">Chauffeur principal</h2>
                    <p className="text-xs text-muted-foreground">Informations du conducteur</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div><Label>Nom complet *</Label><Input value={driverName} onChange={e => setDriverName(e.target.value)} /></div>
                  <div><Label>Téléphone *</Label><Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} /></div>
                  <div><Label>N° Permis de conduire</Label><Input value={driverLicense} onChange={e => setDriverLicense(e.target.value)} /></div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <Car className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">Véhicule</h2>
                    <p className="text-xs text-muted-foreground">Détails du véhicule principal</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Type *</Label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Marque *</Label><Input value={vehicleBrand} onChange={e => setVehicleBrand(e.target.value)} placeholder="Toyota" /></div>
                    <div><Label>Modèle</Label><Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Hiace" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Année</Label><Input type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2022" /></div>
                    <div><Label>Places *</Label><Input type="number" value={passengerCapacity} onChange={e => setPassengerCapacity(e.target.value)} /></div>
                  </div>
                  <div><Label>Plaque *</Label><Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="DK-1234-AB" /></div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox checked={hasAC} onCheckedChange={v => setHasAC(!!v)} id="ac" />
                    <Label htmlFor="ac" className="text-sm">Climatisation</Label>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">Services proposés</h2>
                    <p className="text-xs text-muted-foreground">Sélectionnez vos activités</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {SERVICE_TYPES.map(st => (
                    <label key={st.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedServices.includes(st.value) ? "border-transport-mobility bg-transport-mobility/5" : "border-border"}`}>
                      <Checkbox
                        checked={selectedServices.includes(st.value)}
                        onCheckedChange={checked => {
                          setSelectedServices(prev =>
                            checked ? [...prev, st.value] : prev.filter(s => s !== st.value)
                          );
                        }}
                      />
                      <span className="font-medium text-sm">{st.label}</span>
                    </label>
                  ))}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div><Label>Prix / km (FCFA)</Label><Input type="number" value={pricePerKm} onChange={e => setPricePerKm(e.target.value)} placeholder="150" /></div>
                    <div><Label>Tarif minimum</Label><Input type="number" value={minimumFare} onChange={e => setMinimumFare(e.target.value)} placeholder="2000" /></div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border pb-safe">
        {step < STEPS.length - 1 ? (
          <Button className="w-full bg-transport-mobility hover:bg-transport-mobility/90" disabled={!canNext()} onClick={() => setStep(step + 1)}>
            Suivant <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button className="w-full bg-transport-mobility hover:bg-transport-mobility/90" disabled={submitting || !canNext()} onClick={handleSubmit}>
            {submitting ? <MiniLoader /> : <><Check className="w-4 h-4 mr-2" /> Créer mon profil</>}
          </Button>
        )}
      </div>
    </div>
  );
}
