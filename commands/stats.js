// commands/stats.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createReportEmbed, EMOJIS, getServiceEmoji } = require('../utils/embedStyles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Afficher les statistiques des mécaniciens')
    .addSubcommand(subcommand =>
      subcommand
        .setName('mecano')
        .setDescription('Statistiques d\'un mécanicien spécifique')
        .addUserOption(option => 
          option.setName('utilisateur')
            .setDescription('Le mécanicien dont vous voulez voir les statistiques')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('garage')
        .setDescription('Statistiques globales du garage')
        .addStringOption(option =>
          option.setName('periode')
            .setDescription('Période pour les statistiques')
            .setRequired(false)
            .addChoices(
              { name: 'Aujourd\'hui', value: 'today' },
              { name: 'Cette semaine', value: 'week' },
              { name: 'Ce mois', value: 'month' },
              { name: 'Tout', value: 'all' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reparations')
        .setDescription('Statistiques des réparations')
        .addStringOption(option =>
          option.setName('statut')
            .setDescription('Filtrer par statut')
            .setRequired(false)
            .addChoices(
              { name: 'En attente', value: 'pending' },
              { name: 'En cours', value: 'in_progress' },
              { name: 'Terminées', value: 'completed' },
              { name: 'Refusées', value: 'rejected' },
              { name: 'Toutes', value: 'all' }
            )))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Mécano ou Patron
    const member = interaction.member;
    const hasRole = member.roles.cache.some(role => 
      role.name.includes('Mécano') || role.name.includes('Patron')
    );
    
    if (!hasRole) {
      return interaction.reply({
        content: "❌ Seuls les mécaniciens et le patron peuvent consulter les statistiques!",
        ephemeral: true
      });
    }
    
    // Récupérer le sous-commande
    const subcommand = interaction.options.getSubcommand();
    
    // Traiter selon la sous-commande
    switch (subcommand) {
      case 'mecano':
        await showMechanicStats(interaction);
        break;
      case 'garage':
        await showGarageStats(interaction);
        break;
      case 'reparations':
        await showRepairStats(interaction);
        break;
    }
  },
};

/**
 * Affiche les statistiques d'un mécanicien spécifique
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function showMechanicStats(interaction) {
  await interaction.deferReply();
  
  // Récupérer l'utilisateur cible
  const targetUser = interaction.options.getUser('utilisateur');
  
  // Vérifier si l'utilisateur est un mécanicien
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
  const isMechanic = targetMember.roles.cache.some(role => 
    role.name.includes('Mécano') || role.name.includes('Patron')
  );
  
  if (!isMechanic && !interaction.member.roles.cache.some(role => role.name.includes('Patron'))) {
    return interaction.editReply({
      content: `❌ ${targetUser.username} n'est pas un mécanicien chez Auto Exotic!`,
      ephemeral: true
    });
  }
  
  // Charger les données des factures
  const invoicesPath = path.join(__dirname, '../data/invoices.json');
  const repairsPath = path.join(__dirname, '../data/repairs.json');
  
  let invoices = [];
  let repairs = [];
  
  if (fs.existsSync(invoicesPath)) {
    const data = fs.readFileSync(invoicesPath, 'utf8');
    invoices = JSON.parse(data);
  }
  
  if (fs.existsSync(repairsPath)) {
    const data = fs.readFileSync(repairsPath, 'utf8');
    repairs = JSON.parse(data);
  }
  
  // Filtrer les données pour ce mécanicien
  const mechanicInvoices = invoices.filter(inv => inv.mechanicId === targetUser.id);
  const mechanicRepairs = repairs.filter(rep => rep.assignedTo === targetUser.id);
  
  // Calculer les statistiques
  const totalInvoices = mechanicInvoices.length;
  const paidInvoices = mechanicInvoices.filter(inv => inv.status === 'paid').length;
  const disputedInvoices = mechanicInvoices.filter(inv => inv.status === 'disputed').length;
  const pendingInvoices = mechanicInvoices.filter(inv => inv.status === 'pending').length;
  
  const totalRevenue = mechanicInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.montant, 0);
  
  const totalRepairs = mechanicRepairs.length;
  const completedRepairs = mechanicRepairs.filter(rep => rep.status === 'completed').length;
  const inProgressRepairs = mechanicRepairs.filter(rep => rep.status === 'in_progress').length;
  
  // Calculer les statistiques par période
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  const todayRevenue = mechanicInvoices
    .filter(inv => inv.status === 'paid' && inv.paidAt > oneDayAgo)
    .reduce((sum, inv) => sum + inv.montant, 0);
  
  const weekRevenue = mechanicInvoices
    .filter(inv => inv.status === 'paid' && inv.paidAt > oneWeekAgo)
    .reduce((sum, inv) => sum + inv.montant, 0);
  
  const monthRevenue = mechanicInvoices
    .filter(inv => inv.status === 'paid' && inv.paidAt > oneMonthAgo)
    .reduce((sum, inv) => sum + inv.montant, 0);
  
  // Calculer l'efficacité (% de réparations terminées / total)
  const efficiency = totalRepairs > 0 ? Math.round((completedRepairs / totalRepairs) * 100) : 0;
  
  // Calculer le taux de satisfaction (% de factures payées sans contestation)
  const satisfactionRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;
  
  // Créer l'embed
  const statsEmbed = new EmbedBuilder()
    .setTitle(`📊 Statistiques de ${targetUser.username}`)
    .setColor('#00AAFF')
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '💰 Revenus générés', value: `Total: ${totalRevenue}$\nAujourd'hui: ${todayRevenue}$\nCette semaine: ${weekRevenue}$\nCe mois: ${monthRevenue}$`, inline: true },
      { name: '🧾 Factures', value: `Total: ${totalInvoices}\nPayées: ${paidInvoices}\nContestées: ${disputedInvoices}\nEn attente: ${pendingInvoices}`, inline: true },
      { name: '🔧 Réparations', value: `Total: ${totalRepairs}\nTerminées: ${completedRepairs}\nEn cours: ${inProgressRepairs}`, inline: true },
      { name: '📈 Performance', value: `Efficacité: ${efficiency}%\nSatisfaction: ${satisfactionRate}%` }
    )
    .setFooter({ text: `Auto Exotic GTARP | Statistiques générées le ${new Date().toLocaleDateString('fr-FR')}` })
    .setTimestamp();
  
  // Ajouter une recommandation de salaire (pour le patron)
  if (interaction.member.roles.cache.some(role => role.name.includes('Patron'))) {
    // Calculer un salaire recommandé basé sur les performances
    // Formule: Base de 1000$ + 10% des revenus de la semaine + bonus d'efficacité
    const baseSalary = 1000;
    const revenueBonus = weekRevenue * 0.1;
    const efficiencyBonus = (efficiency / 100) * 500;
    const recommendedSalary = Math.round(baseSalary + revenueBonus + efficiencyBonus);
    
    statsEmbed.addFields({ 
      name: '💵 Recommandation de salaire', 
      value: `${recommendedSalary}$ par semaine\n*(Base: 1000$ + 10% des revenus + bonus d'efficacité)*` 
    });
  }
  
  // Envoyer la réponse
  await interaction.editReply({ embeds: [statsEmbed] });
}

/**
 * Affiche les statistiques globales du garage
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function showGarageStats(interaction) {
  await interaction.deferReply();
  
  // Récupérer la période
  const periode = interaction.options.getString('periode') || 'all';
  
  // Charger les données
  const invoicesPath = path.join(__dirname, '../data/invoices.json');
  const repairsPath = path.join(__dirname, '../data/repairs.json');
  
  let invoices = [];
  let repairs = [];
  
  if (fs.existsSync(invoicesPath)) {
    const data = fs.readFileSync(invoicesPath, 'utf8');
    invoices = JSON.parse(data);
  }
  
  if (fs.existsSync(repairsPath)) {
    const data = fs.readFileSync(repairsPath, 'utf8');
    repairs = JSON.parse(data);
  }
  
  // Filtrer par période
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  let filteredInvoices = invoices;
  let filteredRepairs = repairs;
  let periodeLabel = 'Toutes périodes';
  
  switch (periode) {
    case 'today':
      filteredInvoices = invoices.filter(inv => inv.createdAt > oneDayAgo);
      filteredRepairs = repairs.filter(rep => rep.timestamp > oneDayAgo);
      periodeLabel = 'Aujourd\'hui';
      break;
    case 'week':
      filteredInvoices = invoices.filter(inv => inv.createdAt > oneWeekAgo);
      filteredRepairs = repairs.filter(rep => rep.timestamp > oneWeekAgo);
      periodeLabel = 'Cette semaine';
      break;
    case 'month':
      filteredInvoices = invoices.filter(inv => inv.createdAt > oneMonthAgo);
      filteredRepairs = repairs.filter(rep => rep.timestamp > oneMonthAgo);
      periodeLabel = 'Ce mois';
      break;
  }
  
  // Calculer les statistiques
  const totalInvoices = filteredInvoices.length;
  const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid').length;
  const disputedInvoices = filteredInvoices.filter(inv => inv.status === 'disputed').length;
  const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'pending').length;
  
  const totalRevenue = filteredInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.montant, 0);
  
  const totalRepairs = filteredRepairs.length;
  const completedRepairs = filteredRepairs.filter(rep => rep.status === 'completed').length;
  const inProgressRepairs = filteredRepairs.filter(rep => rep.status === 'in_progress').length;
  const pendingRepairs = filteredRepairs.filter(rep => rep.status === 'pending').length;
  
  // Calculer le revenu moyen par facture
  const averageInvoice = paidInvoices > 0 ? Math.round(totalRevenue / paidInvoices) : 0;
  
  // Calculer le taux de satisfaction global
  const satisfactionRate = totalInvoices > 0 ? Math.round(((totalInvoices - disputedInvoices) / totalInvoices) * 100) : 0;
  
  // Trouver le top mécanicien (celui qui a généré le plus de revenus)
  const mechanicRevenues = {};
  
  filteredInvoices
    .filter(inv => inv.status === 'paid')
    .forEach(inv => {
      if (!mechanicRevenues[inv.mechanicId]) {
        mechanicRevenues[inv.mechanicId] = {
          id: inv.mechanicId,
          name: inv.mechanicName,
          revenue: 0,
          invoices: 0
        };
      }
      
      mechanicRevenues[inv.mechanicId].revenue += inv.montant;
      mechanicRevenues[inv.mechanicId].invoices++;
    });
  
  const topMechanics = Object.values(mechanicRevenues)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);
  
  // Créer l'embed
  const statsEmbed = new EmbedBuilder()
    .setTitle(`📊 Statistiques du garage Auto Exotic`)
    .setDescription(`Période: **${periodeLabel}**`)
    .setColor('#FF5500')
    .addFields(
      { name: '💰 Revenus', value: `Total: ${totalRevenue}$\nMoyenne par facture: ${averageInvoice}$`, inline: true },
      { name: '🧾 Factures', value: `Total: ${totalInvoices}\nPayées: ${paidInvoices}\nContestées: ${disputedInvoices}\nEn attente: ${pendingInvoices}`, inline: true },
      { name: '🔧 Réparations', value: `Total: ${totalRepairs}\nTerminées: ${completedRepairs}\nEn cours: ${inProgressRepairs}\nEn attente: ${pendingRepairs}`, inline: true },
      { name: '📈 Performance', value: `Taux de satisfaction: ${satisfactionRate}%` }
    )
    .setFooter({ text: `Auto Exotic GTARP | Statistiques générées le ${new Date().toLocaleDateString('fr-FR')}` })
    .setTimestamp();
  
  // Ajouter le top des mécaniciens
  if (topMechanics.length > 0) {
    let topMechanicsText = '';
    
    topMechanics.forEach((mech, index) => {
      topMechanicsText += `${index + 1}. ${mech.name}: ${mech.revenue}$ (${mech.invoices} factures)\n`;
    });
    
    statsEmbed.addFields({ name: '🏆 Top mécaniciens', value: topMechanicsText || 'Aucune donnée disponible' });
  }
  
  // Envoyer la réponse
  await interaction.editReply({ embeds: [statsEmbed] });
}

/**
 * Affiche les statistiques des réparations
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function showRepairStats(interaction) {
  await interaction.deferReply();
  
  // Récupérer le statut
  const status = interaction.options.getString('statut') || 'all';
  
  // Charger les données
  const repairsPath = path.join(__dirname, '../data/repairs.json');
  
  let repairs = [];
  
  if (fs.existsSync(repairsPath)) {
    const data = fs.readFileSync(repairsPath, 'utf8');
    repairs = JSON.parse(data);
  }
  
  // Filtrer par statut
  let filteredRepairs = repairs;
  let statusLabel = 'Toutes';
  
  if (status !== 'all') {
    filteredRepairs = repairs.filter(rep => rep.status === status);
    
    switch (status) {
      case 'pending':
        statusLabel = 'En attente';
        break;
      case 'in_progress':
        statusLabel = 'En cours';
        break;
      case 'completed':
        statusLabel = 'Terminées';
        break;
      case 'rejected':
        statusLabel = 'Refusées';
        break;
    }
  }
  
  // Trier par date (plus récent en premier)
  filteredRepairs.sort((a, b) => b.timestamp - a.timestamp);
  
  // Limiter à 10 réparations pour l'affichage
  const displayRepairs = filteredRepairs.slice(0, 10);
  
  // Créer l'embed
  const statsEmbed = new EmbedBuilder()
    .setTitle(`🔧 Liste des réparations`)
    .setDescription(`Statut: **${statusLabel}** | Total: **${filteredRepairs.length}** réparations`)
    .setColor('#00AAFF');
  
  // Ajouter les réparations à l'embed
  if (displayRepairs.length > 0) {
    displayRepairs.forEach((repair, index) => {
      const date = new Date(repair.timestamp).toLocaleDateString('fr-FR');
      const statusEmoji = getStatusEmoji(repair.status);
      const assignedTo = repair.assignedTo ? `<@${repair.assignedTo}>` : 'Non assigné';
      
      statsEmbed.addFields({
        name: `${statusEmoji} Réparation #${repair.id}`,
        value: `🚗 Véhicule: ${repair.vehicule}\n🔧 Problème: ${repair.probleme}\n👤 Client: <@${repair.userId}>\n👨‍🔧 Mécanicien: ${assignedTo}\n📅 Date: ${date}`
      });
    });
  } else {
    statsEmbed.setDescription(`Aucune réparation trouvée avec le statut: **${statusLabel}**`);
  }
  
  statsEmbed.setFooter({ text: `Auto Exotic GTARP | Page 1/${Math.ceil(filteredRepairs.length / 10) || 1}` });
  
  // Envoyer la réponse
  await interaction.editReply({ embeds: [statsEmbed] });
}

/**
 * Obtient l'emoji correspondant au statut d'une réparation
 * @param {String} status - Le statut de la réparation
 * @returns {String} - L'emoji correspondant
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'in_progress':
      return '🔧';
    case 'completed':
      return '✅';
    case 'rejected':
      return '❌';
    case 'accepted':
      return '👍';
    default:
      return '❓';
  }
}