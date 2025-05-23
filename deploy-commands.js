// deploy-commands.js
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Fonction pour enregistrer les commandes
async function deployCommands() {
  const commands = [];
  
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`✅ Commande préparée pour déploiement: ${command.data.name}`);
    } else {
      console.warn(`⚠️ La commande ${file} n'a pas les propriétés requises.`);
    }
  }
  
  const rest = new REST({ version: '10' }).setToken(config.token);
  
  try {
    console.log(`🔄 Déploiement de ${commands.length} commandes slash (/)...`);
    
    // Déploiement global (pour tous les serveurs)
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    
    console.log(`✅ ${data.length} commandes déployées avec succès!`);
    
    // Afficher les commandes déployées
    data.forEach(cmd => {
      console.log(`  - /${cmd.name}`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du déploiement des commandes:', error);
  }
}

// Exécuter la fonction
deployCommands();