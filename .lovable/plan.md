# FILAX — Mise en œuvre du cahier des charges (par lots, sans reconstruction)

## Règles fixes (s'appliquent à chaque lot)
- On garde tout le design et les pages actuelles ; on complète, on ne reconstruit rien.
- Les comptes de démo et de test restent intacts : soldes, noms, historiques. Aucune suppression ni réinitialisation (blocage déjà actif).
- Chaque client a deux comptes principaux USD et CDF tenus par la banque, et au maximum 8 sous-comptes FILAX (10 comptes au total). Ce maximum remplace le « autant que permis » du cahier.
- Le mode Sandbox utilise des soldes séparés, marqués « Test ». Il ne touche jamais un vrai solde.
- Aucune banque ni aucun opérateur n'est présenté comme opérationnel avant sa validation. Rien n'est copié de Visa Pay.

## Lot 1 — Audit et écarts (Étapes 1–33)
Comparer chaque étape avec l'existant (fait, partiel, absent) dans un rapport d'écarts. L'audit du 24 octobre sert de base.

## Lot 2 — Inscription : banque et comptes principaux (Étapes 1–2)
- Liste des banques gérée par l'administrateur (Equity BCDC, Rawbank, Ecobank, Sofibanque, UBA, Access Bank). Chaque banque a un statut : « en préparation », « Sandbox » ou « active ».
- Choix de la banque pendant l'inscription. Ouverture demandée en USD, en CDF ou les deux, avec le statut « demande envoyée ». Si l'ouverture par connexion directe n'existe pas encore, un parcours alternatif est proposé.
- Les nouveaux clients uniquement : les comptes existants ne changent pas.

## Lot 3 — Sous-comptes et séparation des soldes (Étapes 3–4, 9–10)
- Mode libre ou bloqué avec date de déblocage. Affichage du solde total, disponible, bloqué et en attente.
- Contrôle dans la base de données : chaque opération ne puise que dans son propre compte, dans la même devise. Aucune compensation automatique par un autre compte.

## Lot 4 — Frais administrables (Étape 7)
Grille de frais : montant fixe, pourcentage, ou les deux. Elle varie selon la devise, le partenaire, le moyen de paiement et le type d'opération. Elle remplace les tarifs écrits en dur, et le résultat ne change pas tant que la grille n'est pas modifiée.

## Lot 5 — Dépôts, retraits et formulaire en direct (Étapes 5–6, 8)
- Calcul en direct de la somme demandée plus les frais. Si le solde manque : bordure rouge, message prévu et bouton bloqué. Si le solde suffit : bordure verte, récapitulatif et solde restant.
- Une opération est « en attente » jusqu'au retour du partenaire. Elle n'est jamais affichée comme réussie trop tôt.

## Lot 6 — Espace unique Envoyer / Recevoir (Étapes 11–18)
- Transfert FILAX vers FILAX, réel et interne. Mobile Money (M-Pesa, Orange, Airtel), banque, carte et carte virtuelle : préparés et testables en Sandbox seulement.
- Parcours court : destinataire → montant → récapitulatif → code PIN → statut.

## Lot 7 — Sécurité et traçabilité (Étapes 19–24)
Clé anti-double transaction sur chaque opération, journal d'audit, motifs d'échec, remboursements compensés, tableau de bord administrateur et suivi KYC.

## Lot 8 — Environnement Sandbox (Étapes 25–28)
Banque, Mobile Money et carte simulés, avec réponses de succès, d'échec ou de délai. Les connecteurs sont prêts mais non configurés : il suffira d'ajouter les clés plus tard.

## Lot 9 — Qualité et rapport final (Étapes 29–33)
Tests automatiques des règles d'argent, test de bout en bout sur un nouveau compte test, contrôle sur téléphone et rapport final.

## Détails techniques
- Nouvelles tables : banques partenaires, demandes d'ouverture, grille de frais, comptes et opérations Sandbox séparés. Toutes protégées, modifiables par l'administrateur via des fonctions sécurisées.
- Les soldes réels ne changent que par les fonctions sécurisées existantes, avec contrôle du PIN et de l'idempotence.
- Un test par règle d'argent : 995 $ + 4 $ sur 1 000 $ est accepté, 1 000 $ + 4 $ est refusé, pas de retrait avant la date de déblocage, pas de mélange de devises.
