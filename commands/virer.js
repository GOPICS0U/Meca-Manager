// commands/virer.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('virer')
    .setDescription('Licencier un membre de l\'équipe')
    .addUserOption(option => 
      option.setName('utilisateur')
        .setDescription('Utilisateur à licencier')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('raison')
        .setDescription('Raison du licenciement')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Patron ou Chef Mécanicien
    const member = interaction.member;
    const hasPatronRole = member.roles.cache.some(role => role.name.includes('Patron'));
    const hasChefRole = member.roles.cache.some(role => role.name.includes('Chef Mécanicien'));
    
    if (!hasPatronRole && !hasChefRole) {
      return interaction.reply({
        content: "❌ Seul le patron ou le chef mécanicien peuvent licencier du personnel!",
        ephemeral: true
      });
    }
    
    // Récupérer l'utilisateur cible
    const targetUser = interaction.options.getUser('utilisateur');
    const targetMember = await interaction.guild.members.fetch(targetUser.id);
    const raison = interaction.options.getString('raison') || "Aucune raison spécifiée";
    
    // Vérifier si la cible est un Chef Mécanicien (seul le patron peut licencier un chef)
    const isTargetChef = targetMember.roles.cache.some(role => role.name.includes('Chef Mécanicien'));
    if (isTargetChef && !hasPatronRole) {
      return interaction.reply({
        content: "❌ Seul le patron peut licencier un Chef Mécanicien!",
        ephemeral: true
      });
    }
    
    // Trouver tous les rôles de mécanicien
    const mechanicRoles = [
      interaction.guild.roles.cache.find(role => role.name.includes('Chef Mécanicien')),
      interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien Senior')),
      interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien') && !role.name.includes('Senior') && !role.name.includes('Junior') && !role.name.includes('Chef')),
      interaction.guild.roles.cache.find(role => role.name.includes('Mécanicien Junior')),
      interaction.guild.roles.cache.find(role => role.name.includes('Stagiaire'))
    ].filter(role => role !== undefined);
    
    if (mechanicRoles.length === 0) {
      return interaction.reply({
        content: "❌ Aucun rôle de mécanicien n'existe sur ce serveur.",
        ephemeral: true
      });
    }
    
    // Vérifier si l'utilisateur a au moins un des rôles de mécanicien
    const targetRoles = targetMember.roles.cache;
    const hasAnyMechanicRole = mechanicRoles.some(role => targetRoles.has(role.id));
    
    if (!hasAnyMechanicRole) {
      return interaction.reply({
        content: `❌ ${targetUser.username} ne fait pas partie de l'équipe d'Auto Exotic!`,
        ephemeral: true
      });
    }
    
    // Récupérer le poste actuel de la personne
    let currentPosition = "membre de l'équipe";
    for (const role of mechanicRoles) {
      if (targetRoles.has(role.id)) {
        currentPosition = role.name.replace(/^🔧 |^🔰 |^👑 /, ''); // Enlever les emojis
        break;
      }
    }
    
    // Retirer tous les rôles de mécanicien à l'utilisateur
    try {
      for (const role of mechanicRoles) {
        if (targetRoles.has(role.id)) {
          await targetMember.roles.remove(role);
        }
      }
      
      // Créer un embed pour l'annonce
      const embedAnnonce = new EmbedBuilder()
        .setTitle('🔴 Licenciement')
        .setColor('#FF0000')
        .setDescription(`${targetUser} ne fait plus partie de l'équipe d'Auto Exotic.`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '📅 Date du licenciement', value: new Date().toLocaleDateString('fr-FR') },
          { name: '👔 Ancien poste', value: currentPosition },
          { name: '❓ Raison', value: raison },
          { name: '👤 Décision prise par', value: `${interaction.user}` }
        )
        .setFooter({ text: 'Auto Exotic GTARP' })
        .setTimestamp();
      
      // Trouver le salon d'annonces
      const annonceChannel = interaction.guild.channels.cache.find(ch => ch.name === '📢・annonces-service');
      
      if (annonceChannel) {
        await annonceChannel.send({ embeds: [embedAnnonce] });
      }
      
      // Essayer d'envoyer un MP à l'utilisateur licencié
      try {
        await targetUser.send({
          content: "📝 Notification de licenciement d'Auto Exotic",
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ Vous avez été licencié')
              .setColor('#FF0000')
              .setDescription(`Vous avez été licencié d'Auto Exotic.`)
              .addFields(
                { name: '📅 Date', value: new Date().toLocaleDateString('fr-FR') },
                { name: '👔 Ancien poste', value: currentPosition },
                { name: '❓ Raison', value: raison },
                { name: '👤 Décision prise par', value: `${interaction.user.tag}` }
              )
              .setFooter({ text: 'Nous vous remercions pour votre travail.' })
          ]
        });
      } catch (dmError) {
        console.log(`Impossible d'envoyer un MP à ${targetUser.tag}`);
      }
      
      // Répondre à l'utilisateur
      return interaction.reply({
        content: `✅ ${targetUser} a été licencié avec succès.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Erreur lors du licenciement:', error);
      return interaction.reply({
        content: `❌ Une erreur est survenue lors du retrait du rôle: ${error.message}`,
        ephemeral: true
      });
    }
  },
};