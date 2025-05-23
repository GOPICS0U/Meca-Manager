// commands/panel.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Afficher le panel d\'administration du garage')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Patron
    const member = interaction.member;
    const hasPatronRole = member.roles.cache.some(role => role.name.includes('Patron'));

    if (!hasPatronRole) {
      return interaction.reply({
        content: "❌ Seul le patron peut accéder au panel d'administration!",
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // Créer le panel principal
    const panelEmbed = new EmbedBuilder()
      .setTitle('🏢 Panel d\'Administration Auto Exotic')
      .setDescription('Bienvenue dans le panel d\'administration du garage. Utilisez les boutons ci-dessous pour accéder aux différentes fonctionnalités.')
      .setColor('#FF0000')
      .addFields(
        { name: '📊 Statistiques', value: 'Consultez les statistiques détaillées du garage et des mécaniciens.' },
        { name: '💰 Finances', value: 'Gérez les revenus, les dépenses et les salaires des employés.' },
        { name: '👥 Gestion des employés', value: 'Consultez les performances des mécaniciens et gérez les salaires.' },
        { name: '🔧 Réparations', value: 'Suivez l\'état des réparations en cours et passées.' }
      )
      .setFooter({ text: 'Auto Exotic GTARP | Panel d\'administration' })
      .setTimestamp();

    // Créer les boutons pour le panel
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_stats')
          .setLabel('📊 Statistiques')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_finances')
          .setLabel('💰 Finances')
          .setStyle(ButtonStyle.Success),
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_employees')
          .setLabel('👥 Employés')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_repairs')
          .setLabel('🔧 Réparations')
          .setStyle(ButtonStyle.Danger),
      );

    // Envoyer le panel
    await interaction.editReply({
      embeds: [panelEmbed],
      components: [row1, row2]
    });

    // Créer un collecteur pour les interactions avec les boutons
    const filter = i => i.customId.startsWith('panel_') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutes

    collector.on('collect', async i => {
      await i.deferUpdate();

      switch (i.customId) {
        case 'panel_stats':
          await showStatsPanel(i, interaction);
          break;
        case 'panel_finances':
          await showFinancesPanel(i, interaction);
          break;
        case 'panel_employees':
          await showEmployeesPanel(i, interaction);
          break;
        case 'panel_repairs':
          await showRepairsPanel(i, interaction);
          break;
      }
    });

    collector.on('end', () => {
      interaction.editReply({
        components: []
      }).catch(console.error);
    });
  },
};

/**
 * Affiche le panel des statistiques
 * @param {ButtonInteraction} i - L'interaction bouton
 * @param {CommandInteraction} originalInteraction - L'interaction de commande originale
 */
