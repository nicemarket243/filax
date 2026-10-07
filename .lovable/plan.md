# Bibliothèque visuelle et sous-comptes sécurisés

## Résultat attendu
- Retirer la ligne horizontale sous l’en-tête de la carte.
- Remplacer le visuel du Compte Principal par une photographie bancaire plus pertinente.
- Proposer 24 visuels photographiques réalistes et cohérents : banque, immobilier, mariage, véhicule, voyage, études, famille, santé, projet et entreprise.
- Conserver exactement la carte actuelle : seul le contenu de sa petite bulle d’image change.

## Parcours des comptes
- Garder la création automatique des deux comptes socles, Principal USD et Principal CDF, déjà assurée pour chaque nouvel utilisateur.
- Transformer « Créer un compte » en création de sous-compte rattaché à un compte Principal existant.
- Demander : compte Principal de rattachement, nom, objectif financier, code dédié à 4 chiffres, date de blocage éventuelle et visuel.
- Refuser côté interface et côté base toute création de sous-compte sans compte Principal valide appartenant à l’utilisateur.

## Changement rapide du visuel
- Un appui long d’une seconde sur la petite image de la carte ouvre la bibliothèque.
- Un appui normal sur la carte continue de fonctionner comme aujourd’hui.
- Le choix est enregistré sur le compte et réapparaît après rechargement et reconnexion.
- Les comptes existants reçoivent automatiquement un visuel réaliste selon leur nom, sans modifier leurs soldes ni leur historique.

## Sécurité des sous-comptes
- Stocker uniquement une empreinte chiffrée du code dédié, jamais le code lisible.
- Exiger ce code pour toute sortie d’argent depuis un sous-compte : retrait, transfert FILAX, transfert externe, cotisation et alimentation d’un objectif.
- Conserver le comportement actuel des comptes Principaux.
- Valider tous les champs côté interface et côté base, avec limites de longueur, montants positifs et code strictement à 4 chiffres.

## Vérification
- Tester la création d’un sous-compte complet et sa persistance.
- Tester le sélecteur de 24 visuels, l’appui long d’une seconde et le changement d’image d’un compte existant.
- Vérifier qu’une sortie de sous-compte échoue sans code ou avec un mauvais code, puis réussit avec le bon code.
- Vérifier les cartes Principal USD, Principal CDF et Mariage sur mobile sans changement de structure ni de couleurs.

## Détails techniques
- Étendre les comptes avec le rattachement au compte Principal, l’objectif et la clé du visuel.
- Ajouter une table privée de sécurité des sous-comptes et des fonctions sécurisées pour créer un sous-compte, changer son visuel et vérifier son code lors des sorties.
- Mettre à jour les appels existants sans toucher aux soldes, transactions, groupes ou profils déjà enregistrés.
