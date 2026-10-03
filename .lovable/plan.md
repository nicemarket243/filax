# Accès public, conditions bancaires et KYC réel

## Résultat attendu

- Les cinq banques affichent exactement les textes officiels fournis, sans FAQ inventée.
- Les tiroirs du Profil sont fermés au départ et un seul peut être ouvert à la fois.
- Une page publique présente FILAX et permet l'inscription ou la connexion par numéro de téléphone et code SMS.
- Une connexion existante retrouve automatiquement son profil, ses comptes, son KYC et ses groupes.
- Le statut KYC apparaît clairement sur l'Accueil et dans la fiche détaillée d'un client du back-office.
- Le back-office montre uniquement les pièces et selfies réellement téléversés par l'utilisateur.

## Mise en œuvre

1. **Banques et Profil**
   - Remplacer le contenu générique par un titre et un texte propres à Equity BCDC, UBA RDC, BCC, Rawbank et TMB.
   - Présenter le texte dans une modale centrale sur ordinateur et en bottom sheet sur mobile, avec fermeture, mots clés mis en valeur, avertissement d'irréversibilité et bouton « Valider ma banque ».
   - Passer les tiroirs du Profil à un état contrôlé partagé : tous fermés au chargement, ouverture exclusive.

2. **Accueil public et téléphone**
   - Séparer l'espace public de l'espace financier connecté, sans supprimer l'accueil actuel des utilisateurs existants.
   - Ajouter l'envoi et la vérification d'un code SMS pour inscription/connexion par téléphone.
   - Collecter le nom lors de la première inscription seulement ; conserver le profil existant pour les numéros déjà connus.
   - Ajouter déconnexion et redirection propre vers l'accès public.

3. **KYC visible et réel**
   - Ajouter un indicateur KYC sur l'Accueil pour les états « en cours », « validé » et « refusé », avec accès au Profil quand une action est nécessaire.
   - Ajouter le même statut dans la fiche détaillée du client au back-office.
   - Renforcer l'affichage administratif des vrais fichiers privés téléversés : chargement, absence de document et erreur explicites, sans image de remplacement.

4. **Validation**
   - Vérifier les parcours public, code SMS, utilisateur existant et navigation connectée sur mobile et ordinateur.
   - Effectuer un cycle KYC complet avec deux images portant clairement la mention « TEST — NON VALIDE », valider depuis le back-office, vérifier les statuts, puis supprimer les fichiers et restaurer l'état antérieur.
   - Contrôler les métadonnées de chaque page ajoutée et l'absence d'erreur de compilation ou d'exécution.

## Détails techniques

- Authentification téléphonique via le service d'authentification Lovable Cloud et OTP SMS ; aucun code simulé.
- Données privées accessibles uniquement après authentification et toujours protégées par les règles existantes.
- Les documents KYC restent dans le stockage privé et sont ouverts par liens temporaires réservés aux administrateurs.
- La copie française reste canonique et les nouvelles chaînes sont ajoutées à la traduction anglaise instantanée existante.