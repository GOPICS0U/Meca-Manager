// commands/rapport.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createReportEmbed, EMOJIS, getServiceEmoji } = require('../utils/embedStyles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rapport')
    .setDescription('Générer un rapport d\'activité du garage')
    .addStringOption(option =>
      option.setName('periode')
        .setDescription('Période du rapport')
        .setRequired(true)
        .addChoices(
          { name: 'Journalier', value: 'daily' },
          { name: 'Hebdomadaire', value: 'weekly' },
          { name: 'Mensuel', value: 'monthly' }
        ))
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal où envoyer le rapport (optionnel)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Patron ou Mécano
    const member = interaction.member;
    const hasRole = member.roles.cache.some(role => 
      role.name.includes('Patron') || role.name.includes('Mécano')
    );
    
    if (!hasRole) {
      return interaction.reply({
        content: "❌ Seuls les mécaniciens et le patron peuvent générer des rapports!",
        ephemeral: true
      });
    }
    
    await interaction.deferReply();
    
    // Récupérer les options
    const periode = interaction.options.getString('periode');
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    
    // Générer le rapport
    const rapport = await generateReport(periode, interaction.guild);
    
    // Envoyer le rapport
    if (channel.id !== interaction.channelId) {
      await channel.send({ embeds: [rapport] });
      await interaction.editReply({
        content: `✅ Rapport ${getPeriodeName(periode)} envoyé dans ${channel}!`,
        ephemeral: true
      });
    } else {
      await interaction.editReply({ embeds: [rapport] });
    }
  },
};

/**
 * Génère un rapport d'activité
 * @param {String} periode - La période du rapport (daily, weekly, monthly)
 * @param {Guild} guild - Le serveur Discord
 * @returns {EmbedBuilder} - L'embed du rapport
 */
