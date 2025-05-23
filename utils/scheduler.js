// utils/scheduler.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

/**
 * Configure le planificateur de tâches
 * @param {Client} client - Instance du client Discord
 */
function setupScheduler(client) {
  console.log('🕒 Configuration du planificateur de tâches...');
  
  // Charger la configuration
  const config = require('../config.json');
  
  // Vérifier si les rapports automatiques sont activés
  if (!config.autoReports || !config.autoReports.enabled) {
    console.log('ℹ️ Rapports automatiques désactivés dans la configuration.');
    return;
  }
  
  // Configurer les intervalles pour les rapports
  setupDailyReport(client, config);
  setupWeeklyReport(client, config);
  setupMonthlyReport(client, config);
  
  console.log('✅ Planificateur de tâches configuré avec succès!');
}

/**
 * Configure le rapport journalier
 * @param {Client} client - Instance du client Discord
 * @param {Object} config - Configuration du bot
 */
function setupDailyReport(client, config) {
  if (!config.autoReports.daily.enabled) return;
  
  const channelId = config.autoReports.daily.channelId;
  const hour = config.autoReports.daily.hour || 23;
  const minute = config.autoReports.daily.minute || 0;
  
  // Calculer le délai initial
  const now = new Date();
  const nextReport = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  
  // Si l'heure est déjà passée, programmer pour le lendemain
  if (now > nextReport) {
    nextReport.setDate(nextReport.getDate() + 1);
  }
  
  const initialDelay = nextReport.getTime() - now.getTime();
  
  // Programmer le premier rapport
  setTimeout(() => {
    sendDailyReport(client, channelId);
    
    // Programmer les rapports suivants toutes les 24 heures
    setInterval(() => {
      sendDailyReport(client, channelId);
    }, 24 * 60 * 60 * 1000);
  }, initialDelay);
  
  console.log(`🕒 Rapport journalier programmé pour ${nextReport.toLocaleString('fr-FR')}`);
}

/**
 * Configure le rapport hebdomadaire
 * @param {Client} client - Instance du client Discord
 * @param {Object} config - Configuration du bot
 */
function setupWeeklyReport(client, config) {
  if (!config.autoReports.weekly.enabled) return;
  
  const channelId = config.autoReports.weekly.channelId;
  const dayOfWeek = config.autoReports.weekly.dayOfWeek || 0; // 0 = Dimanche
  const hour = config.autoReports.weekly.hour || 23;
  const minute = config.autoReports.weekly.minute || 0;
  
  // Calculer le délai initial
  const now = new Date();
  const nextReport = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  
  // Ajuster au jour de la semaine souhaité
  const currentDay = nextReport.getDay();
  const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
  
  nextReport.setDate(nextReport.getDate() + daysToAdd);
  
  // Si l'heure est déjà passée et c'est le même jour, programmer pour la semaine prochaine
  if (daysToAdd === 0 && now > nextReport) {
    nextReport.setDate(nextReport.getDate() + 7);
  }
  
  const initialDelay = nextReport.getTime() - now.getTime();
  
  // Programmer le premier rapport
  setTimeout(() => {
    sendWeeklyReport(client, channelId);
    
    // Programmer les rapports suivants toutes les semaines
    setInterval(() => {
      sendWeeklyReport(client, channelId);
    }, 7 * 24 * 60 * 60 * 1000);
  }, initialDelay);
  
  console.log(`🕒 Rapport hebdomadaire programmé pour ${nextReport.toLocaleString('fr-FR')}`);
}

/**
 * Configure le rapport mensuel
 * @param {Client} client - Instance du client Discord
 * @param {Object} config - Configuration du bot
 */
function setupMonthlyReport(client, config) {
  if (!config.autoReports.monthly.enabled) return;
  
  const channelId = config.autoReports.monthly.channelId;
  const dayOfMonth = config.autoReports.monthly.dayOfMonth || 1;
  const hour = config.autoReports.monthly.hour || 23;
  const minute = config.autoReports.monthly.minute || 0;
  
  // Calculer le délai initial
  const now = new Date();
  const nextReport = new Date(
    now.getFullYear(),
    now.getMonth(),
    dayOfMonth,
    hour,
    minute,
    0,
    0
  );
  
  // Si l'heure est déjà passée, programmer pour le mois prochain
  if (now > nextReport) {
    nextReport.setMonth(nextReport.getMonth() + 1);
  }
  
  const initialDelay = nextReport.getTime() - now.getTime();
  
  // Programmer le premier rapport
  setTimeout(() => {
    sendMonthlyReport(client, channelId);
    
    // Programmer les rapports suivants tous les mois (approximativement)
    setInterval(() => {
      sendMonthlyReport(client, channelId);
    }, 30 * 24 * 60 * 60 * 1000);
  }, initialDelay);
  
  console.log(`🕒 Rapport mensuel programmé pour ${nextReport.toLocaleString('fr-FR')}`);
}

/**
 * Envoie un rapport journalier
 * @param {Client} client - Instance du client Discord
 * @param {String} channelId - ID du canal où envoyer le rapport
 */
async function sendDailyReport(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error(`❌ Canal ${channelId} introuvable pour le rapport journalier.`);
      return;
    }
    
    const report = await generateReport('daily', channel.guild);
    
    await channel.send({
      content: '📊 **Rapport journalier automatique**',
      embeds: [report]
    });
    
    console.log(`✅ Rapport journalier envoyé dans #${channel.name}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du rapport journalier:', error);
  }
}

/**
 * Envoie un rapport hebdomadaire
 * @param {Client} client - Instance du client Discord
 * @param {String} channelId - ID du canal où envoyer le rapport
 */
async function sendWeeklyReport(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error(`❌ Canal ${channelId} introuvable pour le rapport hebdomadaire.`);
      return;
    }
    
    const report = await generateReport('weekly', channel.guild);
    
    await channel.send({
      content: '📊 **Rapport hebdomadaire automatique**',
      embeds: [report]
    });
    
    console.log(`✅ Rapport hebdomadaire envoyé dans #${channel.name}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du rapport hebdomadaire:', error);
  }
}

/**
 * Envoie un rapport mensuel
 * @param {Client} client - Instance du client Discord
 * @param {String} channelId - ID du canal où envoyer le rapport
 */
async function sendMonthlyReport(client, channelId) {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error(`❌ Canal ${channelId} introuvable pour le rapport mensuel.`);
      return;
    }
    
    const report = await generateReport('monthly', channel.guild);
    
    await channel.send({
      content: '📊 **Rapport mensuel automatique**',
      embeds: [report]
    });
    
    console.log(`✅ Rapport mensuel envoyé dans #${channel.name}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du rapport mensuel:', error);
  }
}

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
 * Obtient l'emoji correspondant à un type de service
 * @param {String} service - Le type de service
 * @returns {String} - L'emoji correspondant
 */
function getServiceEmoji(service) {
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

module.exports = { setupScheduler };