async function showStatsPanel(i, originalInteraction) {
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

  // Calculer les statistiques
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const disputedInvoices = invoices.filter(inv => inv.status === 'disputed').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.montant, 0);

  const totalRepairs = repairs.length;
  const completedRepairs = repairs.filter(rep => rep.status === 'completed').length;
  const inProgressRepairs = repairs.filter(rep => rep.status === 'in_progress').length;
  const pendingRepairs = repairs.filter(rep => rep.status === 'pending').length;

  // Calculer les statistiques par période
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

  const todayRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.paidAt > oneDayAgo)
    .reduce((sum, inv) => sum + inv.montant, 0);

  const weekRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.paidAt > oneWeekAgo)
    .reduce((sum, inv) => sum + inv.montant, 0);

  const monthRevenue = invoices
    .filter(inv => inv.status === 'paid' && inv.paidAt > oneMonthAgo)
    .reduce((sum, inv) => sum + inv.montant, 0);

  // Calculer le taux de satisfaction
  const satisfactionRate = totalInvoices > 0 ? Math.round(((totalInvoices - disputedInvoices) / totalInvoices) * 100) : 0;

  // Créer l'embed
  const statsEmbed = new EmbedBuilder()
    .setTitle('📊 Statistiques du Garage')
    .setColor('#4287f5')
    .addFields(
      { name: '💰 Revenus', value: `Total: ${totalRevenue}$\nAujourd'hui: ${todayRevenue}$\nCette semaine: ${weekRevenue}$\nCe mois: ${monthRevenue}$`, inline: true },
      { name: '🧾 Factures', value: `Total: ${totalInvoices}\nPayées: ${paidInvoices}\nContestées: ${disputedInvoices}\nEn attente: ${pendingInvoices}`, inline: true },
      { name: '🔧 Réparations', value: `Total: ${totalRepairs}\nTerminées: ${completedRepairs}\nEn cours: ${inProgressRepairs}\nEn attente: ${pendingRepairs}`, inline: true },
      { name: '📈 Performance', value: `Taux de satisfaction: ${satisfactionRate}%` }
    )
    .setFooter({ text: `Auto Exotic GTARP | Statistiques générées le ${new Date().toLocaleDateString('fr-FR')}` })
    .setTimestamp();

  // Créer le bouton de retour
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('panel_back')
        .setLabel('🔙 Retour (on work)')
        .setStyle(ButtonStyle.Secondary),
    );

  // Mettre à jour le message
  await i.editReply({
    embeds: [statsEmbed],
    components: [row]
  });

  // Créer un collecteur pour le bouton de retour
  const filter = btnInt => btnInt.customId === 'panel_back' && btnInt.user.id === originalInteraction.user.id;

  // Création du collecteur
  const collector = i.channel.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async interaction => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      // logique du bouton
    } catch (error) {
      if (error.code === 10062) {
        console.warn('Interaction expirée ou inconnue, on skip.');
      } else if (error.code === 40060) {
        console.warn('Interaction déjà reconnue, on skip.');
      } else {
        console.error(error);
      }
    }
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_back')
          .setLabel('🔙 Retour (on work)')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

    await i.editReply({
      components: [disabledRow]
    });


    // Recréer le panel principal
    const panelEmbed = new EmbedBuilder()
      .setTitle('🏢 Panel d\'Administration Auto Exotic')
      .setDescription('Bienvenue dans le panel d\'administration du garage. Utilisez les boutons ci-dessous pour accéder aux différentes fonctionnalités.')
      .setColor('#FF0000')
      .addFields(
        { name: '📊 Statistiques', value: 'Consultez les statistiques détaillées du garage et des mécaniciens.' },
        { name: '💰 Finances', value: 'Gérez les revenus, les dépenses et les salaires des employés.' },
        { name: '👥 Gestion des employés', value: 'Consultez les performances des mécaniciens et gérez les salaires.' },
        { name: '🔧 Réparations', value: 'Suivez l\'état des réparations en cours et passées.' }
      )
      .setFooter({ text: 'Auto Exotic GTARP | Panel d\'administration' })
      .setTimestamp();

    // Recréer les boutons pour le panel
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_stats')
          .setLabel('📊 Statistiques')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_finances')
          .setLabel('💰 Finances')
          .setStyle(ButtonStyle.Success),
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_employees')
          .setLabel('👥 Employés')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_repairs')
          .setLabel('🔧 Réparations')
          .setStyle(ButtonStyle.Danger),
      );

    // Mettre à jour le message
    await i.editReply({
      embeds: [panelEmbed],
      components: [row1, row2]
    });
  });
}

/**
 * Affiche le panel des finances
 * @param {ButtonInteraction} i - L'interaction bouton
 * @param {CommandInteraction} originalInteraction - L'interaction de commande originale
 */
