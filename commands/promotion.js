// commands/promotion.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion')
    .setDescription('Promouvoir ou rétrograder un membre de l\'équipe')
    .addUserOption(option => 
      option.setName('utilisateur')
        .setDescription('Utilisateur à promouvoir/rétrograder')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('nouveau_poste')
        .setDescription('Nouveau poste du mécanicien')
        .setRequired(true)
        .addChoices(
          { name: '👑 Chef Mécanicien', value: 'chef' },
          { name: '🔧 Mécanicien Senior', value: 'senior' },
          { name: '🔧 Mécanicien', value: 'mecanicien' },
          { name: '🔧 Mécanicien Junior', value: 'junior' },
          { name: '🔰 Stagiaire', value: 'stagiaire' }
        ))
    .addStringOption(option => 
      option.setName('raison')
        .setDescription('Raison de la promotion/rétrogradation')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Patron ou Chef Mécanicien
    const member = interaction.member;
    const hasPatronRole = member.roles.cache.some(role => role.name.includes('Patron'));
    const hasChefRole = member.roles.cache.some(role => role.name.includes('Chef Mécanicien'));
    
    // Seul le patron peut promouvoir quelqu'un au poste de chef mécanicien
    const nouveauPoste = interaction.options.getString('nouveau_poste');
    if (nouveauPoste === 'chef' && !hasPatronRole) {
      return interaction.reply({
        content: "❌ Seul le patron peut promouvoir quelqu'un au poste de Chef Mécanicien!",
        ephemeral: true
      });
    }
    
    // Le patron ou le chef mécanicien peuvent gérer les autres postes
    if (!hasPatronRole && !hasChefRole) {
      return interaction.reply({
        content: "❌ Seul le patron ou le chef mécanicien peuvent promouvoir/rétrograder du personnel!",
        ephemeral: true
      });
    }
    
    // Récupérer l'utilisateur cible
    const targetUser = interaction.options.getUser('utilisateur');
    const targetMember = await interaction.guild.members.fetch(targetUser.id);
    const raison = interaction.options.getString('raison') || "Aucune raison spécifiée";
    
    // Vérifier si la cible est un Chef Mécanicien (seul le patron peut le rétrograder)
    const isTargetChef = targetMember.roles.cache.some(role => role.name.includes('Chef Mécanicien'));
    if (isTargetChef && !hasPatronRole) {
      return interaction.reply({
        content: "❌ Seul le patron peut rétrograder un Chef Mécanicien!",
        ephemeral: true
      });
    }
    
    // Trouver tous les rôles de mécanicien
    const mechanicRoles = {
      'chef': interaction.guild.roles.cache.find(role => role.name.includes('Chef Mécanicien')),
      'senior': interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien Senior')),
      'mecanicien': interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien') && !role.name.includes('Senior') && !role.name.includes('Junior') && !role.name.includes('Chef')),
      'junior': interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien Junior')),
      'stagiaire': interaction.guild.roles.cache.find(role => role.name.includes('Stagiaire'))
    };
    
    // Vérifier si les rôles existent
    if (!mechanicRoles[nouveauPoste]) {
      return interaction.reply({
        content: `❌ Le rôle correspondant au poste ${getPosteLabel(nouveauPoste)} n'existe pas sur ce serveur.`,
        ephemeral: true
      });
    }
    
    // Vérifier si l'utilisateur a déjà un rôle de mécanicien
    const hasMechanicRole = Object.values(mechanicRoles).some(role => 
      role && targetMember.roles.cache.has(role.id)
    );
    
    if (!hasMechanicRole) {
      return interaction.reply({
        content: `❌ ${targetUser.username} ne fait pas partie de l'équipe d'Auto Exotic! Utilisez la commande d'embauche à la place.`,
        ephemeral: true
      });
    }
    
    // Récupérer le poste actuel de la personne
    let currentPosition = "Inconnu";
    for (const [key, role] of Object.entries(mechanicRoles)) {
      if (role && targetMember.roles.cache.has(role.id)) {
        currentPosition = getPosteLabel(key);
        break;
      }
    }
    
    // Vérifier si c'est le même poste
    if (mechanicRoles[nouveauPoste] && targetMember.roles.cache.has(mechanicRoles[nouveauPoste].id)) {
      return interaction.reply({
        content: `❌ ${targetUser.username} occupe déjà le poste de ${getPosteLabel(nouveauPoste)}!`,
        ephemeral: true
      });
    }
    
    // Déterminer si c'est une promotion ou une rétrogradation
    const positionValues = {
      'chef': 5,
      'senior': 4,
      'mecanicien': 3,
      'junior': 2,
      'stagiaire': 1
    };
    
    let currentPositionValue = 0;
    for (const [key, role] of Object.entries(mechanicRoles)) {
      if (role && targetMember.roles.cache.has(role.id)) {
        currentPositionValue = positionValues[key];
        break;
      }
    }
    
    const isPromotion = positionValues[nouveauPoste] > currentPositionValue;
    const actionType = isPromotion ? 'Promotion' : 'Rétrogradation';
    const actionColor = isPromotion ? '#00FF00' : '#FFA500';
    
    // Retirer tous les rôles de mécanicien et ajouter le nouveau
    try {
      // Retirer les anciens rôles
      for (const role of Object.values(mechanicRoles)) {
        if (role && targetMember.roles.cache.has(role.id)) {
          await targetMember.roles.remove(role);
        }
      }
      
      // Ajouter le nouveau rôle
      await targetMember.roles.add(mechanicRoles[nouveauPoste]);
      
      // Créer un embed pour l'annonce
      const embedAnnonce = new EmbedBuilder()
        .setTitle(`${isPromotion ? '🔼' : '🔽'} ${actionType}`)
        .setColor(actionColor)
        .setDescription(`${targetUser} a ${isPromotion ? 'été promu' : 'été rétrogradé'} au sein d'Auto Exotic!`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '📅 Date', value: new Date().toLocaleDateString('fr-FR') },
          { name: '👔 Ancien poste', value: currentPosition },
          { name: '👔 Nouveau poste', value: getPosteLabel(nouveauPoste) },
          { name: '❓ Raison', value: raison },
          { name: '👤 Décision prise par', value: `${interaction.user}` }
        )
        .setFooter({ text: 'Auto Exotic GTARP' })
        .setTimestamp();
      
      // Trouver le salon d'annonces
      const annonceChannel = interaction.guild.channels.cache.find(ch => ch.name === '📢annonces');
      
      if (annonceChannel) {
        await annonceChannel.send({ embeds: [embedAnnonce] });
      }
      
      // Essayer d'envoyer un MP à l'utilisateur
      try {
        await targetUser.send({
          content: `📝 Notification de ${actionType.toLowerCase()} d'Auto Exotic`,
          embeds: [
            new EmbedBuilder()
              .setTitle(`${isPromotion ? '🔼' : '🔽'} Vous avez ${isPromotion ? 'été promu' : 'été rétrogradé'}`)
              .setColor(actionColor)
              .setDescription(`Votre statut au sein d'Auto Exotic a changé.`)
              .addFields(
                { name: '📅 Date', value: new Date().toLocaleDateString('fr-FR') },
                { name: '👔 Ancien poste', value: currentPosition },
                { name: '👔 Nouveau poste', value: getPosteLabel(nouveauPoste) },
                { name: '❓ Raison', value: raison },
                { name: '👤 Décision prise par', value: `${interaction.user.tag}` }
              )
              .setFooter({ text: isPromotion ? 'Félicitations pour cette évolution!' : 'Nous espérons vous voir progresser bientôt.' })
          ]
        });
      } catch (dmError) {
        console.log(`Impossible d'envoyer un MP à ${targetUser.tag}`);
      }
      
      // Répondre à l'utilisateur
      return interaction.reply({
        content: `✅ ${targetUser} a ${isPromotion ? 'été promu' : 'été rétrogradé'} avec succès au poste de ${getPosteLabel(nouveauPoste)}.`,
        ephemeral: true
      });
    } catch (error) {
      console.error(`Erreur lors de la ${actionType.toLowerCase()}:`, error);
      return interaction.reply({
        content: `❌ Une erreur est survenue: ${error.message}`,
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