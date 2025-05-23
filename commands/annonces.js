// commands/annonces.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('annonces')
    .setDescription('Publier une annonce dans le canal des annonces')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('Contenu de l\'annonce')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('titre')
        .setDescription('Titre de l\'annonce')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Type d\'annonce')
        .setRequired(false)
        .addChoices(
          { name: '📢 Générale', value: 'general' },
          { name: '🎉 Événement', value: 'event' },
          { name: '🔧 Maintenance', value: 'maintenance' },
          { name: '💰 Promotion', value: 'promo' },
          { name: '⚠️ Important', value: 'important' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a les rôles nécessaires
    const member = interaction.member;
    const hasRole = member.roles.cache.some(role => 
      role.name.includes('Patron') || role.name.includes('Mécano')
    );
    
    if (!hasRole) {
      return interaction.reply({
        content: "❌ Vous n'avez pas la permission de faire des annonces!",
        ephemeral: true
      });
    }
    
    // Récupérer les options
    const message = interaction.options.getString('message');
    const titre = interaction.options.getString('titre') || "Annonce Auto Exotic";
    const type = interaction.options.getString('type') || 'general';
    
    // Définir la couleur et l'emoji selon le type
    let color, emoji;
    switch (type) {
      case 'event':
        color = '#FFD700';
        emoji = '🎉';
        break;
      case 'maintenance':
        color = '#FF6600';
        emoji = '🔧';
        break;
      case 'promo':
        color = '#00CC00';
        emoji = '💰';
        break;
      case 'important':
        color = '#FF0000';
        emoji = '⚠️';
        break;
      default:
        color = '#3498DB';
        emoji = '📢';
    }
    
    // Trouver le salon d'annonces
    const annonceChannel = interaction.guild.channels.cache.find(ch => ch.name === '📢・annonces');
    
    if (!annonceChannel) {
      return interaction.reply({
        content: "❌ Le salon des annonces n'existe pas sur ce serveur.",
        ephemeral: true
      });
    }
    
    // Créer l'embed pour l'annonce
    const annonceEmbed = new EmbedBuilder()
      .setTitle(`${emoji} ${titre}`)
      .setColor(color)
      .setDescription(message)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      })
      .setFooter({ text: `Auto Exotic Custom GTARP` })
      .setTimestamp();
    
    // Envoyer l'annonce
    await annonceChannel.send({ 
      content: type === 'important' ? '@everyone' : null,
      embeds: [annonceEmbed] 
    });
    
    // Répondre à l'utilisateur
    return interaction.reply({
      content: `✅ Votre annonce a été publiée dans ${annonceChannel}!`,
      ephemeral: true
    });
  },
};
