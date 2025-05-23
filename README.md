# Bot Discord Auto Exotic GTARP

Un bot Discord complet pour gérer un serveur GTARP centré autour du garage dans l'univers de GTA Roleplay.

## 🎮 Fonctionnalités

- **Création automatique du serveur** avec structure complète
- **Gestion des rôles** (Patron, Mécano, Sécurité, Client, Banni)
- **Commandes slash** pour la gestion du garage
- **Auto-modération** (anti-spam, mots interdits)
- **Réponses automatiques** aux mots-clés
- **Système de statistiques** pour évaluer l'efficacité des mécaniciens
- **Panel d'administration** avec graphiques et analyses
- **Rapports automatiques** (journaliers, hebdomadaires, mensuels)
- **Suivi des revenus** et calcul des salaires recommandés

## 🛠️ Structure du serveur

### Rôles
- 👑 Patron
- 🔧 Chef Mécanicien
- 🔧 Mécanicien Senior
- 🔧 Mécanicien
- 🔧 Mécanicien Junior
- 🔰 Stagiaire
- 🛡️ Sécurité
- 💬 Client
- 🚫 Blacklisted

### Salons
- **INFORMATION**
  - #📜règlement
  - #📢annonces
  - #📍localisation-benny
  - #📋tarifs-prestations
- **COMMUNAUTÉ**
  - #💬général
  - #🎥partage-photos
  - #🚘vos-véhicules
  - #📦suggestions
- **ATELIER** (Privé)
  - #📂demandes-de-réparation
  - #🔧en-cours
  - #✅terminé
  - #🧰stock-pièces
  - 🔊 Salon vocal : Atelier

## 📋 Commandes

- `/reparation [véhicule] [problème]` - Envoie une demande de réparation
- `/facture [client] [montant] [description] [vehicule]` - Génère une facture
- `/embaucher [utilisateur] [specialite]` - Attribue le rôle Mécano
- `/virer [utilisateur] [raison]` - Retire le rôle Mécano
- `/annonce [message] [titre] [type]` - Publie une annonce
- `/stats [mecano/garage/reparations]` - Affiche les statistiques
- `/rapport [periode] [canal]` - Génère un rapport d'activité
- `/panel` - Affiche le panel d'administration

## 💻 Installation

1. Clonez ce dépôt
2. Installez les dépendances avec `npm install`
3. Configurez le fichier `config.json` avec votre token Discord et autres paramètres
4. Lancez le bot avec `node index.js`

## 📝 Configuration

Modifiez le fichier `config.json` pour personnaliser :
- Token du bot
- ID du client Discord
- ID du serveur principal
- Paramètres de modération
- Couleurs des embeds
- Et plus encore...

## 🚀 Déploiement

```bash
# Installation des dépendances
npm install

# Démarrage du bot
node index.js
```

## 📚 Structure du projet

```
BOT BENNYS/
├── commands/           # Commandes slash
│   ├── annonce.js
│   ├── embaucher.js
│   ├── facture.js
│   ├── panel.js
│   ├── rapport.js
│   ├── reparation.js
│   ├── stats.js
│   └── virer.js
├── events/             # Événements Discord
│   ├── interactionCreate.js
│   └── ready.js
├── utils/              # Utilitaires
│   ├── automod.js
│   └── scheduler.js
├── data/               # Stockage des données
│   ├── invoices.json
│   └── repairs.json
├── config.json         # Configuration du bot
├── index.js            # Point d'entrée principal
└── README.md           # Documentation
```

## 🔧 Technologies utilisées

- Node.js
- Discord.js v14
- JSON pour le stockage des données

## 📄 Licence

Ce projet est sous licence MIT.