async function showFinancesPanel(i, originalInteraction) {
  // Charger les données
  const invoicesPath = path.join(__dirname, '../data/invoices.json');

  let invoices = [];

  if (fs.existsSync(invoicesPath)) {
    const data = fs.readFileSync(invoicesPath, 'utf8');
    invoices = JSON.parse(data);
  }

  // Calculer les revenus par période
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

  const todayInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paidAt > oneDayAgo);
  const weekInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paidAt > oneWeekAgo);
  const monthInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paidAt > oneMonthAgo);

  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.montant, 0);
  const weekRevenue = weekInvoices.reduce((sum, inv) => sum + inv.montant, 0);
  const monthRevenue = monthInvoices.reduce((sum, inv) => sum + inv.montant, 0);
  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.montant, 0);

  // Calculer le revenu moyen par facture
  const avgInvoiceAmount = todayInvoices.length > 0 ? Math.round(todayRevenue / todayInvoices.length) : 0;

  // Calculer les revenus par type de service (en utilisant la description)
  const serviceTypes = {
    'Réparation': 0,
    'Peinture': 0,
    'Performance': 0,
    'Carrosserie': 0,
    'Autre': 0
  };

  weekInvoices.forEach(inv => {
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

  // Créer l'embed
  const financesEmbed = new EmbedBuilder()
    .setTitle('💰 Finances du Garage')
    .setColor('#00AA00')
    .addFields(
      { name: '📈 Revenus', value: `Aujourd'hui: ${todayRevenue}$\nCette semaine: ${weekRevenue}$\nCe mois: ${monthRevenue}$\nTotal: ${totalRevenue}$`, inline: true },
      { name: '🧮 Statistiques', value: `Factures aujourd'hui: ${todayInvoices.length}\nMontant moyen: ${avgInvoiceAmount}$\nFactures cette semaine: ${weekInvoices.length}`, inline: true },
      { name: '📊 Revenus par service (semaine)', value: `🔧 Réparation: ${serviceTypes['Réparation']}$\n🎨 Peinture: ${serviceTypes['Peinture']}$\n🚀 Performance: ${serviceTypes['Performance']}$\n🛠️ Carrosserie: ${serviceTypes['Carrosserie']}$\n📦 Autre: ${serviceTypes['Autre']}$` }
    )
    .setFooter({ text: `Auto Exotic GTARP | Finances générées le ${new Date().toLocaleDateString('fr-FR')}` })
    .setTimestamp();

  // Créer le bouton de retour
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('panel_back')
        .setLabel('🔙 Retour (on work)')
        .setStyle(ButtonStyle.Secondary),
    );

  // Mettre à jour le message
  await i.editReply({
    embeds: [financesEmbed],
    components: [row]
  });

  // Créer un collecteur pour le bouton de retour
  const filter = btnInt => btnInt.customId === 'panel_back' && btnInt.user.id === originalInteraction.user.id;

  // Création du collecteur
  const collector = i.channel.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async interaction => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      // logique du bouton
    } catch (error) {
      if (error.code === 10062) {
        console.warn('Interaction expirée ou inconnue, on skip.');
      } else if (error.code === 40060) {
        console.warn('Interaction déjà reconnue, on skip.');
      } else {
        console.error(error);
      }
    }
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_back')
          .setLabel('🔙 Retour (on work)')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

    await i.editReply({
      components: [disabledRow]
    });

    // Recréer le panel principal
    const panelEmbed = new EmbedBuilder()
      .setTitle('🏢 Panel d\'Administration Auto Exotic')
      .setDescription('Bienvenue dans le panel d\'administration du garage. Utilisez les boutons ci-dessous pour accéder aux différentes fonctionnalités.')
      .setColor('#FF0000')
      .addFields(
        { name: '📊 Statistiques', value: 'Consultez les statistiques détaillées du garage et des mécaniciens.' },
        { name: '💰 Finances', value: 'Gérez les revenus, les dépenses et les salaires des employés.' },
        { name: '👥 Gestion des employés', value: 'Consultez les performances des mécaniciens et gérez les salaires.' },
        { name: '🔧 Réparations', value: 'Suivez l\'état des réparations en cours et passées.' }
      )
      .setFooter({ text: 'Auto Exotic GTARP | Panel d\'administration' })
      .setTimestamp();

    // Recréer les boutons pour le panel
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_stats')
          .setLabel('📊 Statistiques')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_finances')
          .setLabel('💰 Finances')
          .setStyle(ButtonStyle.Success),
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_employees')
          .setLabel('👥 Employés')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_repairs')
          .setLabel('🔧 Réparations')
          .setStyle(ButtonStyle.Danger),
      );

    // Mettre à jour le message
    await i.editReply({
      embeds: [panelEmbed],
      components: [row1, row2]
    });
  });
}

