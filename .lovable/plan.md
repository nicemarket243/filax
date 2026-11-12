# FILAX — Stabilisation du moteur financier interne

## Résultat attendu
Renforcer la comptabilité, les soldes, l’anti-doublon et la Sandbox sans reconstruire l’application, sans changer le design Premium Blue, sans rouvrir les paiements externes et sans modifier les soldes, noms ou historiques existants.

## 1. Livre comptable à double entrée
- Ajouter un journal append-only : chaque écriture comporte des débits et crédits équilibrés par devise, un lien vers l’opération et une empreinte cryptographique chaînée.
- Interdire toute modification ou suppression des écritures, y compris par les chemins d’administration ordinaires.
- Rattacher dépôts confirmés, transferts internes, épargne, cotisations, retraits de groupe et remboursements au journal.
- Ajouter un contrôle de rapprochement entre comptes, réserves, opérations en attente et journal.

## 2. Soldes strictement séparés
- Ajouter aux comptes les montants disponibles, réservés et en attente, avec des contrôles de cohérence et des valeurs initiales calculées sans changer le solde existant.
- Faire utiliser le solde disponible par toutes les sorties ; les comptes bloqués restent intouchables avant échéance.
- Brancher les valeurs réelles sur l’affichage existant, sans en changer la mise en page.

## 3. Idempotence de bout en bout
- Enregistrer chaque demande avec une clé unique et une empreinte des paramètres non sensibles.
- Sérialiser les appels simultanés par verrous de base ; une répétition renvoie le résultat initial et une clé réutilisée avec d’autres paramètres est refusée.
- Couvrir aussi les objectifs et cotisations, dont les opérations ne portaient aujourd’hui aucune clé finale.
- Générer la clé à l’ouverture du parcours et conserver la même clé pendant les reprises, au lieu d’une déduplication limitée à dix secondes.

## 4. Sandbox et tests de stress
- Créer un moteur Sandbox purement isolé, sans import des comptes, sessions ou fonctions financières réelles.
- Couvrir succès, attente, refus, annulation, fonds insuffisants, devise différente, double exécution et rafales d’appels simultanés.
- Ajouter des tests automatiques pour l’équilibre du journal, les soldes, les limites de dates, les empreintes et l’immutabilité logique.

## Vérifications et limites
- Appliquer une migration additive ; aucune suppression de table, colonne ou donnée.
- Vérifier les règles SQL sur un environnement de test isolé si disponible, sans session du compte vitrine ni de FLX-6405AF9C.
- Lancer tous les tests, le typecheck et la construction de production.
- Consigner précisément ce qui est vérifié et ce qui reste à tester avec de futurs prestataires.

## Détails techniques
- Nouvelles tables protégées : journaux, lignes comptables et demandes d’idempotence.
- Fonctions SQL sécurisées et droits minimaux ; les écritures directes depuis le navigateur restent interdites.
- Le moteur Sandbox reste un module frontend indépendant : aucune donnée fictive n’est enregistrée dans les comptes ou transactions réels.
