/**
 * Mobility Partner Registration — Particulier vs Agence
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, Building2, User, Shield, ChevronLeft, ChevronRight, Check, MapPin, Clock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";

type ProviderType = "particulier" | "agence";

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

const DAYS_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface ShuttleRoute {
  origin: string;
  destination: string;
  time: string;
  price: string;
  seats: string;
  days: number[];
}

export default function MobilityRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Provider type
  const [providerType, setProviderType] = useState<ProviderType | null>(null);

  // Step 1: Business / Identity
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

  // Step 5 (Agence only): Shuttle routes
  const [shuttleRoutes, setShuttleRoutes] = useState<ShuttleRoute[]>([
    { origin: "", destination: "", time: "08:00", price: "", seats: "15", days: [1, 2, 3, 4, 5] },
  ]);

  const isAgence = providerType === "agence";
  const STEPS = isAgence
    ? ["Type", "Entreprise", "Chauffeur", "Véhicule", "Services", "Navettes"]
    : ["Type", "Identité", "Chauffeur", "Véhicule", "Services"];

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase.from("mobility_profiles").select("id").eq("user_id", user.id).maybeSingle();
        if (existing) {
          toast({ title: "Profil existant", description: "Vous avez déjà un profil Mobility." });
          navigate("/mobility/apercu");
          return;
        }
        const { data: profile } = await supabase.from("profiles").select("full_name, phone, residence_city, country_code").eq("user_id", user.id).maybeSingle();
        if (profile) {
          setDriverName(profile.full_name || "");
          setPhone(profile.phone || "");
          setDriverPhone(profile.phone || "");
          setCity(profile.residence_city || "");
          setCountry(profile.country_code || "SN");
        }
      }
      const entryCity = sessionStorage.getItem("entry_city");
      const entryPhone = sessionStorage.getItem("entry_phone");
      const entryCountry = sessionStorage.getItem("entry_country");
      if (entryCity && !city) setCity(entryCity);
      if (entryPhone && !phone) { setPhone(entryPhone); setDriverPhone(entryPhone); }
      if (entryCountry) {
        try { const parsed = JSON.parse(entryCountry); if (parsed?.code) setCountry(parsed.code); } catch {}
      }
      setLoading(false);
    };
    check();
  }, [navigate]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sessionStorage.setItem("pending_mobility_registration", "true");
        navigate("/auth?mode=signup");
        return;
      }

      // Create mobility profile
      const { data: profile, error: profErr } = await supabase.from("mobility_profiles").insert({
        user_id: user.id,
        business_name: businessName || driverName,
        license_number: licenseNumber || "PENDING",
        base_city: city,
        base_country: country,
        mobility_types: selectedServices as any,
        price_per_km: pricePerKm ? parseFloat(pricePerKm) : null,
        minimum_fare: minimumFare ? parseFloat(minimumFare) : null,
        default_currency: "XOF",
        provider_type: providerType || "particulier",
      }).select("id").single();

      if (profErr) throw profErr;

      // Create vehicle
      const { error: vehErr } = await supabase.from("mobility_vehicles").insert({
        mobility_profile_id: profile.id,
        vehicle_type: vehicleType as any,
        brand: vehicleBrand,
        model: vehicleModel || "N/A",
        year: vehicleYear ? parseInt(vehicleYear) : null,
        license_plate: vehiclePlate,
        passenger_capacity: parseInt(passengerCapacity) || 4,
        has_ac: hasAC,
      });

      if (vehErr) throw vehErr;

      // Create shuttle routes for agencies
      if (isAgence && shuttleRoutes.length > 0) {
        const validRoutes = shuttleRoutes.filter(r => r.origin && r.destination && r.price);
        if (validRoutes.length > 0) {
          const { error: routeErr } = await supabase.from("mobility_shuttle_routes").insert(
            validRoutes.map(r => ({
              mobility_profile_id: profile.id,
              origin_city: r.origin,
              destination_city: r.destination,
              departure_time: r.time,
              price_per_seat: parseFloat(r.price),
              total_seats: parseInt(r.seats) || 15,
              days_of_week: r.days,
            }))
          );
          if (routeErr) console.error("Route error:", routeErr);
        }
      }

      // Also create gp_profiles entry for unified system
      const { data: existingGP } = await supabase.from("gp_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!existingGP) {
        await supabase.from("gp_profiles").insert({
          user_id: user.id,
          business_name: businessName || driverName,
          city,
          country_code: country,
          phone: phone || driverPhone,
          gp_type: "mobility" as any,
        });
      }

      toast({ title: "Inscription réussie !", description: isAgence ? "Votre agence Mobility a été créée avec vos navettes." : "Votre profil Mobility a été créé." });
      navigate("/mobility/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;

  const canNext = () => {
    if (step === 0) return providerType !== null;
    if (step === 1) return (businessName || driverName) && city;
    if (step === 2) return driverName && driverPhone;
    if (step === 3) return vehiclePlate && vehicleBrand;
    if (step === 4) return selectedServices.length > 0;
    if (step === 5 && isAgence) return shuttleRoutes.some(r => r.origin && r.destination && r.price);
    return true;
  };

  const isLastStep = step === STEPS.length - 1;

  const addRoute = () => {
    setShuttleRoutes([...shuttleRoutes, { origin: "", destination: "", time: "08:00", price: "", seats: "15", days: [1, 2, 3, 4, 5] }]);
  };

  const removeRoute = (idx: number) => {
    if (shuttleRoutes.length > 1) setShuttleRoutes(shuttleRoutes.filter((_, i) => i !== idx));
  };

  const updateRoute = (idx: number, field: keyof ShuttleRoute, value: any) => {
    const updated = [...shuttleRoutes];
    (updated[idx] as any)[field] = value;
    setShuttleRoutes(updated);
  };

  const toggleDay = (routeIdx: number, day: number) => {
    const updated = [...shuttleRoutes];
    const days = updated[routeIdx].days;
    updated[routeIdx].days = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setShuttleRoutes(updated);
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
            {/* Step 0: Provider Type */}
            {step === 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <Bus className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">Type de transporteur</h2>
                    <p className="text-xs text-muted-foreground">Choisissez votre profil</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setProviderType("particulier")}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      providerType === "particulier"
                        ? "border-transport-mobility bg-transport-mobility/5"
                        : "border-border hover:border-transport-mobility/30"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-transport-mobility" />
                    </div>
                    <div>
                      <p className="font-bold">Particulier</p>
                      <p className="text-xs text-muted-foreground mt-1">Chauffeur individuel. Publiez vos trajets ponctuels et transportez des passagers.</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setProviderType("agence")}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      providerType === "agence"
                        ? "border-transport-mobility bg-transport-mobility/5"
                        : "border-border hover:border-transport-mobility/30"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-transport-mobility" />
                    </div>
                    <div>
                      <p className="font-bold">Agence / Compagnie</p>
                      <p className="text-xs text-muted-foreground mt-1">Proposez des navettes régulières avec horaires fixes et vendez des tickets par siège.</p>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Step 1: Business */}
            {step === 1 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">{isAgence ? "Informations entreprise" : "Identité"}</h2>
                    <p className="text-xs text-muted-foreground">{isAgence ? "Détails de votre agence" : "Informations personnelles"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div><Label>{isAgence ? "Nom de l'entreprise *" : "Nom / Prénom *"}</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={isAgence ? "Ex: Transport Express Dakar" : "Ex: Mamadou Diallo"} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Pays</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SN">Sénégal</SelectItem>
                          <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                          <SelectItem value="ML">Mali</SelectItem>
                          <SelectItem value="GN">Guinée</SelectItem>
                          <SelectItem value="BF">Burkina Faso</SelectItem>
                          <SelectItem value="CM">Cameroun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Ville *</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Dakar" /></div>
                  </div>
                  <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221 77..." /></div>
                  {isAgence && (
                    <div><Label>N° Licence / Autorisation transport *</Label><Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} placeholder="Obligatoire pour les agences" /></div>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Driver */}
            {step === 2 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">{isAgence ? "Chauffeur principal" : "Informations chauffeur"}</h2>
                    <p className="text-xs text-muted-foreground">Conducteur du véhicule</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div><Label>Nom complet *</Label><Input value={driverName} onChange={e => setDriverName(e.target.value)} /></div>
                  <div><Label>Téléphone *</Label><Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} /></div>
                  <div><Label>N° Permis de conduire</Label><Input value={driverLicense} onChange={e => setDriverLicense(e.target.value)} /></div>
                </div>
              </>
            )}

            {/* Step 3: Vehicle */}
            {step === 3 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <Bus className="w-6 h-6 text-transport-mobility" />
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
                    <div><Label>Nombre de sièges *</Label><Input type="number" value={passengerCapacity} onChange={e => setPassengerCapacity(e.target.value)} /></div>
                  </div>
                  <div><Label>Plaque d'immatriculation *</Label><Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="DK-1234-AB" /></div>
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox checked={hasAC} onCheckedChange={v => setHasAC(!!v)} id="ac" />
                    <Label htmlFor="ac" className="text-sm">Climatisation</Label>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Services */}
            {step === 4 && (
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

            {/* Step 5 (Agence): Shuttle Routes */}
            {step === 5 && isAgence && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div>
                    <h2 className="font-bold">Navettes régulières</h2>
                    <p className="text-xs text-muted-foreground">Configurez vos routes et horaires fixes</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {shuttleRoutes.map((route, idx) => (
                    <Card key={idx} className="border-transport-mobility/20">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Route {idx + 1}</span>
                          {shuttleRoutes.length > 1 && (
                            <button onClick={() => removeRoute(idx)} className="text-muted-foreground hover:text-destructive">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Origine *</Label><Input value={route.origin} onChange={e => updateRoute(idx, "origin", e.target.value)} placeholder="Dakar" /></div>
                          <div><Label>Destination *</Label><Input value={route.destination} onChange={e => updateRoute(idx, "destination", e.target.value)} placeholder="Saint-Louis" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div><Label>Heure départ</Label><Input type="time" value={route.time} onChange={e => updateRoute(idx, "time", e.target.value)} /></div>
                          <div><Label>Prix/siège *</Label><Input type="number" value={route.price} onChange={e => updateRoute(idx, "price", e.target.value)} placeholder="5000" /></div>
                          <div><Label>Sièges</Label><Input type="number" value={route.seats} onChange={e => updateRoute(idx, "seats", e.target.value)} /></div>
                        </div>
                        <div>
                          <Label className="text-xs">Jours de service</Label>
                          <div className="flex gap-1 mt-1">
                            {DAYS_LABELS.map((d, i) => (
                              <button
                                key={i}
                                onClick={() => toggleDay(idx, i + 1)}
                                className={`flex-1 py-1.5 rounded text-[10px] font-semibold transition-colors ${
                                  route.days.includes(i + 1)
                                    ? "bg-transport-mobility text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" className="w-full" onClick={addRoute}>
                    <Plus className="w-4 h-4 mr-2" /> Ajouter une route
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border pb-safe">
        {!isLastStep ? (
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
