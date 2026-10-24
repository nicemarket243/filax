# FILAX — audit initial de finalisation

Date : 24 octobre 2026. Audit du code et lecture seule des définitions hébergées, sans mouvement financier, modification de compte ni changement de session. Ce document ne certifie pas une préparation à la production.

## Éléments confirmés

- 17 tables applicatives hébergées : comptes, profils, sécurité PIN, rôles, transactions, frais, objectifs, groupes, membres, contributions, demandes de retrait, notifications, litiges, incidents et audit.
- RLS activée sur les six tables sensibles examinées. L'absence de policy autorisant une action reste déterminante même lorsque le rôle possède un GRANT.
- Le rôle authenticated ne possède pas INSERT/UPDATE sur accounts. Des privilèges larges subsistent sur plusieurs autres tables sensibles ; leurs policies et privilèges effectifs doivent être revus ensemble.
- deposit appelle request_deposit : création pending, pas de crédit immédiat. L'ancienne affirmation de dépôt arbitraire ne décrit donc plus cette fonction hébergée.
- admin_confirm_deposit vérifie le rôle admin, verrouille la transaction et exige pending avant crédit.
- withdraw, transfer et transfer_external ne sont exécutables ni par anon ni directement par authenticated. account_outflow reste le point d'entrée authentifié par ses vérifications internes.
- Un index unique partiel existe sur transactions(user_id, idempotency_key).
- admin_refund_transaction verrouille l'opération et exige confirmed ; sa transition refunded empêche une seconde exécution normale sur la même opération.
- Les routes de contenu possèdent leurs métadonnées spécifiques. La description d'accueil affirme néanmoins une connexion bancaire inexistante : à corriger avec les autres affirmations produit.
- Après correction de l'import du test PDF, les trois suites existantes passent : 10 tests. Ces tests ne couvrent pas le moteur SQL ni une intégration financière complète.

## Risques prioritaires confirmés

1. **Contacts faussement confirmés à l'inscription.** registerFilaxAccount crée un utilisateur avec email_confirm=true et phone_confirm selon présence du numéro, sans preuve de possession. L'accès rapide doit être distingué de la vérification du contact ; conserver la fluidité sans déclarer un contact vérifié. Un compte téléphone seul ne dispose pas de reconnexion SMS configurée.
2. **Sorties externes encore possibles via le point d'entrée SQL.** account_outflow accepte withdraw/external et appelle des fonctions débitant le compte sans prestataire connecté. Le blocage des boutons ne suffit pas ; il faut fermer ces chemins côté serveur avant les mutations.
3. **Remboursements internes non compensés.** admin_refund_transaction recrédite une sortie transfer_out ou contribution sans contre-écriture explicite sur le destinataire/groupe/frais. Le verrou empêche les répétitions, mais ne garantit pas la conservation de valeur entre toutes les parties.
4. **Idempotence incomplète.** La vérification de doublon précède le verrou du compte ; tester les appels concurrents, le contenu associé à une clé et les collisions. Les opérations goal/contribute ne renvoient pas de transaction à account_outflow et n'enregistrent pas sa clé sur leur transaction.
5. **Devises des groupes.** contribute ne compare pas explicitement la devise du compte source à celle du groupe dans sa définition hébergée.
6. **Pas de ledger à double entrée.** Aucune table de journaux/écritures comptables, réservations, intentions de paiement, événements webhook, partenaires ou configuration d'activation dans les 17 tables présentes. admin_reconciliation calcule un net depuis transactions ; ce n'est pas un ledger indépendant.

## Points à revalider

- Le rôle SQL EXECUTE de certaines fonctions est ouvert à anon, mais leurs vérifications internes refusent l'absence d'identité/admin : cela n'établit pas à lui seul une exploitation. Réduire les droits au nécessaire et tester.
- Politiques effectives KYC/documents, configuration Auth et stockage, restrictions PIN, limites d'upload et historique des décisions : revue complète restante.
- Routes historiques d'inscription et routes privées/admin : unifier sans confondre garde d'interface et autorisation serveur.
- Migrations Drizzle/Supabase et définitions hébergées ne forment pas encore un historique de reconstruction vérifié.
- La fonction de suppression des nouveaux comptes Google doit être retirée du parcours pour respecter la conservation des comptes de test ; aucune suppression n'a été exécutée pendant cet audit.
- Sauvegardes, restauration, séparation test/production, surveillance, livraison d'e-mails et couverture navigateur complète : non certifiées.

## Preuves et limites

Sources : src/lib/filax-auth.functions.ts, src/lib/filax-db.ts, src/routes/admin_.operations.tsx, src/lib/*test.ts, migrations Drizzle et Supabase, catalogue information_schema/pg_proc/pg_indexes/pg_tables hébergé. Les données financières personnelles n'ont pas été utilisées pour les tests.

Le journal de compilation a montré build OK à 21:28:32 UTC avant la correction du test. Aucun nouveau résultat de compilation n'était disponible au dernier contrôle ; ne pas présenter ce résultat antérieur comme une compilation après correction.