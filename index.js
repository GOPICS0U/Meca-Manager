
// index.js - Point d'entrée principal du Bot Auto Exotic GTARP
const { Client, GatewayIntentBits, Collection, REST, Routes, PermissionFlagsBits, ChannelType, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { setupAutoMod } = require('./utils/automod');
const { setupScheduler } = require('./utils/scheduler');

// Initialisation du client avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Collections pour stocker les commandes et les événements
client.commands = new Collection();
client.cooldowns = new Collection();

// Chargement des commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Commande chargée: ${command.data.name}`);
  } else {
    console.warn(`⚠️ La commande ${filePath} n'a pas les propriétés requises.`);
  }
}

// Chargement des événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`✅ Événement chargé: ${event.name}`);
}

// Fonction pour enregistrer les commandes
async function deployCommands() {
  const commands = [];

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('🔄 Déploiement des commandes slash (/)...');

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    console.log('✅ Commandes déployées avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors du déploiement des commandes:', error);
  }
}

// Fonction pour configurer un serveur Discord complet
async function setupServer(guild) {
  console.log(`🛠️ Configuration du serveur: ${guild.name}`);

  try {
    // 1. Création des rôles (s'ils n'existent pas déjà)
    const roles = {
      'Patron': { color: 'Red', hoist: true, mentionable: true, position: 9, emoji: '👑' },
      'Chef Mécanicien': { color: '#FF4500', hoist: true, mentionable: true, position: 8, emoji: '🔧' },
      'Mécanicien Senior': { color: '#FFA500', hoist: true, mentionable: true, position: 7, emoji: '🔧' },
      'Mécanicien': { color: '#FFD700', hoist: true, mentionable: true, position: 6, emoji: '🔧' },
      'Mécanicien Junior': { color: '#FFFF00', hoist: true, mentionable: true, position: 5, emoji: '🔧' },
      'Stagiaire': { color: '#98FB98', hoist: true, mentionable: true, position: 4, emoji: '🔰' },
      'Client': { color: 'Green', hoist: true, mentionable: true, position: 2, emoji: '💬' },
      'BlackListed': { color: 'Grey', hoist: false, mentionable: false, position: 1, emoji: '🚫' }
    };

    const createdRoles = {};

    for (const [name, settings] of Object.entries(roles)) {
      const existingRole = guild.roles.cache.find(role => role.name === `${settings.emoji} ${name}`);

      if (!existingRole) {
        const newRole = await guild.roles.create({
          name: `${settings.emoji} ${name}`,
          color: settings.color,
          hoist: settings.hoist,
          mentionable: settings.mentionable,
          reason: 'Configuration automatique du serveur Auto Exotic'
        });
        createdRoles[name] = newRole;
        console.log(`✅ Rôle créé: ${settings.emoji} ${name}`);
      } else {
        createdRoles[name] = existingRole;
        console.log(`ℹ️ Rôle déjà existant: ${settings.emoji} ${name}`);
      }
    }

    // 2. Création des catégories et salons
    const categories = [
      {
        name: 'INFORMATION',
        channels: [
          { name: '📜・règlement', type: ChannelType.GuildText },
          { name: '📢・annonces', type: ChannelType.GuildText },
          { name: '📍・localisation-auto-exotic', type: ChannelType.GuildText },
          { name: '📋・tarifs-prestations', type: ChannelType.GuildText }
        ]
      },
      {
        name: 'COMMUNAUTÉ',
        channels: [
          { name: '💬・général', type: ChannelType.GuildText },
          { name: '🎥・partage-photos', type: ChannelType.GuildText },
        ]
      },
      {
        name: 'ATELIER',
        private: true,
        restrictedTo: ['Patron', 'Chef Mécanicien', 'Mécanicien Senior', 'Mécanicien', 'Mécanicien Junior', 'Stagiaire'],
        channels: [
          { name: '📂・demandes-de-réparation', type: ChannelType.GuildText },
          { name: '🔧・en-cours', type: ChannelType.GuildText },
          { name: '✅・terminé', type: ChannelType.GuildText },
          { name: 'Atelier', type: ChannelType.GuildVoice }
        ]
      }
    ];

    for (const category of categories) {
      let categoryChannel = guild.channels.cache.find(
        c => c.name === category.name && c.type === ChannelType.GuildCategory
      );

      if (!categoryChannel) {
        const permissionOverwrites = [];

        if (category.private) {
          // Restreindre l'accès par défaut
          permissionOverwrites.push({
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });

          // Autoriser l'accès pour les rôles spécifiés
          for (const roleName of category.restrictedTo) {
            if (createdRoles[roleName]) {
              permissionOverwrites.push({
                id: createdRoles[roleName].id,
                allow: [PermissionFlagsBits.ViewChannel]
              });
            }
          }
        }

        categoryChannel = await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites
        });
        console.log(`✅ Catégorie créée: ${category.name}`);
      } else {
        console.log(`ℹ️ Catégorie déjà existante: ${category.name}`);
      }

      // Création des salons dans cette catégorie
      for (const channel of category.channels) {
        const existingChannel = guild.channels.cache.find(
          c => c.name === channel.name && c.type === channel.type
        );

        if (!existingChannel) {
          const newChannel = await guild.channels.create({
            name: channel.name,
            type: channel.type,
            parent: categoryChannel.id
          });
          console.log(`✅ Salon créé: ${channel.name}`);

          // Ajouter du contenu initial pour certains canaux
          if (channel.name.includes('règlement')) {
            await newChannel.send({
              embeds: [{
                title: '📜 Règlement du Auto Exotic Custom',
                description: 'Bienvenue dans notre garage RP. Veuillez respecter ces règles:',
                color: 0xFF0000,
                fields: [
                  { name: '1️⃣ Respect', value: 'Soyez respectueux envers tous les membres du serveur.' },
                  { name: '2️⃣ RP', value: 'Restez dans votre rôle et respectez l\'univers GTA RP.' },
                  { name: '3️⃣ Spam', value: 'Pas de spam ou de contenu inapproprié.' },
                  { name: '4️⃣ Conflits', value: 'Réglez les différends en MP ou avec un admin.' },
                  { name: '5️⃣ Clients', value: 'Les clients doivent prendre rendez-vous via la commande /reparation.' }
                ],
                footer: { text: 'Auto Exotic Custom | Le meilleur garage de Los Santos' }
              }]
            });
          } else if (channel.name.includes('localisation-Auto Exotic')) {
            await newChannel.send({
              embeds: [{
                title: '📍 Où nous trouver ?',
                description: 'Le garage Auto Exotic est situé dans le quartier de Strawberry à Los Santos.',
                color: 0xFF9900,
                fields: [
                  { name: 'Adresse RP', value: '137 Route 68, Strawberry, Los Santos' },
                  { name: 'Coordonnées GTA', value: 'X: -205.5417, Y: -1303.8890, Z: 31.2939' }
                ],
              }]
            });
          } else if (channel.name.includes('tarifs-prestations')) {
            await newChannel.send({
              embeds: [{
                title: '📋 Tarifs et Prestations',
                description: 'Voici nos tarifs pour les différentes réparations et modifications:',
                color: 0x00FF00,
                fields: [
                  { name: '👨‍🔧 Dépaneur et Assistance', value: '• Diagnostiquer problème: 100$\n• Conseils techniques: Gratuit\n• Prix de la préstation : 500$' },
                  { name: '🔧 Réparations standard', value: '• Carrosserie légère: 500$\n• Carrosserie moyenne: 1200$\n• Carrosserie lourde: 2500$' },
                  { name: '⚙️ Mécanique', value: '• Changement moteur: 7500$\n• Transmission: 3500$\n• Freins: 1800$' },
                  { name: '🎨 Personnalisation', value: '• Peinture complète: 2500$\n• Jantes: 1500$\n• Kit carrosserie: 4500-12000$' },
                  { name: '🚀 Performance', value: '• Stage 1: 5000$\n• Stage 2: 8500$\n• Stage 3: 15000$' }
                ],
                footer: { text: 'Les prix peuvent varier selon les véhicules et les pièces disponibles' }
              }]
            });
          }
        } else {
          console.log(`ℹ️ Salon déjà existant: ${channel.name}`);
        }
      }
    }

    console.log('✅ Configuration du serveur terminée!');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration du serveur:', error);
  }
}

