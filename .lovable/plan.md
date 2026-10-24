# FILAX — finalisation indépendante des partenaires

## Objectif
Conserver FILAX et son design actuel ; corriger les risques, compléter les fonctions internes et livrer des preuves de tests. La cible « finalisé » sera validée module par module, jamais annoncée sur la seule présence d'un écran. Cette mission se déroule par lots ; aucun travail ne continue automatiquement entre les échanges.

## Premier audit réalisé
- Code et fonctions financières hébergées examinés sans modification des comptes ni de la session.
- 10 tests existants passent après correction du test PDF.
- Dépôts déjà en attente, confirmation admin contrôlée et index anti-doublon présents.
- Écarts prioritaires : contacts confirmés sans preuve, sorties externes débitées via une fonction sans prestataire, remboursements sans compensation du destinataire/groupe, idempotence incomplète et absence de ledger à double entrée.
- Le contrôle actuel ne permet pas de dire « production prête ».

## Lot 1 — fermer les risques avant d'ajouter
- Bloquer côté serveur les sorties banque/Mobile Money non configurées avant toute mutation, même si la fonction est appelée directement.
- Empêcher les remboursements internes incohérents avant de construire les contre-écritures complètes.
- Séparer accès rapide et preuve de possession du téléphone/e-mail ; ne jamais fabriquer d'OTP ou déclarer un contact vérifié sans preuve. Préserver les accès existants et signaler les canaux de reconnexion indisponibles.
- Vérifier droits, rôles, RLS, fichiers KYC et PIN ; supprimer la suppression automatique des nouveaux comptes de test.
- Tests négatifs concrets sur comptes de test uniquement.

## Lot 2 — comptabilité et moteur d'opérations
- Définir un journal à double entrée, équilibré séparément en USD et CDF, avec frais, avoirs groupes/objectifs et réservations pour opérations en attente.
- Conserver les données historiques intactes ; préparer une reprise documentée avec soldes d'ouverture contrôlés, sans inventer d'historique bancaire ni convertir le compte vitrine.
- Encadrer les transitions d'opération, compensations et remboursements dans des transactions atomiques.
- Idempotence durable liée à l'opération et à ses paramètres ; tests concurrence, répétition et interruption réseau.
- Comparer ledger, soldes et mouvements ; afficher les écarts, jamais les masquer.

## Lot 3 — terminer les parcours et l'administration
- Unifier inscription, connexion, récupération et mémoire d'appareil ; garder le design et les sessions existantes.
- Revalider profil, PIN, KYC manuel avec rejet/correction/historique et documents privés.
- Compléter comptes, objectifs, groupes, invitations, contributions et retraits selon les règles existantes, sans inventer de nouvelles limites.
- Finaliser recherches, filtres, états vides/erreur/en attente, notifications et supervision admin ; permissions différenciées vérifiées côté serveur.
- Préparer l'envoi de notifications externes sans annoncer des e-mails envoyés si aucun service n'est configuré.

## Lot 4 — préparer les partenaires sans les brancher
- Contrats logiciels séparés pour banque, Mobile Money et KYC ; état non configuré fermé par défaut.
- Préparer intentions de paiement, événements externes, traitement anti-doublon et règles d'activation.
- Ne créer aucun endpoint bancaire imaginaire. La vérification de signatures et l'adaptateur réel suivront la documentation du partenaire choisi.
- Secrets uniquement dans une saisie sécurisée, jamais dans le chat ou les fichiers du navigateur.
- Activation après contrat, documentation, tests sandbox, clés de production et autorisations nécessaires ; ajouter les clés seules ne suffit pas.

## Lot 5 — qualification et préparation de production
- Exécuter les tests utilisateur, financiers, sécurité, concurrence, panne et réseau sur un environnement de test isolé.
- Contrôler téléphone et ordinateur, compilation, erreurs et accès inter-utilisateurs.
- Préparer séparation test/production, sauvegardes, restauration, surveillance, procédure de livraison et retour arrière ; distinguer procédures écrites et opérations réellement vérifiées.
- Livrer une matrice par module : testé, incomplet ou dépendance externe, avec preuves et blocages.
- Ne pas publier ni activer de paiements réels dans cette mission.

## Garde-fous permanents
FLX-8241-KB et sa session restent intacts. Les comptes de test sont conservés. Aucun achat de service, choix arbitraire de banque, vrai paiement, faux compte bancaire ou crédit réel depuis une simulation.

## Détails techniques
Migrations appliquées par l'outil de migration Cloud, avec GRANT/RLS/policies cohérents. Autorisations et mutations financières vérifiées côté serveur/SQL, pas par les boutons. Garder TanStack Start et les frontières serveur existantes. Tracer les décisions structurelles dans AGENTS.md et les tâches dans roadmap.md. Chaque règle nouvelle ou corrigée reçoit un test qui peut réellement échouer.