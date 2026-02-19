# 📖 Konnekt - Documentation Scan & QR Codes

> Version: 2.0 | Dernière mise à jour: 2026-02-19

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Fichiers clés](#2-fichiers-clés)
3. [Moteur de scan (2 phases)](#3-moteur-de-scan)
4. [Types de QR codes](#4-types-de-qr-codes)
5. [Flux financier (Escrow)](#5-flux-financier-escrow)
6. [Interfaces par rôle](#6-interfaces-par-rôle)
7. [Guide de modification](#7-guide-de-modification)

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────┐
│              POINTS D'ENTRÉE                     │
│  ClientScanSheet │ GPScanSheet │ /scan page      │
└────────────┬────────────┬──────────┬─────────────┘
             │            │          │
             ▼            ▼          ▼
┌─────────────────────────────────────────────────┐
│           SCAN HEART (ScanHeart.tsx)              │
│  ┌──────────────┐  ┌──────────────────┐          │
│  │ QRCamera     │  │ Saisie manuelle  │          │
│  │ Scanner      │  │ (CMD-xxx, etc.)  │          │
│  └──────┬───────┘  └────────┬─────────┘          │
└─────────┼───────────────────┼────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────┐
│         useScanEngine.ts (Hook React)            │
│  • resolve(scannedData, role)                    │
│  • executeAction(action, orderId, data)          │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────┐
│    scan-engine/index.ts (Edge Function)          │
│  ┌─────────────┐  ┌──────────────────┐          │
│  │ RESOLVE      │  │ EXECUTE          │          │
│  │ Identifier   │  │ Mutations DB     │          │
│  │ + Action     │  │ Escrow, Status   │          │
│  └─────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────┘
```

**Principe fondamental** : AUCUNE mutation DB depuis le frontend. Tout passe par le backend scan-engine.

---

## 2. Fichiers clés

### Frontend

| Fichier | Rôle | Modifier quand... |
|---------|------|-------------------|
| `src/components/scan/ScanHeart.tsx` | Cerveau unifié scan | Ajouter un nouveau mode de scan |
| `src/components/scan/ClientScanSheet.tsx` | UI scan client (solde, onglets) | Modifier l'expérience scan client |
| `src/components/scan/GPScanSheet.tsx` | UI scan GP (actions opérationnelles) | Modifier les actions GP |
| `src/components/scan/ScanColisTab.tsx` | Onglet "Mes Colis" | Modifier l'affichage des colis |
| `src/components/scan/ScanQRTab.tsx` | Onglet "Mon QR" identité | Modifier le QR identité |
| `src/components/scan/ScanResultClient.tsx` | Résultat scan côté client | Modifier ce que le client voit après scan |
| `src/components/scan/ScanResultGP.tsx` | Résultat scan côté GP | Modifier ce que le GP voit après scan |
| `src/components/gp/QRCameraScanner.tsx` | Composant caméra (html5-qrcode) | Changer le comportement caméra |
| `src/hooks/useScanEngine.ts` | Hook React → backend | Ajouter des actions frontend |
| `src/lib/scanEngine.ts` | Client-side scan engine logic | Modifier le parsing des données |

### Backend (Edge Functions)

| Fichier | Rôle | Modifier quand... |
|---------|------|-------------------|
| `supabase/functions/scan-engine/index.ts` | Moteur RESOLVE + EXECUTE | Ajouter des actions backend |
| `supabase/functions/release-funds/index.ts` | Distribution fonds GP/Konnekt | Modifier la répartition financière |
| `supabase/functions/lock-escrow/index.ts` | Blocage fonds escrow | Modifier le processus de paiement |
| `supabase/functions/confirm-delivery-release/index.ts` | Release par code livraison | Modifier l'alternative au scan |

### QR Generators

| Fichier | Rôle |
|---------|------|
| `src/components/ui/HeaderQRBadge.tsx` | QR identité dans le header |
| `src/components/client/OrderQRCode.tsx` | QR par commande (page dédiée) |
| `src/components/logistics/LogisticsLabelGenerator.tsx` | PDF A5 avec QR + barcode |
| `src/pages/OrderQRCode.tsx` | Page `/order/:orderId/qrcode` |

---

## 3. Moteur de scan

### Phase 1 : RESOLVE

```typescript
// Appel depuis le frontend
const { response, action } = await resolve(scannedData, userRole);

// scannedData peut être :
// "CMD-00042"      → Commande
// "USER:abc-123"   → Identité client
// "GP:xyz-789"     → Identité GP
// "https://..."    → Lien externe
```

**Le backend retourne :**
```typescript
interface ScanEngineResponse {
  status: "found" | "not_found" | "error" | "executed" | "failed";
  type: "order" | "user" | "gp" | "external";
  message: string;
  data?: any; // Détails commande, profil, etc.
  allowed_actions?: string[]; // Actions possibles selon le rôle
}
```

**Le hook calcule l'action frontend :**
```typescript
interface ScanEngineAction {
  type: "navigate" | "toast" | "external";
  target?: string;  // URL ou route
  data?: any;       // Données pour toast
}
```

### Phase 2 : EXECUTE

```typescript
// Appel depuis le frontend après confirmation utilisateur
const result = await executeAction("checkin", orderId, { weight: 5.2 });

// Actions disponibles :
type ExecuteAction =
  | "checkin"          // GP enregistre le dépôt du colis
  | "weight_adjust"    // GP corrige le poids
  | "release_escrow"   // Libérer les fonds
  | "confirm_delivery" // Confirmer la livraison
```

---

## 4. Types de QR codes

### QR Identité (Utilisateur)

```
Format: USER:{user_id}
Exemple: USER:a1b2c3d4-e5f6-7890-abcd-ef1234567890

Généré par: HeaderQRBadge.tsx, ScanQRTab.tsx
Scanné par: GP (pour identifier un client lors d'un dépôt)
```

### QR Identité (GP/Transporteur)

```
Format: GP:{gp_id}
Exemple: GP:x9y8z7w6-v5u4-3210-fedc-ba0987654321

Généré par: HeaderQRBadge.tsx, ScanQRTab.tsx
Scanné par: Client (pour voir le profil public du GP)
```

### QR Commande

```
Format: CMD-{order_number}
Exemple: CMD-00042

Généré par: OrderQRCode.tsx, LogisticsLabelGenerator.tsx
Scanné par: GP (dépôt, livraison), Agent terrain
```

### Label Logistique (PDF A5)

```
Contenu: QR Code + Barcode CODE128
Format: PDF A5
Données: Nom client, GP, poids, destination, mentions légales

Généré par: LogisticsLabelGenerator.tsx
Usage: Collé physiquement sur le colis
OBLIGATOIRE avant validation finale de la commande
```

---

## 5. Flux financier (Escrow)

### Étape 1 : Booking

```
SmartBookingPage.tsx
├── Charge commission_rate depuis gp_wallets
├── Calcule commission_amount = total × rate / 100
└── INSERT orders { ..., commission_amount }
```

### Étape 2 : Paiement (Lock)

```
lock-escrow (Edge Function)
├── INSERT escrow_transactions { status: 'held', amount }
├── UPDATE client_wallets.escrow_balance += amount
└── UPDATE orders.escrow_status = 'held'
```

### Étape 3 : Release (2 chemins)

**Chemin A : Scan QR**
```
GP scanne CMD-xxxxx
→ scan-engine RESOLVE → identifie la commande
→ scan-engine EXECUTE "release_escrow"
→ Appelle release-funds
```

**Chemin B : Code de livraison (RECOMMANDÉ)**
```
Client/GP/Destinataire saisit le delivery_code
→ confirm-delivery-release vérifie le code
→ Appelle release-funds
→ Page: /confirm-reception
```

### Étape 4 : Distribution

```
release-funds (Edge Function)
├── commission = order.commission_amount || calcul fallback
├── netGP = total - commission
├── UPDATE gp_wallets.balance += netGP
├── INSERT konnekt_ledger { type: 'commission', amount: commission }
├── UPDATE escrow_transactions.status = 'released'
└── UPDATE orders.status = 'delivered'
```

### Règle importante

- **Frais client : 0% jusqu'au 31/01/2027**
- **Commission GP** : Variable par GP (stockée dans `gp_wallets.commission_rate`)
- **Commission JAMAIS visible côté client**

---

## 6. Interfaces par rôle

### Client - 3 onglets

| Onglet | Composant | Contenu |
|--------|-----------|---------|
| Scanner | ScanHeart | Caméra + saisie manuelle |
| Mon QR | ScanQRTab | QR identité `USER:{id}` |
| Mes Colis | ScanColisTab | Liste colis + QR individuels `CMD-xxx` |

**Actions client après scan :**
- Voir profil GP
- Suivre commande
- Payer supplément → `/pay-supplement`
- Confirmer réception → `/confirm-reception`

### GP - 3 onglets

| Onglet | Composant | Contenu |
|--------|-----------|---------|
| Scanner | ScanHeart | Caméra + saisie manuelle |
| Mon QR | ScanQRTab | QR pro `GP:{id}` |
| Opérations | ScanColisTab | Actions rapides par colis |

**Actions GP après scan :**
- Enregistrer dépôt → `/gp/colis`
- Confirmer livraison / Libérer fonds → `/confirm-reception`
- Voir profil public → `/gp/profil-public`

### Agent Terrain

- Accède via `/scan` (standalone)
- Scanne les labels PDF (QR + barcode)
- Actions : vérification statut, mise à jour logistique

---

## 7. Guide de modification

### "Je veux ajouter une nouvelle action de scan"

1. **Backend** : `supabase/functions/scan-engine/index.ts`
   - Ajouter le cas dans la phase EXECUTE
   - Définir la logique DB

2. **Types** : `src/lib/scanEngine.ts`
   - Ajouter le type dans `ExecuteAction`

3. **Frontend** : `src/components/scan/ScanResultGP.tsx` ou `ScanResultClient.tsx`
   - Ajouter le bouton d'action UI

### "Je veux modifier ce qui se passe quand on scanne un QR"

1. **Parsing** : `src/lib/scanEngine.ts` → `KonnektScanEngine.resolve()`
2. **Backend** : `supabase/functions/scan-engine/index.ts` → Phase RESOLVE
3. **Action** : `src/hooks/useScanEngine.ts` → `handleAction()`

### "Je veux modifier le design du QR"

- **QR identité** : `src/components/ui/HeaderQRBadge.tsx`
- **QR commande** : `src/components/client/OrderQRCode.tsx`
- **Label PDF** : `src/components/logistics/LogisticsLabelGenerator.tsx`

### "Je veux modifier le flux financier"

1. **Commission au booking** : `src/pages/SmartBookingPage.tsx`
2. **Lock escrow** : `supabase/functions/lock-escrow/index.ts`
3. **Release fonds** : `supabase/functions/release-funds/index.ts`
4. **Code livraison** : `supabase/functions/confirm-delivery-release/index.ts`

### "Je veux modifier les onglets scan"

- **Structure onglets** : `src/components/scan/ClientScanSheet.tsx` ou `GPScanSheet.tsx`
- **Contenu onglet Scanner** : `src/components/scan/ScanHeart.tsx`
- **Contenu onglet Mon QR** : `src/components/scan/ScanQRTab.tsx`
- **Contenu onglet Colis** : `src/components/scan/ScanColisTab.tsx`

---

## Annexe : Dépendances

- `html5-qrcode` : Scanner caméra QR
- `react-qr-code` : Génération QR codes
- `jsbarcode` : Génération barcodes CODE128
- `jspdf` : Génération PDF labels

---

*Document généré pour Konnekt - Ne pas partager en dehors de l'équipe*
