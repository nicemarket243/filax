# FILAX roadmap

## En cours — Refonte parcours utilisateur (style Revolut/Wise)
- [ ] Onboarding léger : nom, téléphone + OTP, langue, mode sombre/clair (pas de KYC au démarrage)
- [ ] Accueil : un seul compte par défaut à 0,00 $, suppression des boutons chargés, bouton « + » sur la carte
- [ ] Bottom-sheet « + » : créer un compte/cagnotte (nom, objectif, description, membres si collectif)
- [ ] Profil : tiroir « Choisissez votre banque » (Equity BCDC, I&B RDC, BCC, Rawbank, TMB) + note sécurité + toggle conditions + bouton bleu, au-dessus des infos personnelles
- [ ] KYC depuis le profil, requis avant dépôts/retraits
- [ ] Uniformité des modales : un seul design system moderne pour dépôt, retrait, transfert, banque, création

## Fait
- [x] Base de données : profils, banque partenaire, ID FILAX, PIN chiffré, comptes, transactions, micro-frais, groupes, notifications, temps réel
- [x] KYC : submit/validate, back-office admin (KYC, retraits de groupe, clients, gestion des groupes)
- [x] Accueil, Analyse, Groupes, Profil branchés sur la vraie base
- [x] Page publique /user/pseudo

## Plus tard
- [ ] Domaine filax.money : achat mis en pause par l'utilisateur
- [ ] Notifications temps réel dans l'app
- [ ] Boutons WhatsApp/SMS sur le profil
- [ ] Nettoyage des données de test (KYC fictif, groupe « Test Back-office », dépôt 100 $)
