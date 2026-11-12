# Stabilisation du moteur financier FILAX — 12 novembre 2026

## Périmètre
Mission limitée au moteur interne : journal comptable, compartiments de solde, idempotence et Sandbox. Aucun prestataire externe n'a été activé. Le design général est conservé. Aucun compte, solde, nom ou historique existant n'a été supprimé, réinitialisé ou remplacé.

## Réalisations

### Livre comptable
- `ledger_journals` et `ledger_entries` enregistrent des débits/crédits équilibrés par devise.
- Chaque journal porte une empreinte SHA-256 chaînée au journal précédent, sérialisée par verrou transactionnel.
- Les triggers interdisent toute modification ou suppression des journaux et lignes.
- Les transactions confirmées existantes ont été reprises dans le journal ; des écritures d'ouverture explicitly marquées réconcilient les anciens soldes sans les modifier.
- Dépôts confirmés, transferts internes, épargne, cotisations, retraits de groupe et remboursements utilisent le journal.

### Soldes
- Chaque compte distingue disponible, réservé, entrant en attente et sortant en attente.
- La contrainte `balance = available_balance + reserved_balance` et les bornes non négatives sont vérifiées par la base.
- Toutes les sorties contrôlent le disponible diminué des réserves sortantes, jamais le seul solde total.
- Les comptes verrouillés restent indisponibles avant échéance.

### Idempotence
- `operation_requests` conserve clé, empreinte des paramètres non sensibles, résultat et transaction.
- Les appels concurrents sont sérialisés ; une répétition renvoie le résultat initial, et une clé réutilisée avec d'autres paramètres est refusée.
- Les transferts, objectifs et cotisations utilisent une clé créée à l'ouverture du parcours et conservée pendant les reprises.
- Les anciennes clés de dépôt et de transfert ont été reprises comme reçus existants.

### Sandbox
- Module pur `src/lib/financial-sandbox.ts`, sans import d'authentification, de comptes, de persistance ou de moteur réel.
- Montants entiers en centimes, journaux équilibrés, reçus de répétition et contrôle d'intégrité.
- Succès, attente, refus et annulation sont disponibles dans la fenêtre de démo existante.

## Vérifications
- 45 tests automatiques dans 10 fichiers, tous réussis.
- Stress fictif : 250 validations identiques produisent une seule opération.
- Lecture SQL globale : 0 empreinte cassée, 0 compte non reconcilié, 0 compartiment invalide.
- Première reprise : 30 journaux et 66 lignes, tous équilibrés ; 5 anciens reçus d'idempotence préservés.
- Aucun paiement, retrait ou transfert réel exécuté.

## Limites restantes
- Les tests de stress de la Sandbox ne constituent pas un test de concurrence sur les fonctions SQL avec deux sessions authentifiées isolées.
- La démo n'est pas accessible depuis l'accès découverte sans compte ; son moteur a été vérifié par tests automatiques, pas par un parcours navigateur authentifié.
- Les callbacks signés, règlements et rapprochements de prestataires externes restent conditionnés à de futurs contrats et à leurs documentations.
