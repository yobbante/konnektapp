Ajouter deux nouvelles sections à la landing page `src/pages/KonnektLanding.tsx`, dans le style Konnekt existant (teal #3DAA8A / dark #0D1B2A, font Inter, cards radius 16px, ombre douce).

## Section « Télécharger l'app »
- Placée après la section Témoignages, avant le CTA final.
- Fond blanc (ou gris très clair pour alterner).
- Layout 2 colonnes desktop / 1 colonne mobile :
  - Gauche : badge « APPLICATION », titre H2 « Konnekt dans votre poche », corps gris, et 2 boutons de téléchargement (App Store + Google Play) en pills sombres.
  - Droite : mockup téléphone 3D incliné montrant l'écran de l'app (réutilise le style du mockup hero, écran dashboard/missions).
- Fond décoratif : cercle gradient teal léger derrière le mockup.

## Section FAQ
- Placée après « Télécharger l'app », avant le CTA final.
- Fond gris très clair (#F8F9FA).
- Badge « FAQ » en lettres espacées teal + titre H2 centré « Questions fréquentes ».
- Liste de 5-6 questions/réponses en accordéon (composant `Accordion` shadcn déjà disponible), cards blanches avec ombre douce.
- Questions proposées (modifiables) :
  - Comment fonctionne Konnekt ?
  - Combien ça coûte de s'inscrire ?
  - Quand suis-je payé ?
  - Comment recevoir mes missions ?
  - Mes paiements sont-ils sécurisés ?
  - Sur quelles destinations puis-je transporter ?

## Détails techniques
- Modifier uniquement `src/pages/KonnektLanding.tsx` (ne pas toucher aux autres pages).
- Ajouter les données (tableau FAQ, liens stores) en haut du fichier.
- Importer `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` depuis `@/components/ui/accordion`.
- Garder le bouton WhatsApp flottant global inchangé.
- Les liens stores pointeront vers des placeholders (`#`) tant que les vraies URLs ne sont pas fournies.

Souhaitez-vous de vraies URLs App Store / Google Play, ou des liens placeholder pour le moment ?