/**
 * Affiche le panel des employés
 * @param {ButtonInteraction} i - L'interaction bouton
 * @param {CommandInteraction} originalInteraction - L'interaction de commande originale
 */
async function showEmployeesPanel(i, originalInteraction) {
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

  // Récupérer tous les mécaniciens
  const guild = i.guild;
  const mecanoRole = guild.roles.cache.find(role => role.name.includes('Mécano'));

  if (!mecanoRole) {
    return i.editReply({
      content: "❌ Le rôle Mécano n'existe pas sur ce serveur.",
      components: []
    });
  }

  const mechanics = await guild.members.fetch({ roles: [mecanoRole.id] });

  // Calculer les statistiques pour chaque mécanicien
  const mechanicsStats = [];

  mechanics.forEach(mechanic => {
    const mechanicInvoices = invoices.filter(inv => inv.mechanicId === mechanic.id);
    const mechanicRepairs = repairs.filter(rep => rep.assignedTo === mechanic.id);

    const totalInvoices = mechanicInvoices.length;
    const paidInvoices = mechanicInvoices.filter(inv => inv.status === 'paid').length;
    const disputedInvoices = mechanicInvoices.filter(inv => inv.status === 'disputed').length;

    const totalRevenue = mechanicInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.montant, 0);

    const totalRepairs = mechanicRepairs.length;
    const completedRepairs = mechanicRepairs.filter(rep => rep.status === 'completed').length;

    // Calculer l'efficacité (% de réparations terminées / total)
    const efficiency = totalRepairs > 0 ? Math.round((completedRepairs / totalRepairs) * 100) : 0;

    // Calculer le taux de satisfaction (% de factures payées sans contestation)
    const satisfactionRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    // Calculer un salaire recommandé basé sur les performances
    const baseSalary = 1000;
    const revenueBonus = totalRevenue * 0.1;
    const efficiencyBonus = (efficiency / 100) * 500;
    const recommendedSalary = Math.round(baseSalary + revenueBonus + efficiencyBonus);

    mechanicsStats.push({
      id: mechanic.id,
      name: mechanic.user.tag,
      displayName: mechanic.displayName,
      totalInvoices,
      paidInvoices,
      disputedInvoices,
      totalRevenue,
      totalRepairs,
      completedRepairs,
      efficiency,
      satisfactionRate,
      recommendedSalary
    });
  });

  // Trier par revenu total (décroissant)
  mechanicsStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Créer l'embed
  const employeesEmbed = new EmbedBuilder()
    .setTitle('👥 Gestion des Employés')
    .setColor('#AA00AA')
    .setDescription(`Nombre total de mécaniciens: **${mechanics.size}**`)
    .setFooter({ text: `Auto Exotic GTARP | Employés - ${new Date().toLocaleDateString('fr-FR')}` })
    .setTimestamp();

  // Ajouter les mécaniciens à l'embed
  if (mechanicsStats.length > 0) {
    mechanicsStats.forEach((mechanic, index) => {
      employeesEmbed.addFields({
        name: `${index + 1}. ${mechanic.displayName}`,
        value: `💰 Revenus: ${mechanic.totalRevenue}$\n🧾 Factures: ${mechanic.totalInvoices} (${mechanic.paidInvoices} payées, ${mechanic.disputedInvoices} contestées)\n🔧 Réparations: ${mechanic.totalRepairs} (${mechanic.completedRepairs} terminées)\n📈 Efficacité: ${mechanic.efficiency}% | Satisfaction: ${mechanic.satisfactionRate}%\n💵 Salaire recommandé: ${mechanic.recommendedSalary}$`,
        inline: true
      });
    });
  } else {
    employeesEmbed.setDescription('Aucun mécanicien trouvé sur le serveur.');
  }

  // Créer le bouton de retour
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('panel_back')
        .setLabel('🔙 Retour (on work)')
        .setStyle(ButtonStyle.Secondary),
    );

  // Mettre à jour le message
  await i.editReply({
    embeds: [employeesEmbed],
    components: [row]
  });

  // Créer un collecteur pour le bouton de retour
  const filter = btnInt => btnInt.customId === 'panel_back' && btnInt.user.id === originalInteraction.user.id;

  // Création du collecteur
  const collector = i.channel.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async interaction => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      // logique du bouton
    } catch (error) {
      if (error.code === 10062) {
        console.warn('Interaction expirée ou inconnue, on skip.');
      } else if (error.code === 40060) {
        console.warn('Interaction déjà reconnue, on skip.');
      } else {
        console.error(error);
      }
    }
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_back')
          .setLabel('🔙 Retour (on work)')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

    await i.editReply({
      components: [disabledRow]
    });

    // Recréer le panel principal
    const panelEmbed = new EmbedBuilder()
      .setTitle('🏢 Panel d\'Administration Auto Exotic')
      .setDescription('Bienvenue dans le panel d\'administration du garage. Utilisez les boutons ci-dessous pour accéder aux différentes fonctionnalités.')
      .setColor('#FF0000')
      .addFields(
        { name: '📊 Statistiques', value: 'Consultez les statistiques détaillées du garage et des mécaniciens.' },
        { name: '💰 Finances', value: 'Gérez les revenus, les dépenses et les salaires des employés.' },
        { name: '👥 Gestion des employés', value: 'Consultez les performances des mécaniciens et gérez les salaires.' },
        { name: '🔧 Réparations', value: 'Suivez l\'état des réparations en cours et passées.' }
      )
      .setFooter({ text: 'Auto Exotic GTARP | Panel d\'administration' })
      .setTimestamp();

    // Recréer les boutons pour le panel
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_stats')
          .setLabel('📊 Statistiques')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_finances')
          .setLabel('💰 Finances')
          .setStyle(ButtonStyle.Success),
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_employees')
          .setLabel('👥 Employés')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_repairs')
          .setLabel('🔧 Réparations')
          .setStyle(ButtonStyle.Danger),
      );

    // Mettre à jour le message
    await i.editReply({
      embeds: [panelEmbed],
      components: [row1, row2]
    });
  });
}

