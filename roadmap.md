# FILAX roadmap

## En cours — Accès public, banques et KYC
- [ ] Remplacer les FAQ bancaires inventées par les textes officiels fournis pour Equity BCDC, UBA RDC, BCC, Rawbank et TMB
- [ ] Rendre les tiroirs du Profil strictement exclusifs et fermés par défaut
- [ ] Créer une page d'accueil publique avec inscription et connexion par téléphone + code SMS
- [ ] Conserver et rattacher les profils FILAX existants après connexion téléphonique
- [ ] Afficher le statut KYC sur l'accueil et dans la fiche client du back-office
- [ ] Vérifier que le back-office affiche uniquement les vrais fichiers KYC téléversés, avec états de chargement/erreur
- [ ] Tester un parcours KYC complet avec fichiers explicitement marqués TEST, puis nettoyer les fichiers et données de test

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
