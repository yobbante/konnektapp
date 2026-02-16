import { motion } from "framer-motion";
import { Package, Plane, MapPin, Scale, Shield, ScanLine, CheckCircle, AlertTriangle, Wallet, FileText, BadgeCheck, User, Star, ArrowRight, Lock, Unlock, CreditCard, TrendingUp, TrendingDown, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TutorialMockState } from "@/lib/tutorial/types";

interface Props {
  screen: string;
  mockState: TutorialMockState;
  role: "client" | "gp";
  stepIndex: number;
}

export function TutorialMockScreen({ screen, mockState, role, stepIndex }: Props) {
  const wallet = role === "client" ? mockState.clientWallet : mockState.gpWallet;

  return (
    <div className="space-y-3">
      {/* ── Search Screen ── */}
      {screen === "search" && (
        <MockCard title="Rechercher un transporteur" icon={<MapPin className="w-4 h-4" />}>
          <div className="space-y-2">
            <MockInput label="Départ" value="Paris, France" />
            <MockInput label="Destination" value="Douala, Cameroun" />
            <div className="flex gap-2 mt-3">
              {["GP Bagages", "Routier", "Aérien"].map(t => (
                <Badge key={t} variant={t === "GP Bagages" ? "default" : "outline"} className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <MockOfferRow name="Amadou T." price="5 000" rating={4.8} badge="Pro" />
            <MockOfferRow name="Fatou K." price="4 500" rating={4.5} badge="Vérifié" />
            <MockOfferRow name="Ibrahim D." price="6 000" rating={4.2} badge="Basic" />
          </div>
        </MockCard>
      )}

      {/* ── Offer Detail ── */}
      {screen === "offer-detail" && (
        <MockCard title="Profil transporteur" icon={<User className="w-4 h-4" />}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Amadou T.</p>
              <div className="flex items-center gap-1.5">
                <Badge className="text-[9px] bg-green-500/10 text-green-600 border-0">Pro ⭐</Badge>
                <span className="text-[10px] text-muted-foreground">KTP 92/100</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Livraisons" value="245" />
            <MiniStat label="Note" value="4.8/5" />
            <MiniStat label="Tarif/kg" value="5 000 F" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Paris → Douala · Départ 20 fév · 15 kg dispo</p>
        </MockCard>
      )}

      {/* ── Weight Input ── */}
      {screen === "weight-input" && (
        <MockCard title="Poids du colis" icon={<Scale className="w-4 h-4" />}>
          <div className="text-center py-3">
            <div className="text-4xl font-bold text-foreground mb-1">3 <span className="text-lg text-muted-foreground">kg</span></div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm">3 kg × 5 000 FCFA =</span>
            </div>
            <p className="text-xl font-bold text-primary mt-1">15 000 FCFA</p>
          </div>
        </MockCard>
      )}

      {/* ── Payment ── */}
      {screen === "payment" && (
        <MockCard title="Paiement sécurisé" icon={<CreditCard className="w-4 h-4" />}>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Transport (3 kg)</span>
              <span>15 000 FCFA</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Assurance</span>
              <span>Incluse</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">15 000 FCFA</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-amber-600">Fonds bloqués en escrow jusqu'à la livraison</span>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Scan Deposit / Delivery ── */}
      {(screen === "scan-deposit" || screen === "scan-delivery") && (
        <MockCard
          title={screen === "scan-deposit" ? "Scan dépôt" : "Scan livraison"}
          icon={<ScanLine className="w-4 h-4" />}
        >
          <div className="text-center py-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-20 h-20 rounded-2xl border-2 border-dashed border-primary/40 flex items-center justify-center mx-auto mb-3"
            >
              <Camera className="w-8 h-8 text-primary/50" />
            </motion.div>
            <p className="text-xs text-muted-foreground">
              {screen === "scan-deposit" ? "Scannez le QR du colis pour confirmer la collecte" : "Scannez pour confirmer la livraison au destinataire"}
            </p>
            <Badge variant="outline" className="mt-2 text-[10px]">
              {mockState.orderStatus === "collecte" ? "✅ Collecté" : mockState.orderStatus === "livre" ? "✅ Livré" : "⏳ En attente"}
            </Badge>
          </div>
        </MockCard>
      )}

      {/* ── Tracking ── */}
      {screen === "tracking" && (
        <MockCard title="Suivi en temps réel" icon={<Plane className="w-4 h-4" />}>
          <div className="space-y-2">
            {[
              { label: "Commande confirmée", done: true },
              { label: "Colis collecté", done: mockState.orderStatus !== "pending" },
              { label: "En transit", done: ["transit", "arrive", "livre"].includes(mockState.orderStatus) },
              { label: "Arrivé à destination", done: ["arrive", "livre"].includes(mockState.orderStatus) },
              { label: "Livré", done: mockState.orderStatus === "livre" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-500" : "bg-muted"}`}>
                  {step.done ? <CheckCircle className="w-3 h-3 text-white" /> : <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                </div>
                <span className={`text-xs ${step.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </MockCard>
      )}

      {/* ── Confirm Reception ── */}
      {screen === "confirm-reception" && (
        <MockCard title="Confirmer la réception" icon={<CheckCircle className="w-4 h-4" />}>
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-sm font-medium mb-1">Colis reçu en bon état ?</p>
            <p className="text-[10px] text-muted-foreground">Cette action libère les fonds au transporteur</p>
            <div className="flex items-center gap-1.5 mt-3 bg-green-500/5 border border-green-500/10 rounded-lg p-2 justify-center">
              <Unlock className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] text-green-600">Escrow → Payout GP automatique</span>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Ledger Result ── */}
      {screen === "ledger-result" && (
        <MockCard title="Détail de la transaction" icon={<FileText className="w-4 h-4" />}>
          <div className="space-y-1.5">
            {mockState.ledger.length > 0 ? (
              mockState.ledger.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    entry.type === "payout" ? "bg-green-500" :
                    entry.type === "commission" ? "bg-amber-500" :
                    entry.type === "debt_deduction" ? "bg-red-500" :
                    "bg-primary"
                  }`} />
                  <span className="text-[11px] text-muted-foreground flex-1 truncate">{entry.description}</span>
                  <span className={`text-[11px] font-medium ${
                    entry.type === "payout" || entry.type === "refund" ? "text-green-600" : "text-foreground"
                  }`}>
                    {entry.type === "payout" || entry.type === "refund" ? "+" : "−"}{entry.amount.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground">Les écritures apparaîtront ici après les actions</p>
              </div>
            )}
          </div>
        </MockCard>
      )}

      {/* ── Wallet Overview ── */}
      {screen === "wallet-overview" && (
        <MockCard title={`Wallet ${role === "client" ? "Client" : "GP"}`} icon={<Wallet className="w-4 h-4" />}>
          <div className="text-center py-2">
            <p className="text-3xl font-bold">{wallet.balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">FCFA disponibles</p>
            {wallet.escrow_balance > 0 && (
              <div className="flex items-center gap-1 justify-center mt-2">
                <Lock className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600">{wallet.escrow_balance.toLocaleString()} en escrow</span>
              </div>
            )}
          </div>
        </MockCard>
      )}

      {/* ── Escrow Detail ── */}
      {screen === "escrow-detail" && (
        <MockCard title="Escrow Konnekt" icon={<Shield className="w-4 h-4" />}>
          <div className="text-center py-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 ${
              mockState.escrow.status === "locked" ? "bg-amber-500/10" :
              mockState.escrow.status === "released" ? "bg-green-500/10" : "bg-muted"
            }`}>
              {mockState.escrow.status === "locked" ? <Lock className="w-6 h-6 text-amber-500" /> :
               mockState.escrow.status === "released" ? <Unlock className="w-6 h-6 text-green-500" /> :
               <Shield className="w-6 h-6 text-muted-foreground" />}
            </div>
            <p className="text-2xl font-bold">{mockState.escrow.amount.toLocaleString()} FCFA</p>
            <Badge variant="outline" className="mt-2 text-[10px]">
              {mockState.escrow.status === "locked" ? "🔒 Fonds verrouillés" :
               mockState.escrow.status === "released" ? "✅ Fonds libérés" : "⏳ En attente"}
            </Badge>
          </div>
        </MockCard>
      )}

      {/* ── Supplement Alert ── */}
      {screen === "supplement-alert" && (
        <MockCard title="Ajustement de poids" icon={<Scale className="w-4 h-4" />} accent="amber">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Poids estimé</span>
              <span>5 kg</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Poids réel</span>
              <span className="text-amber-600 font-medium">6 kg</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Supplément</span>
              <span className="font-bold text-amber-600">+5 000 FCFA</span>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 mt-1">
              <p className="text-[10px] text-amber-700">⚠️ Le client doit accepter le supplément avant la prise en charge.</p>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Dispute Form ── */}
      {screen === "dispute-form" && (
        <MockCard title="Signaler un problème" icon={<AlertTriangle className="w-4 h-4" />}>
          <div className="space-y-2">
            <MockInput label="Type de litige" value="Colis endommagé" />
            <MockInput label="Description" value="Le colis est arrivé avec l'emballage déchiré…" />
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground">⏱ Le transporteur a 72h pour répondre. En absence de réponse → escalade automatique à l'admin.</p>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Declare Flight ── */}
      {screen === "declare-flight" && (
        <MockCard title="Déclarer un voyage" icon={<Plane className="w-4 h-4" />}>
          <div className="space-y-2">
            <MockInput label="Trajet" value="Paris → Douala" />
            <MockInput label="Date de départ" value="20 février 2026" />
            <MockInput label="Capacité" value="20 kg disponibles" />
            <MockInput label="Tarif" value="5 000 FCFA / kg" />
          </div>
        </MockCard>
      )}

      {/* ── Accept Mission ── */}
      {screen === "accept-mission" && (
        <MockCard title="Nouvelle demande" icon={<Package className="w-4 h-4" />} accent="primary">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">Marie L. souhaite envoyer</p>
                <p className="text-[10px] text-muted-foreground">3 kg · Paris → Douala</p>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-bold">15 000 FCFA</span>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">
              <p className="text-[10px] text-amber-700">⏱ Vous avez 24h pour accepter cette mission.</p>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Commission Calc ── */}
      {screen === "commission-calc" && (
        <MockCard title="Commission Konnekt" icon={<TrendingUp className="w-4 h-4" />}>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">0-49 livraisons</p>
                <p className="text-sm font-bold">5%</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">50-149</p>
                <p className="text-sm font-bold">4%</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-2 border border-primary/10">
                <p className="text-[10px] text-primary">150+</p>
                <p className="text-sm font-bold text-primary">3%</p>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Revenu brut</span>
              <span>15 000 FCFA</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Commission (5%)</span>
              <span className="text-amber-600">−750 FCFA</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Net</span>
              <span className="text-green-600">14 250 FCFA</span>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Debt Calc ── */}
      {screen === "debt-calc" && (
        <MockCard title="Système de dette" icon={<TrendingDown className="w-4 h-4" />} accent="red">
          <div className="space-y-2">
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Dette actuelle</p>
              <p className="text-xl font-bold text-red-500">{mockState.debt.balance.toLocaleString()} FCFA</p>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payout brut</span>
                <span>15 000 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission (5%)</span>
                <span className="text-amber-600">−750 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Déduction dette</span>
                <span className="text-red-500">−{Math.min(mockState.debt.balance, 2000).toLocaleString()} FCFA</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold text-sm">
                <span>Net reçu</span>
                <span className="text-green-600">{(15000 - 750 - Math.min(mockState.debt.balance, 2000)).toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── Manual Parcel ── */}
      {screen === "manual-parcel" && (
        <MockCard title="Colis manuel" icon={<FileText className="w-4 h-4" />} accent="amber">
          <div className="space-y-2">
            <MockInput label="Destinataire" value="Jean D." />
            <MockInput label="Poids" value="5 kg" />
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 space-y-1">
              <p className="text-[10px] text-amber-700 font-medium">⚠️ Colis hors plateforme :</p>
              <p className="text-[10px] text-amber-700">• Commission fixe 3%</p>
              <p className="text-[10px] text-amber-700">• Pas d'assurance Konnekt</p>
              <p className="text-[10px] text-amber-700">• Pas de protection litige</p>
              <p className="text-[10px] text-amber-700">• Ne compte pas pour le KTP</p>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── KYC Upload ── */}
      {screen === "kyc-upload" && (
        <MockCard title="Vérification d'identité" icon={<BadgeCheck className="w-4 h-4" />}>
          <div className="text-center py-3">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-7 h-7 text-primary/40" />
            </div>
            <p className="text-xs text-muted-foreground">Téléchargez votre document d'identité</p>
            <div className="flex gap-2 justify-center mt-3">
              <Badge variant="outline" className="text-[10px]">Passeport</Badge>
              <Badge variant="outline" className="text-[10px]">CNI</Badge>
            </div>
          </div>
        </MockCard>
      )}

      {/* ── QR Scan ── */}
      {screen === "qr-scan" && (
        <MockCard title="Scanner QR" icon={<ScanLine className="w-4 h-4" />}>
          <div className="text-center py-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="w-24 h-24 rounded-2xl border-2 border-primary/30 flex items-center justify-center mx-auto mb-3 bg-primary/5"
            >
              <div className="grid grid-cols-3 gap-1">
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${i % 3 === 0 ? "bg-primary/60" : "bg-primary/20"}`} />
                ))}
              </div>
            </motion.div>
            <p className="text-xs text-muted-foreground">Pointez la caméra vers un QR Konnekt</p>
          </div>
        </MockCard>
      )}

      {/* ── Badge Info ── */}
      {screen === "badge-info" && (
        <MockCard title="Niveaux de confiance" icon={<Star className="w-4 h-4" />}>
          <div className="space-y-2">
            {[
              { level: "Basic", range: "< 75", color: "text-muted-foreground", bg: "bg-muted" },
              { level: "Vérifié", range: "75-89", color: "text-blue-600", bg: "bg-blue-500/10" },
              { level: "Pro", range: "90+", color: "text-green-600", bg: "bg-green-500/10" },
            ].map(b => (
              <div key={b.level} className={`flex items-center gap-2.5 ${b.bg} rounded-lg p-2`}>
                <BadgeCheck className={`w-4 h-4 ${b.color}`} />
                <div className="flex-1">
                  <span className={`text-xs font-semibold ${b.color}`}>{b.level}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">Score {b.range}</span>
                </div>
              </div>
            ))}
          </div>
        </MockCard>
      )}

      {/* ── Withdrawal ── */}
      {screen === "withdrawal" && (
        <MockCard title="Retrait" icon={<Wallet className="w-4 h-4" />}>
          <div className="text-center py-3">
            <p className="text-2xl font-bold">{wallet.balance.toLocaleString()} FCFA</p>
            <p className="text-xs text-muted-foreground mt-1">Disponible pour retrait</p>
            <MockInput label="Montant" value={`${wallet.balance.toLocaleString()} FCFA`} />
            <MockInput label="Via" value="Mobile Money" />
          </div>
        </MockCard>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────

function MockCard({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string }) {
  return (
    <Card className={`border-${accent || "border"}/20 bg-card/95 backdrop-blur-sm shadow-lg`}>
      <CardContent className="p-3.5">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-primary">{icon}</div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
          <Badge variant="outline" className="text-[8px] px-1 py-0 ml-auto border-amber-500/30 text-amber-500">DÉMO</Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function MockInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function MockOfferRow({ name, price, rating, badge }: { name: string; price: string; rating: number; badge: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{name}</p>
        <div className="flex items-center gap-1">
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] text-muted-foreground">{rating}</span>
          <Badge variant="outline" className="text-[8px] ml-1 px-1 py-0">{badge}</Badge>
        </div>
      </div>
      <span className="text-xs font-bold">{price} F/kg</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold">{value}</p>
    </div>
  );
}