/**
 * Affiche le panel des réparations
 * @param {ButtonInteraction} i - L'interaction bouton
 * @param {CommandInteraction} originalInteraction - L'interaction de commande originale
 */
async function showRepairsPanel(i, originalInteraction) {
  // Charger les données
  const repairsPath = path.join(__dirname, '../data/repairs.json');

  let repairs = [];

  if (fs.existsSync(repairsPath)) {
    const data = fs.readFileSync(repairsPath, 'utf8');
    repairs = JSON.parse(data);
  }

  // Calculer les statistiques
  const totalRepairs = repairs.length;
  const pendingRepairs = repairs.filter(rep => rep.status === 'pending').length;
  const inProgressRepairs = repairs.filter(rep => rep.status === 'in_progress').length;
  const completedRepairs = repairs.filter(rep => rep.status === 'completed').length;
  const rejectedRepairs = repairs.filter(rep => rep.status === 'rejected').length;

  // Récupérer les réparations en cours
  const activeRepairs = repairs.filter(rep => rep.status === 'in_progress' || rep.status === 'pending');

  // Trier par date (plus récent en premier)
  activeRepairs.sort((a, b) => b.timestamp - a.timestamp);

  // Limiter à 5 réparations pour l'affichage
  const displayRepairs = activeRepairs.slice(0, 5);

  // Créer l'embed
  const repairsEmbed = new EmbedBuilder()
    .setTitle('🔧 Suivi des Réparations')
    .setColor('#FF5500')
    .addFields(
      { name: '📊 Statistiques', value: `Total: ${totalRepairs}\nEn attente: ${pendingRepairs}\nEn cours: ${inProgressRepairs}\nTerminées: ${completedRepairs}\nRefusées: ${rejectedRepairs}`, inline: true }
    )
    .setFooter({ text: `Auto Exotic GTARP | Réparations - ${new Date().toLocaleDateString('fr-FR')}` })
    .setTimestamp();

  // Ajouter les réparations actives à l'embed
  if (displayRepairs.length > 0) {
    repairsEmbed.addFields({ name: '🔄 Réparations actives', value: '\u200B' });

    displayRepairs.forEach((repair, index) => {
      const date = new Date(repair.timestamp).toLocaleDateString('fr-FR');
      const statusEmoji = getStatusEmoji(repair.status);
      const assignedTo = repair.assignedTo ? `<@${repair.assignedTo}>` : 'Non assigné';

      repairsEmbed.addFields({
        name: `${statusEmoji} Réparation #${repair.id}`,
        value: `🚗 Véhicule: ${repair.vehicule}\n🔧 Problème: ${repair.probleme}\n👤 Client: <@${repair.userId}>\n👨‍🔧 Mécanicien: ${assignedTo}\n📅 Date: ${date}`,
        inline: true
      });
    });
  } else {
    repairsEmbed.addFields({ name: '🔄 Réparations actives', value: 'Aucune réparation active en ce moment.' });
  }

  // Créer le bouton de retour
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('panel_back')
        .setLabel('🔙 Retour (on work)')
        .setStyle(ButtonStyle.Secondary),
    );

  // Mettre à jour le message
  await i.editReply({
    embeds: [repairsEmbed],
    components: [row]
  });

  // Créer un collecteur pour le bouton de retour
  const filter = btnInt => btnInt.customId === 'panel_back' && btnInt.user.id === originalInteraction.user.id;

  // Création du collecteur
  const collector = i.channel.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async interaction => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      // logique du bouton
    } catch (error) {
      if (error.code === 10062) {
        console.warn('Interaction expirée ou inconnue, on skip.');
      } else if (error.code === 40060) {
        console.warn('Interaction déjà reconnue, on skip.');
      } else {
        console.error(error);
      }
    }
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_back')
          .setLabel('🔙 Retour (on work)')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

    await i.editReply({
      components: [disabledRow]
    });

    // Recréer le panel principal
    const panelEmbed = new EmbedBuilder()
      .setTitle('🏢 Panel d\'Administration Auto Exotic')
      .setDescription('Bienvenue dans le panel d\'administration du garage. Utilisez les boutons ci-dessous pour accéder aux différentes fonctionnalités.')
      .setColor('#FF0000')
      .addFields(
        { name: '📊 Statistiques', value: 'Consultez les statistiques détaillées du garage et des mécaniciens.' },
        { name: '💰 Finances', value: 'Gérez les revenus, les dépenses et les salaires des employés.' },
        { name: '👥 Gestion des employés', value: 'Consultez les performances des mécaniciens et gérez les salaires.' },
        { name: '🔧 Réparations', value: 'Suivez l\'état des réparations en cours et passées.' }
      )
      .setFooter({ text: 'Auto Exotic GTARP | Panel d\'administration' })
      .setTimestamp();

    // Recréer les boutons pour le panel
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_stats')
          .setLabel('📊 Statistiques')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('panel_finances')
          .setLabel('💰 Finances')
          .setStyle(ButtonStyle.Success),
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('panel_employees')
          .setLabel('👥 Employés')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_repairs')
          .setLabel('🔧 Réparations')
          .setStyle(ButtonStyle.Danger),
      );

    // Mettre à jour le message
    await i.editReply({
      embeds: [panelEmbed],
      components: [row1, row2]
    });
  });
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