// commands/reparation.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createRepairEmbed, EMOJIS } = require('../utils/embedStyles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reparation')
    .setDescription('Demander une réparation pour votre véhicule')
    .addStringOption(option => 
      option.setName('vehicule')
        .setDescription('Type et modèle de votre véhicule')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('probleme')
        .setDescription('Décrivez le problème de votre véhicule')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('complexite')
        .setDescription('Niveau de complexité estimé de la réparation')
        .setRequired(false)
        .addChoices(
          { name: '🟢 Simple - Entretien de base', value: 'simple' },
          { name: '🟡 Moyenne - Réparation standard', value: 'moyenne' },
          { name: '🟠 Complexe - Réparation avancée', value: 'complexe' },
          { name: '🔴 Très complexe - Expertise requise', value: 'tres_complexe' }
        )),
  
  async execute(interaction, client) {
    // Récupérer les options
    const vehicule = interaction.options.getString('vehicule');
    const probleme = interaction.options.getString('probleme');
    const complexite = interaction.options.getString('complexite') || 'moyenne';
    
    // Créer un ID unique pour la demande (timestamp + 4 chiffres aléatoires)
    const repairId = `REP-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Trouver le salon des demandes de réparation
    const repairChannel = interaction.guild.channels.cache.find(
      ch => ch.name === '📂demandes-de-réparation'
    );
    
    if (!repairChannel) {
      return interaction.reply({
        content: "❌ Le salon de demandes de réparation n'existe pas. Contactez un administrateur.",
        ephemeral: true
      });
    }
    
    // Déterminer le niveau de mécanicien requis en fonction de la complexité
    let niveauRequis;
    let complexiteEmoji;
    
    switch (complexite) {
      case 'simple':
        niveauRequis = "Stagiaire ou supérieur";
        complexiteEmoji = "🟢";
        break;
      case 'moyenne':
        niveauRequis = "Mécanicien Junior ou supérieur";
        complexiteEmoji = "🟡";
        break;
      case 'complexe':
        niveauRequis = "Mécanicien ou supérieur";
        complexiteEmoji = "🟠";
        break;
      case 'tres_complexe':
        niveauRequis = "Mécanicien Senior ou Chef Mécanicien";
        complexiteEmoji = "🔴";
        break;
      default:
        niveauRequis = "Mécanicien Junior ou supérieur";
        complexiteEmoji = "🟡";
    }
    
    // Créer l'embed pour la demande avec le nouveau style luxueux
    const repairData = {
      id: repairId,
      userId: interaction.user.id,
      userName: interaction.user.tag,
      userAvatar: interaction.user.displayAvatarURL({ dynamic: true }),
      vehicule,
      probleme,
      complexite,
      niveauRequis,
      timestamp: Date.now()
    };
    
    const repairEmbed = createRepairEmbed(repairData, 'pending');
    
    // Envoyer la demande dans le salon approprié
    const sentMessage = await repairChannel.send({
      embeds: [repairEmbed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: 'Accepter',
              custom_id: `repair_accept_${repairId}`,
              emoji: { name: '✅' }
            },
            {
              type: 2,
              style: 4,
              label: 'Refuser',
              custom_id: `repair_reject_${repairId}`,
              emoji: { name: '❌' }
            },
            {
              type: 2,
              style: 1,
              label: 'En cours',
              custom_id: `repair_progress_${repairId}`,
              emoji: { name: '🔧' }
            },
            {
              type: 2,
              style: 2,
              label: 'Terminé',
              custom_id: `repair_complete_${repairId}`,
              emoji: { name: '🏁' }
            }
          ]
        }
      ]
    });
    
    // Enregistrer la demande dans une base de données locale (JSON)
    const dbPath = path.join(__dirname, '../data/repairs.json');
    let repairs = [];
    
    // Vérifier si le fichier existe
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      repairs = JSON.parse(data);
    } else {
      // Créer le dossier data s'il n'existe pas
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }
    
    // Ajouter la nouvelle demande
    repairs.push({
      id: repairId,
      userId: interaction.user.id,
      vehicule,
      probleme,
      complexite,
      niveauRequis,
      status: 'pending',
      messageId: sentMessage.id,
      timestamp: Date.now()
    });
    
    // Enregistrer dans le fichier
    fs.writeFileSync(dbPath, JSON.stringify(repairs, null, 2));
    
    // Répondre à l'utilisateur
    return interaction.reply({
      content: `✅ Votre demande de réparation a été enregistrée avec succès! ID: **${repairId}**\nUn mécanicien va étudier votre cas dès que possible.`,
      ephemeral: true
    });
  },
};

// Fonction utilitaire pour obtenir le libellé de la complexité
function getComplexiteLabel(value) {
  const complexites = {
    'simple': '🟢 Simple - Entretien de base',
    'moyenne': '🟡 Moyenne - Réparation standard',
    'complexe': '🟠 Complexe - Réparation avancée',
    'tres_complexe': '🔴 Très complexe - Expertise requise'
  };
  
  return complexites[value] || '🟡 Moyenne - Réparation standard';
}