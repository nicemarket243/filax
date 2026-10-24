# FILAX roadmap

## 24 oct. — Tunnels d'inscription et de connexion
- [x] Inscription directe : nom, post-nom, téléphone OU e-mail, sans ID ni code, ID FILAX généré automatiquement
- [x] Connexion par téléphone, ID FILAX ou e-mail avec fenêtre de choix du canal et code à 6 chiffres
- [x] Reconnaissance d'appareil : reprise du profil en un clic, mémorisation limitée à 1 mois, jamais de code
- [x] Tester les deux parcours sur des comptes de test sans toucher au compte vitrine (entrée directe, ID généré, doublons refusés, choix du canal, reprise en un clic, session persistante ; 9 tests unitaires)


## 24 oct. — PDF dans FAQ / Documents
- [x] Lister le mémorandum disponible avec consultation, téléchargement, copie et partage
- [x] Vérifier le PDF téléchargé (15 pages), les liens WhatsApp/e-mail, la copie du lien et le passage du fichier au partage natif avec activation ; téléphone sans débordement, aucune écriture financière ni modification de session utilisateur

## 24 oct. — Parcours de transactions sécurisés
- [x] Dépôt : téléphone et montant, confirmation simulée sans PIN ni crédit
- [x] Retrait : destination, montant, PIN puis récapitulatif final sans envoi externe non configuré
- [x] Transfert interne : destinataire résolu, montant et confirmation finale, sans CVV
- [x] Tester les étapes sans mouvement financier ni changement de session (4 tests de règles et navigateur connecté, PIN/annuaire remplacés par réponses de test ; validation financière finale non exécutée)

## 14 oct. — Analyse, pays et cadrage Groupes
- [x] Unifier le dégradé premium Accueil/Analyse et la courbe bleue au repos, rouge/verte au toucher (comparaison des dégradés et des deux couleurs vérifiée)
- [x] Ajouter le choix de 70 pays par région, RDC en vedette et détection automatique non bloquante (IP réelle, repli RDC, choix manuel et format international testés sans SMS)
- [x] Agrandir la bannière de 0,5 cm et contrôler/remplacer les visuels mal cadrés (trois nouveaux panoramas illustratifs ; hauteur mesurée 148,89 px)
- [x] Vérifier les écrans et interactions sans changer les données ni déconnecter le compte vitrine (session restaurée uniquement dans le navigateur de test ; aucun mouvement financier)

## 9 oct. — Fenêtre FILAX et support
- [x] Remplacer la fenêtre du logo par cinq tiroirs détaillés avec guide visuel et liens de support
- [x] Ajouter un assistant IA flottant, conversation unique sans conservation, 1 100 formulations de questions-réponses couvrant 50 sujets
- [x] Vérifier ouverture, fermeture, liens et conversation réelle sans modifier les comptes

## En cours — Tiroirs et Analyse
- [x] Fermeture globale exclusive des tiroirs, au clic extérieur et changement d’onglet
- [x] Objectifs Généraux de tous les comptes avec graphique détaillé
- [x] Historique complet de tous les comptes sans limite de période
- [x] Vérifier le parcours connecté et préserver les données financières

## En cours — Visuels et sous-comptes
- [x] Bibliothèque de 24 photos et suppression de la ligne
- [x] Création rattachée à un Principal, objectif, code dédié et image persistante
- [x] Appui long d’une seconde et changement de photo persistant
- [x] Protection des sorties par code et vérifications de bout en bout

## En cours — Accès public, banques et KYC
- [x] Remplacer les FAQ bancaires inventées par les textes officiels fournis pour Equity BCDC, UBA RDC, BCC, Rawbank et TMB
- [x] Rendre les tiroirs du Profil strictement exclusifs et fermés par défaut
- [x] Créer une page d'accueil publique avec inscription et connexion par téléphone + code SMS
- [x] Conserver et rattacher les profils FILAX existants après connexion téléphonique
- [x] Afficher le statut KYC sur l'accueil et dans la fiche client du back-office
- [x] Vérifier que le back-office affiche uniquement les vrais fichiers KYC téléversés, avec états de chargement/erreur
- [x] Tester un parcours KYC complet avec fichiers explicitement marqués TEST, puis nettoyer les fichiers et données de test

## Fait
- [x] Base de données : profils, banque partenaire, ID FILAX, PIN chiffré, comptes, transactions, micro-frais, groupes, notifications, temps réel
- [x] KYC : submit/validate, back-office admin (KYC, retraits de groupe, clients, gestion des groupes)
- [x] Accueil, Analyse, Groupes, Profil branchés sur la vraie base
- [x] Page publique /user/pseudo

## Plus tard
- [ ] Domaine filax.money : achat mis en pause par l'utilisateur
- [x] Notifications temps réel dans l'app
- [x] Boutons WhatsApp/SMS sur le profil
- [x] Nettoyage du groupe « Test Back-office »

