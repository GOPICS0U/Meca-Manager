// commands/equipe.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('equipe')
    .setDescription('Affiche la liste des membres de l\'équipe d\'Auto Exotic'),
  
  async execute(interaction, client) {
    const guild = interaction.guild;
    
    // Définir les rôles à rechercher
    const roles = [
      { name: 'Patron', emoji: '👑' },
      { name: 'Chef Mécanicien', emoji: '🔧' },
      { name: 'Mécanicien Senior', emoji: '🔧' },
      { name: 'Mécanicien', emoji: '🔧' },
      { name: 'Mécanicien Junior', emoji: '🔧' },
      { name: 'Stagiaire', emoji: '🔰' },
      { name: 'Sécurité', emoji: '🛡️' }
    ];
    
    // Créer un embed pour l'équipe
    const embed = new EmbedBuilder()
      .setTitle('👥 Équipe d\'Auto Exotic')
      .setColor('#0099FF')
      .setDescription('Voici la liste des membres de notre équipe:')
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: 'Auto Exotic GTARP' })
      .setTimestamp();
    
    // Pour chaque rôle, trouver les membres et les ajouter à l'embed
    for (const roleInfo of roles) {
      const role = guild.roles.cache.find(r => r.name.includes(roleInfo.name));
      
      if (role) {
        // Récupérer tous les membres avec ce rôle
        const members = role.members.map(member => `${member}`).join('\n');
        
        // Ajouter un champ pour ce rôle s'il y a des membres
        if (members.length > 0) {
          embed.addFields({
            name: `${roleInfo.emoji} ${roleInfo.name}s`,
            value: members || 'Aucun membre',
            inline: false
          });
        }
      }
    }
    
    // Ajouter des statistiques
    const totalMembers = guild.members.cache.filter(member => 
      member.roles.cache.some(role => 
        roles.some(r => role.name.includes(r.name))
      )
    ).size;
    
    embed.addFields({
      name: '📊 Statistiques',
      value: `Nombre total de membres dans l'équipe: **${totalMembers}**`,
      inline: false
    });
    
    // Répondre avec l'embed
    return interaction.reply({
      embeds: [embed]
    });
  },
};