async function generateReport(periode, guild) {
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
  
  // Définir la période
  const now = Date.now();
  let startTime;
  let periodName;
  
  switch (periode) {
    case 'daily':
      startTime = now - (24 * 60 * 60 * 1000); // 24 heures
      periodName = "Journalier";
      break;
    case 'weekly':
      startTime = now - (7 * 24 * 60 * 60 * 1000); // 7 jours
      periodName = "Hebdomadaire";
      break;
    case 'monthly':
      startTime = now - (30 * 24 * 60 * 60 * 1000); // 30 jours
      periodName = "Mensuel";
      break;
  }
  
  // Filtrer les données par période
  const periodInvoices = invoices.filter(inv => inv.createdAt > startTime);
  const periodRepairs = repairs.filter(rep => rep.timestamp > startTime);
  
  // Calculer les statistiques
  const totalInvoices = periodInvoices.length;
  const paidInvoices = periodInvoices.filter(inv => inv.status === 'paid').length;
  const disputedInvoices = periodInvoices.filter(inv => inv.status === 'disputed').length;
  const pendingInvoices = periodInvoices.filter(inv => inv.status === 'pending').length;
  
  const totalRevenue = periodInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.montant, 0);
  
  const totalRepairs = periodRepairs.length;
  const completedRepairs = periodRepairs.filter(rep => rep.status === 'completed').length;
  const inProgressRepairs = periodRepairs.filter(rep => rep.status === 'in_progress').length;
  const pendingRepairs = periodRepairs.filter(rep => rep.status === 'pending').length;
  
  // Calculer le taux de satisfaction
  const satisfactionRate = totalInvoices > 0 ? Math.round(((totalInvoices - disputedInvoices) / totalInvoices) * 100) : 0;
  
  // Calculer le revenu moyen par facture
  const avgInvoiceAmount = paidInvoices > 0 ? Math.round(totalRevenue / paidInvoices) : 0;
  
  // Trouver le top mécanicien (celui qui a généré le plus de revenus)
  const mechanicRevenues = {};
  
  periodInvoices
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
  
  // Calculer les revenus par type de service (en utilisant la description)
  const serviceTypes = {
    'Réparation': 0,
    'Peinture': 0,
    'Performance': 0,
    'Carrosserie': 0,
    'Autre': 0
  };
  
  periodInvoices
    .filter(inv => inv.status === 'paid')
    .forEach(inv => {
      const desc = inv.description.toLowerCase();
      
      if (desc.includes('répara') || desc.includes('repara')) {
        serviceTypes['Réparation'] += inv.montant;
      } else if (desc.includes('peinture') || desc.includes('couleur')) {
        serviceTypes['Peinture'] += inv.montant;
      } else if (desc.includes('performance') || desc.includes('moteur') || desc.includes('turbo')) {
        serviceTypes['Performance'] += inv.montant;
      } else if (desc.includes('carrosserie') || desc.includes('jante') || desc.includes('kit')) {
        serviceTypes['Carrosserie'] += inv.montant;
      } else {
        serviceTypes['Autre'] += inv.montant;
      }
    });
  
  // Créer l'embed du rapport
  const reportEmbed = new EmbedBuilder()
    .setTitle(`📊 Rapport ${periodName} - Auto Exotic`)
    .setDescription(`Période: du ${new Date(startTime).toLocaleDateString('fr-FR')} au ${new Date().toLocaleDateString('fr-FR')}`)
    .setColor('#FF5500')
    .addFields(
      { name: '💰 Revenus', value: `Total: ${totalRevenue}$\nMoyenne par facture: ${avgInvoiceAmount}$`, inline: true },
      { name: '🧾 Factures', value: `Total: ${totalInvoices}\nPayées: ${paidInvoices}\nContestées: ${disputedInvoices}\nEn attente: ${pendingInvoices}`, inline: true },
      { name: '🔧 Réparations', value: `Total: ${totalRepairs}\nTerminées: ${completedRepairs}\nEn cours: ${inProgressRepairs}\nEn attente: ${pendingRepairs}`, inline: true },
      { name: '📈 Performance', value: `Taux de satisfaction: ${satisfactionRate}%` }
    )
    .setFooter({ text: `Auto Exotic GTARP | Rapport généré le ${new Date().toLocaleString('fr-FR')}` })
    .setTimestamp();
  
  // Ajouter les revenus par service
  let serviceText = '';
  for (const [service, montant] of Object.entries(serviceTypes)) {
    if (montant > 0) {
      const emoji = getServiceEmoji(service);
      serviceText += `${emoji} ${service}: ${montant}$\n`;
    }
  }
  
  if (serviceText) {
    reportEmbed.addFields({ name: '📊 Revenus par service', value: serviceText });
  }
  
  // Ajouter le top des mécaniciens
  if (topMechanics.length > 0) {
    let topMechanicsText = '';
    
    topMechanics.forEach((mech, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      topMechanicsText += `${medal} ${mech.name}: ${mech.revenue}$ (${mech.invoices} factures)\n`;
    });
    
    reportEmbed.addFields({ name: '🏆 Top mécaniciens', value: topMechanicsText || 'Aucune donnée disponible' });
  }
  
  return reportEmbed;
}

/**
 * Obtient le nom de la période
 * @param {String} periode - Code de la période
 * @returns {String} - Nom de la période
 */
function getPeriodeName(periode) {
  switch (periode) {
    case 'daily':
      return 'journalier';
    case 'weekly':
      return 'hebdomadaire';
    case 'monthly':
      return 'mensuel';
    default:
      return '';
  }
}

/**
 * Obtient l'emoji correspondant à un type de service
 * @param {String} service - Le type de service
 * @returns {String} - L'emoji correspondant
 */
function getCustomServiceEmoji(service) {
  switch (service) {
    case 'Réparation':
      return '🔧';
    case 'Peinture':
      return '🎨';
    case 'Performance':
      return '🚀';
    case 'Carrosserie':
      return '🛠️';
    case 'Autre':
      return '📦';
    default:
      return '❓';
  }
}