## Fait — 9 oct.
- [x] Notification de dépôt en haut de l'écran (testée avec 1 $)
- [x] Page Vérification d'identité
- [x] Page membres de groupe + solde partagé
- [x] Détail des opérations dans l'historique
- [x] Back-office : comptes FILAX et notifications
- [ ] Compte admin séparé — attend l'e-mail de l'utilisateur

## 9 oct. — Analyse, groupes, profil
- [x] Répartition par moyen en tiroir
- [x] Groupes : badge jours restants retiré, photos membres, historique des contributions, visuel identique aux cartes
- [x] Profil : menu de partage, copie d'ID, tiroir unique « Paramètres du compte »
- [x] Finalisation : KYC 3 états, dépôts en attente, anti-doublon, sous-comptes bloqués (7 j–5 ans, max 10), comptes principaux permanents, limite d'essais du code, back-office Opérations & audit
- [x] IBA retirée de la liste des banques (texte officiel jamais fourni)
- [x] Formulaire client « Signaler » dans Historique → arrive dans Litiges du back-office
- [x] « Enregistrer vos informations » après connexion, effacé automatiquement après 1 mois
- [x] Compte test FLX-12756340 créé sans SMS, parcours complet vérifié (KYC vert, dépôt)

## 14 oct. — Mis de côté par l'utilisateur, à faire plus tard
- [ ] Invitation admin : attend l'adresse e-mail du titulaire, qui choisira lui-même son mot de passe
- [ ] Vérification d'identité automatique : attend le choix et la clé du prestataire (saisie dans une fenêtre sécurisée)
- [ ] Paiements réels Mobile Money / banque : attend le choix et la clé du prestataire (saisie dans une fenêtre sécurisée)
- [ ] Groupes affichés comme cartes sur l'accueil (max 10)

## 14 oct. — Mission finalisée (logique métier)
- [x] Centre de notifications style iOS (cartes translucides, badge, heure relative)
- [x] Seuils minima dépôts/retraits carte et Mobile Money (écran + base)
- [x] Transfert vers un vrai membre par ID FILAX, téléphone ou e-mail
- [x] KYC bleu : délai 24 h à 48 h affiché
- [ ] Code OTP 6 chiffres par SMS/e-mail pour les transferts + blocage 48 h : attend un prestataire SMS/e-mail
- [ ] Dépôts par carte réels : attend le prestataire de paiement (aucune donnée de carte stockée)

## 14 oct. — Mission « Finalisation intégrale »
- [x] KYC : deux captures par caméra en direct uniquement (selfie de face + preuve manuscrite « FILAX RDC » et date), visibles dans le back-office
- [x] Signature « Alvine l'Entrepreneur » dans le mémorandum PDF
- [x] Code PIN 4 chiffres obligatoire pour retraits et transferts (fenêtre sécurisée, création si absent)
- [x] Notifications de réussite / échec avec motif, et ligne « Échouée » dans l'historique
- [ ] E-mail explicatif d'échec : attend la configuration d'un domaine d'envoi d'e-mails
- [x] Étape 1 cahier maître : fenêtres translucides, diaporama 30 photos 10 s, courbe Analyse tactile
- [ ] Étapes 2-5 cahier maître (pays, PIN au dépôt, échéance comptes bloqués)

## Étape 1 — Compléments demandés
- [x] Correction définitive : 30 panoramas illustratifs générés au format 3:1 sans recadrage à l’affichage, texte blanc sans fond, fondu doux ; rotation mesurée à 2,02 secondes, 30 visuels contrôlés, accueil connecté conservé sans modification des comptes
- [x] Bannière Groupes 130 px, coins de carte FILAX, cadrages individuels, aucune commande ni image arrière-plan ; vérifiée sur téléphone et grand écran sans modifier comptes ni session
- [x] Synchroniser chaque slogan avec sa scène ; sous-titres centrés en bas, rotation 5 s, transitions descente/fondu/flou ; testé sur téléphone et grand écran
- [x] Remplacer les visuels générés par 30 photographies Pexels authentiques, sources conservées ; garanties absolues et chiffres non vérifiés reformulés
- [x] Ajuster le diaporama : réussite financière inclusive, trois animations photographiques, rectangle sans cadre/compteur et messages sur 15 visuels ; vérifié sur téléphone et grand écran
- [x] Privilégier des scènes naturelles et un rendu photographique réaliste ; images générées, pas des photographies documentaires
- [x] Simulateurs frontend Push STK et SMS à six chiffres, explicitement sans paiement ni message réel
- [x] Remplacer le diaporama par 30 photos de cotisation, banque et conseil financier
- [x] Vérifier les simulations et le diaporama sans modifier le compte vitrine ni la session : STK accepté/refusé/expiré, OTP incorrect/valide/expiré/renvoyé/bloqué, aucun appel financier, accueil inchangé
