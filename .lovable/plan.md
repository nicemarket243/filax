# Finalisation FILAX — règles métier, sécurité et back-office

## Résultat attendu

- Le compte démo FLX-8241-KB reste intact (soldes, groupes, historique) et affiche « IDENTIFIANT VÉRIFIÉ » en vert.
- Un nouvel utilisateur s'inscrit avec Nom, Post-nom, e-mail et téléphone, arrive directement sur l'accueil avec ses deux Comptes Principaux (USD et CDF) à 0, et des écrans vides propres partout.
- Badges KYC en 3 couleurs : Rouge (non vérifié), Bleu (en cours), Vert (vérifié). Dépôts, retraits, transferts et sous-comptes restent bloqués tant que ce n'est pas vert.
- Les deux Comptes Principaux ne peuvent jamais être bloqués, fermés ou supprimés, même par l'admin.
- Maximum 10 sous-comptes d'objectif. Chaque solde est isolé : retirer plus que le solde du sous-compte affiche l'alerte rouge « Votre montant de retrait est supérieur au solde disponible sur ce compte. »
- Création d'un sous-compte bloqué : nom, montant cible, photo, durée (7 jours, 1 mois, 3 mois, 6 mois, 1 an, 2 ans, 5 ans), puis deux fenêtres de confirmation successives. Aucun déblocage anticipé possible.
- Plus aucun crédit d'argent direct depuis l'app : un dépôt devient une demande « En attente », confirmée seulement par le back-office (en attendant la vraie banque / Mobile Money).
- Chaque opération a un état clair : Créée → En attente → Confirmée / Échouée → Remboursée, sans risque de double crédit.
- Back-office : validation KYC Rouge → Bleu → Vert, journal d'audit, litiges, remboursements, incidents et rapprochement.

## Mise en œuvre

1. **Compte démo** — marquer le compte FLX-8241-KB comme vérifié et démo protégée ; aucune donnée financière touchée.
2. **Inscription légère** — ajouter Post-nom et e-mail au formulaire d'inscription téléphone ; les enregistrer dans le profil.
3. **KYC 3 états** — badge réutilisable (Profil, Accueil, fiche client admin) ; blocage serveur de toutes les opérations d'argent sans KYC vert (le compte démo passe).
4. **Sous-comptes** — limite de 10, durée de blocage 7 jours à 5 ans, double confirmation, alerte rouge de solde insuffisant affichée avant envoi et confirmée par le serveur.
5. **Moteur financier** — états et clé anti-doublon sur chaque opération ; dépôt = demande en attente ; confirmation/échec/remboursement uniquement via fonctions admin ; frais et soldes calculés uniquement côté base.
6. **Sécurité** — suppression des chemins qui créditent un solde sans contrôle ; vérification que chaque utilisateur ne voit que ses comptes, opérations et documents ; protection des Comptes Principaux ; limitation des essais du code PIN (5 essais, puis blocage 15 min).
7. **Banques** — liste du Profil : Equity BCDC, Rawbank, UBA RDC, BCC, TMB et IBA (texte de conditions IBA à fournir ; placeholder neutre en attendant).
8. **Back-office** — nouvelles pages : Dépôts en attente, Litiges & remboursements, Incidents, Journal d'audit / rapprochement.
9. **Tests** — parcours complet en navigateur : nouvel utilisateur, KYC rouge→bleu→vert, dépôt en attente puis confirmé par l'admin, retrait refusé au-delà du solde, sous-compte bloqué non retirable, double clic sans double crédit ; puis nettoyage des données de test.

## Détails techniques

- Migrations : `transactions` gagne `status` (default `confirmed` pour l'historique existant), `idempotency_key` unique par utilisateur, `failure_reason`, `confirmed_at` ; nouvelles tables `deposit_requests`, `disputes`, `incidents`, `audit_log` (RLS propriétaire + admin, GRANT explicites) ; `profiles.middle_name`, `profiles.is_demo`.
- `deposit()` réécrit : crée une demande `pending` sans toucher au solde ; `admin_confirm_deposit`, `admin_fail_transaction`, `admin_refund_transaction` font les écritures avec verrous `FOR UPDATE`.
- Garde `require_kyc_verified()` appelée dans `withdraw`, `transfer`, `transfer_external`, `create_subaccount`, `account_outflow`, dépôts.
- Trigger interdisant `status <> 'active'` sur `kind='main'` ; `create_subaccount` vérifie le compte ≤ 10 et `locked_until` entre now()+7j et now()+5 ans.
- Table `pin_attempts` pour la limitation du PIN dans `check_pin`.
- Chaque fonction admin écrit dans `audit_log`.
