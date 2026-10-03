# Refonte du parcours utilisateur FILAX (style Revolut / Wise)

## 1. Onboarding léger (nouvelle page d'accueil après le chargement)
- Remplacer le parcours d'inscription actuel (e-mail + KYC lourd) par une mini-page propre :
  - **Nom** (prénom + nom)
  - **Numéro de téléphone** avec indicatif pays (+243 par défaut) et **validation OTP** à 6 chiffres (mode simulation : code accepté localement, comme la double authentification existante — aucun SMS réel n'est envoyé)
  - **Choix de la langue** (Français / Anglais)
  - **Mode d'apparence** (Sombre / Clair)
- Aucun KYC au démarrage. Le KYC reste disponible depuis le Profil.
- L'ancienne page /inscription est simplifiée en conséquence ; la création du compte dans la base (profil, ID FILAX, compte Principal USD à 0) reste assurée par le trigger existant.

## 2. Accueil épuré
- Nouvel utilisateur : **un seul compte** « Principal » avec solde **0,00 $** — plus aucun faux montant ni multicompte de démonstration.
- Suppression des gros boutons d'action chargés ; la carte premium garde uniquement le **petit bouton « + »**.
- Le « + » ouvre un **bottom-sheet** moderne (glisse depuis le bas, poignée, floutage de l'arrière-plan) proposant :
  - **Créer un compte** (nom, devise)
  - **Créer une cagnotte / compte collectif** (nom, objectif, description, ajout de membres par username ou ID FILAX)
- Dépôt / Retrait / Transfert restent accessibles depuis la carte ou le bottom-sheet, mais **bloqués tant que le KYC n'est pas validé** (message clair renvoyant vers le Profil).

## 3. Profil — « Choisissez votre banque »
- Nouveau tiroir bien visible **au-dessus** des informations personnelles :
  - Liste des banques partenaires : **Equity BCDC, I&B RDC, Banque Centrale du Congo (BCC), Rawbank, TMB** (logo/initiales, nom, courte description)
  - Note explicative : les fonds sont sécurisés et hébergés par la banque choisie
  - **Toggle** d'acceptation des conditions
  - **Bouton bleu de validation** (inactif tant que le toggle n'est pas activé)
- Le choix est enregistré dans `profiles.partner_bank` (colonne existante).

## 4. Design system unifié des modales
- Un seul composant **BottomSheet** partagé (même rayon, poignée, animation, floutage, bouton principal bleu) utilisé par : dépôt, retrait, transfert, choix de banque, création de compte/cagnotte, objectifs.
- Les anciennes modales (`Modal` actuel) sont migrées vers ce composant pour une uniformité totale.

## 5. Données de démonstration
- Les comptes/objectifs/groupes fictifs affichés hors connexion sont réduits au minimum neutre (un compte à 0,00 $), pour coller à l'expérience « nouvel utilisateur ».

## Détails techniques
- Nouveau composant `src/components/filax/bottom-sheet.tsx` (basé sur le Dialog existant, ancré en bas, animation slide-up).
- `src/routes/inscription.tsx` réécrit en onboarding 4 champs ; suppression des étapes document/biométrie de ce parcours (le KYC vit dans `src/routes/profil.tsx`, déjà fonctionnel).
- `src/routes/index.tsx` : retrait des 3 gros boutons d'action, bottom-sheet « + », garde KYC sur dépôt/retrait/transfert (lecture de `profiles.kyc_status`).
- `src/routes/profil.tsx` : nouveau tiroir banque au-dessus des infos personnelles ; sauvegarde via `saveDbProfile`.
- `src/lib/filax-db.ts` : helper `setPartnerBank(userId, bank)`.
- Seed démo allégé dans `src/lib/filax-store.ts`.
- Traductions FR→EN ajoutées dans `src/lib/i18n.ts` pour tous les nouveaux textes.
