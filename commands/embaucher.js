// commands/embaucher.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embaucher')
    .setDescription('Embaucher un nouveau mécanicien')
    .addUserOption(option => 
      option.setName('utilisateur')
        .setDescription('Utilisateur à embaucher')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('poste')
        .setDescription('Poste du mécanicien')
        .setRequired(true)
        .addChoices(
          { name: '👑 Chef Mécanicien', value: 'chef' },
          { name: '🔧 Mécanicien Senior', value: 'senior' },
          { name: '🔧 Mécanicien', value: 'mecanicien' },
          { name: '🔧 Mécanicien Junior', value: 'junior' },
          { name: '🔰 Stagiaire', value: 'stagiaire' }
        ))
    .addStringOption(option => 
      option.setName('specialite')
        .setDescription('Spécialité du mécanicien')
        .setRequired(false)
        .addChoices(
          { name: '🔧 Mécanique générale', value: 'mecanique' },
          { name: '🎨 Carrosserie/Peinture', value: 'carrosserie' },
          { name: '🚀 Performance', value: 'performance' },
          { name: '🔌 Électronique', value: 'electronique' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Patron ou Chef Mécanicien
    const member = interaction.member;
    const hasPatronRole = member.roles.cache.some(role => role.name.includes('Patron'));
    const hasChefRole = member.roles.cache.some(role => role.name.includes('Chef Mécanicien'));
    
    // Seul le patron peut embaucher un chef mécanicien
    const poste = interaction.options.getString('poste');
    if (poste === 'chef' && !hasPatronRole) {
      return interaction.reply({
        content: "❌ Seul le patron peut embaucher un Chef Mécanicien!",
        ephemeral: true
      });
    }
    
    // Le patron ou le chef mécanicien peuvent embaucher les autres postes
    if (!hasPatronRole && !hasChefRole) {
      return interaction.reply({
        content: "❌ Seul le patron ou le chef mécanicien peuvent embaucher du personnel!",
        ephemeral: true
      });
    }
    
    // Récupérer l'utilisateur cible
    const targetUser = interaction.options.getUser('utilisateur');
    const targetMember = await interaction.guild.members.fetch(targetUser.id);
    const specialite = interaction.options.getString('specialite') || "Non spécifiée";
    
    // Déterminer le rôle à attribuer en fonction du poste
    let roleToAdd;
    switch (poste) {
      case 'chef':
        roleToAdd = interaction.guild.roles.cache.find(role => role.name.includes('Chef Mécanicien'));
        break;
      case 'senior':
        roleToAdd = interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien Senior'));
        break;
      case 'mecanicien':
        roleToAdd = interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien') && !role.name.includes('Senior') && !role.name.includes('Junior') && !role.name.includes('Chef'));
        break;
      case 'junior':
        roleToAdd = interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien Junior'));
        break;
      case 'stagiaire':
        roleToAdd = interaction.guild.roles.cache.find(role => role.name.includes('Stagiaire'));
        break;
      default:
        roleToAdd = interaction.guild.roles.cache.find(role => role.name.includes('Stagiaire'));
    }
    
    if (!roleToAdd) {
      return interaction.reply({
        content: `❌ Le rôle correspondant au poste ${getPosteLabel(poste)} n'existe pas sur ce serveur.`,
        ephemeral: true
      });
    }
    
    // Vérifier si l'utilisateur a déjà un rôle de mécanicien
    const hasMechanicRole = targetMember.roles.cache.some(role => 
      role.name.includes('Mécanicien') || role.name.includes('Stagiaire') || role.name.includes('Chef Mécanicien')
    );
    
    if (hasMechanicRole) {
      return interaction.reply({
        content: `❌ ${targetUser.username} fait déjà partie de l'équipe d'Auto Exotic! Utilisez la commande de promotion/rétrogradation à la place.`,
        ephemeral: true
      });
    }
    
    // Attribuer le rôle à l'utilisateur
    try {
      await targetMember.roles.add(roleToAdd);
      
      // Créer un embed pour l'annonce
      const embedAnnonce = new EmbedBuilder()
        .setTitle('🎉 Nouvelle recrue!')
        .setColor('#00FF00')
        .setDescription(`${targetUser} rejoint l'équipe d'Auto Exotic!`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '📅 Date d\'embauche', value: new Date().toLocaleDateString('fr-FR') },
          { name: '👔 Poste', value: getPosteLabel(poste) },
          { name: '🔧 Spécialité', value: getSpecialiteLabel(specialite) },
          { name: '👤 Recruteur', value: `${interaction.user}` }
        )
        .setFooter({ text: 'Auto Exotic GTARP' })
        .setTimestamp();
      
      // Trouver le salon d'annonces
      const annonceChannel = interaction.guild.channels.cache.find(ch => ch.name === '📢・annonces-service');
      
      if (annonceChannel) {
        await annonceChannel.send({ embeds: [embedAnnonce] });
      }
      
      // Essayer d'envoyer un MP à l'utilisateur embauché
      try {
        await targetUser.send({
          content: "🎉 Félicitations! Vous avez été embauché chez Auto Exotic!",
          embeds: [
            new EmbedBuilder()
              .setTitle('🔧 Bienvenue dans l\'équipe!')
              .setColor('#00FF00')
              .setDescription(`Vous êtes maintenant officiellement ${getPosteLabel(poste)} chez Auto Exotic.`)
              .addFields(
                { name: '📅 Date d\'embauche', value: new Date().toLocaleDateString('fr-FR') },
                { name: '👔 Poste', value: getPosteLabel(poste) },
                { name: '🔧 Spécialité', value: getSpecialiteLabel(specialite) },
                { name: '👤 Recruteur', value: `${interaction.user.tag}` }
              )
              .setFooter({ text: 'Nous sommes ravis de vous compter parmi nous!' })
          ]
        });
      } catch (dmError) {
        console.log(`Impossible d'envoyer un MP à ${targetUser.tag}`);
      }
      
      // Répondre à l'utilisateur
      return interaction.reply({
        content: `✅ ${targetUser} a été embauché avec succès comme ${getPosteLabel(poste)}!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur lors de l\'embauche:', error);
      return interaction.reply({
        content: `❌ Une erreur est survenue lors de l'attribution du rôle: ${error.message}`,
        ephemeral: true
      });
    }
  },
};

// Fonction utilitaire pour obtenir le libellé du poste
function getPosteLabel(value) {
  const postes = {
    'chef': '👑 Chef Mécanicien',
    'senior': '🔧 Mécanicien Senior',
    'mecanicien': '🔧 Mécanicien',
    'junior': '🔧 Mécanicien Junior',
    'stagiaire': '🔰 Stagiaire'
  };
  
  return postes[value] || '🔰 Stagiaire';
}

// Fonction utilitaire pour obtenir le libellé de la spécialité
function getSpecialiteLabel(value) {
  const specialites = {
    'mecanique': '🔧 Mécanique générale',
    'carrosserie': '🎨 Carrosserie/Peinture',
    'performance': '🚀 Performance',
    'electronique': '🔌 Électronique',
    'Non spécifiée': '🔧 Polyvalent'
  };
  
  return specialites[value] || '🔧 Polyvalent';
}

// Fonction utilitaire pour obtenir le libellé de la spécialité
function getSpecialiteLabel(value) {
  const specialites = {
    'mecanique': '🔧 Mécanique générale',
    'carrosserie': '🎨 Carrosserie/Peinture',
    'performance': '🚀 Performance',
    'electronique': '🔌 Électronique',
    'Non spécifiée': '🔧 Polyvalent'
  };
  
  return specialites[value] || '🔧 Polyvalent';
}