// Événement ready
client.once('ready', async () => {
  console.log(`🔥 ${client.user.tag} est en ligne!`);

  // Déployer les commandes
  await deployCommands();

  // Définir une activité pour le bot
  client.user.setPresence({
    activities: [{ name: '🔧 Auto Exotic Custom', type: ActivityType.Playing }],
    status: 'online',
  });

  // Configurer l'automod
  setupAutoMod(client);

  // Configurer le planificateur de tâches pour les rapports automatiques
  setupScheduler(client);

  // Vérifier si le serveur principal existe déjà
  const mainGuild = client.guilds.cache.get(config.mainGuildId);
  if (mainGuild) {
    console.log(`🏠 Serveur principal trouvé: ${mainGuild.name}`);

    // Configurer le serveur
    if (config.autoSetupOnStartup) {
      await setupServer(mainGuild);
    }
  }
});

// La gestion des commandes slash est maintenant dans events/interactionCreate.js

// Gestion des réponses automatiques à certains mots-clés
client.on('messageCreate', async message => {
  // Ignorer les messages des bots pour éviter les boucles
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // Répondre aux mots-clés
  if (content.includes('prix') || content.includes('tarif')) {
    const tarifChannel = message.guild.channels.cache.find(ch => ch.name === '📋tarifs-prestations');
    if (tarifChannel) {
      await message.reply(`Vous pouvez consulter tous nos tarifs dans le salon ${tarifChannel} ! 💰`);
    }
  } else if (content.includes('où est Auto Exotic') || content.includes('adresse') || content.includes('localisation')) {
    const localisationChannel = message.guild.channels.cache.find(ch => ch.name === '📍localisation-Auto Exotic');
    if (localisationChannel) {
      await message.reply(`Vous cherchez notre garage ? Toutes les infos sont dans ${localisationChannel} ! 🗺️`);
    }
  }
});

// Gestion de l'événement de création de serveur (pour créer automatiquement la structure)z
client.on('guildCreate', async guild => {
  console.log(`🎉 Le bot a été ajouté au serveur: ${guild.name}`);

  // Configurer le serveur automatiquement
  if (config.autoSetupOnJoin) {
    await setupServer(guild);
  }
});

// Connexion du bot
client.login(config.token);

// Exportation pour utilisation dans d'autres modules
module.exports = { client, setupServer };