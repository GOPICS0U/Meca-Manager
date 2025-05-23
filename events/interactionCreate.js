// events/interactionCreate.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createRepairEmbed, createNotificationEmbed, createInvoiceEmbed, EMOJIS } = require('../utils/embedStyles');

module.exports = {
  name: 'interactionCreate',
  once: false,
  
  async execute(interaction, client) {
    // Gestion des commandes slash
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        console.error(`❌ Commande ${interaction.commandName} introuvable.`);
        return;
      }
      
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la commande:', error);
        const errorReply = { content: '❌ Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorReply);
        } else {
          await interaction.reply(errorReply);
        }
      }
    }
    
    // Gestion des boutons
    if (interaction.isButton()) {
      const customId = interaction.customId;
      
      // Boutons de réparation
      if (customId.startsWith('repair_')) {
        const [action, repairId] = customId.split('_').slice(1);
        await handleRepairButton(interaction, action, repairId);
      }
      
      // Boutons de facture
      if (customId.startsWith('pay_') || customId.startsWith('dispute_')) {
        const [action, factureId] = customId.split('_');
        await handleFactureButton(interaction, action, factureId);
      }
      
      // Boutons du panel d'administration
      if (customId.startsWith('panel_')) {
        // Ces boutons sont gérés directement dans la commande panel.js
        // via les collecteurs d'événements
      }
    }
  }
};

/**
 * Gère les interactions avec les boutons de réparation
 * @param {ButtonInteraction} interaction - L'interaction bouton
 * @param {String} action - L'action à effectuer (accept, reject, progress, complete)
 * @param {String} repairId - L'ID de la réparation
 */
async function handleRepairButton(interaction, action, repairId) {
  // Vérifier si l'utilisateur a un rôle de mécanicien ou patron
  const member = interaction.member;
  const hasRole = member.roles.cache.some(role => 
    role.name.includes('Mécanicien') || 
    role.name.includes('Chef Mécanicien') || 
    role.name.includes('Stagiaire') || 
    role.name.includes('Patron')
  );
  
  if (!hasRole) {
    return interaction.reply({
      content: "❌ Seuls les membres de l'équipe peuvent gérer les réparations!",
      ephemeral: true
    });
  }
  
  // Récupérer les données de réparation pour vérifier le niveau requis
  const dbPath = path.join(__dirname, '../data/repairs.json');
  let repairs = [];
  
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath, 'utf8');
    repairs = JSON.parse(data);
  }
  
  // Trouver la réparation correspondante
  const repairIndex = repairs.findIndex(r => r.id === repairId);
  
  if (repairIndex === -1) {
    return interaction.reply({
      content: `❌ Réparation #${repairId} introuvable dans la base de données.`,
      ephemeral: true
    });
  }
  
  const repair = repairs[repairIndex];
  
  // Vérifier si le mécanicien a le niveau requis pour cette réparation
  const isStaff = member.roles.cache.some(role => role.name.includes('Patron') || role.name.includes('Chef Mécanicien'));
  
  if (!isStaff) { // Si ce n'est pas un patron ou chef mécanicien, vérifier le niveau
    const complexite = repair.complexite || 'moyenne';
    const isStagiaire = member.roles.cache.some(role => role.name.includes('Stagiaire'));
    const isJunior = member.roles.cache.some(role => role.name.includes('Mécanicien Junior'));
    const isMecanicien = member.roles.cache.some(role => role.name.includes('Mécanicien') && !role.name.includes('Junior') && !role.name.includes('Senior') && !role.name.includes('Chef'));
    const isSenior = member.roles.cache.some(role => role.name.includes('Mécanicien Senior'));
    
    let canHandle = false;
    
    switch (complexite) {
      case 'simple':
        canHandle = true; // Tout le monde peut gérer les réparations simples
        break;
      case 'moyenne':
        canHandle = !isStagiaire; // Tout le monde sauf les stagiaires
        break;
      case 'complexe':
        canHandle = isMecanicien || isSenior; // Mécanicien ou supérieur
        break;
      case 'tres_complexe':
        canHandle = isSenior; // Uniquement Senior
        break;
      default:
        canHandle = !isStagiaire; // Par défaut, tout le monde sauf les stagiaires
    }
    
    if (!canHandle) {
      return interaction.reply({
        content: `❌ Cette réparation nécessite un niveau de compétence supérieur au vôtre. Demandez à un mécanicien plus expérimenté de s'en occuper.`,
        ephemeral: true
      });
    }
  }
  
  // On utilise les données de réparation déjà récupérées plus haut
  
  // Mettre à jour le statut selon l'action
  let newStatus, statusText, color, targetChannel;
  
  switch (action) {
    case 'accept':
      newStatus = 'accepted';
      statusText = '✅ Acceptée';
      color = '#00AA00';
      targetChannel = interaction.guild.channels.cache.find(ch => ch.name === '🔧en-cours');
      break;
    case 'reject':
      newStatus = 'rejected';
      statusText = '❌ Refusée';
      color = '#FF0000';
      break;
    case 'progress':
      newStatus = 'in_progress';
      statusText = '🔧 En cours';
      color = '#FFA500';
      targetChannel = interaction.guild.channels.cache.find(ch => ch.name === '🔧en-cours');
      break;
    case 'complete':
      newStatus = 'completed';
      statusText = '🏁 Terminée';
      color = '#00AAFF';
      targetChannel = interaction.guild.channels.cache.find(ch => ch.name === '✅terminé');
      break;
  }
  
  // Mettre à jour l'embed avec le nouveau style luxueux
  const message = await interaction.message.fetch();
  
  // Mettre à jour les données de réparation
  repair.status = newStatus;
  repair.assignedTo = interaction.user.id;
  repair.lastUpdated = Date.now();
  
  // Créer un nouvel embed luxueux
  const updatedEmbed = createRepairEmbed(repair, newStatus);
  
  // Mettre à jour le message
  await interaction.message.edit({
    embeds: [updatedEmbed],
    components: message.components
  });
  
  // Si un canal cible est défini, déplacer la demande
  if (targetChannel && action !== 'reject') {
    const newMessage = await targetChannel.send({
      embeds: [updatedEmbed],
      components: message.components
    });
    
    // Supprimer l'ancien message
    await interaction.message.delete();
    
    // Mettre à jour l'ID du message dans la base de données
    repair.messageId = newMessage.id;
  }
  
  // Ces valeurs sont déjà mises à jour plus haut
  
  repairs[repairIndex] = repair;
  fs.writeFileSync(dbPath, JSON.stringify(repairs, null, 2));
  
  // Notifier l'utilisateur avec un message luxueux
  const client = await interaction.client.users.fetch(repair.userId);
  
  try {
    // Créer un embed de notification premium
    const notificationFields = [
      { name: `${EMOJIS.STATS} Nouveau statut`, value: statusText, inline: true },
      { name: `${EMOJIS.MECHANIC} Mécanicien`, value: `<@${interaction.user.id}>`, inline: true },
      { name: `${EMOJIS.VEHICLE.CAR} Véhicule`, value: repair.vehicule, inline: true }
    ];
    
    const notificationEmbed = createNotificationEmbed(
      `Mise à jour de votre réparation #${repairId}`,
      `Votre demande de service pour votre ${repair.vehicule} a été mise à jour par notre équipe de mécaniciens d'élite.`,
      'info',
      notificationFields
    );
    
    await client.send({
      content: `${EMOJIS.INFO} **Auto Exotic** vous informe d'une mise à jour concernant votre véhicule`,
      embeds: [notificationEmbed]
    });
  } catch (error) {
    console.error(`Impossible d'envoyer un MP à l'utilisateur:`, error);
  }
  
  // Répondre à l'interaction avec un message plus élégant
  return interaction.reply({
    embeds: [
      createNotificationEmbed(
        `Réparation #${repairId} mise à jour`,
        `La demande de réparation a été mise à jour avec succès.`,
        'success',
        [{ name: `${EMOJIS.STATS} Nouveau statut`, value: statusText, inline: true }]
      )
    ],
    ephemeral: true
  });
}

/**
 * Gère les interactions avec les boutons de facture
 * @param {ButtonInteraction} interaction - L'interaction bouton
 * @param {String} action - L'action à effectuer (pay, dispute)
 * @param {String} factureId - L'ID de la facture
 */
async function handleFactureButton(interaction, action, factureId) {
  const message = await interaction.message.fetch();
  const embed = message.embeds[0];
  
  // Récupérer les données de facture
  const dbPath = path.join(__dirname, '../data/invoices.json');
  let invoices = [];
  
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath, 'utf8');
    invoices = JSON.parse(data);
  } else {
    return interaction.reply({
      content: `❌ Base de données des factures introuvable.`,
      ephemeral: true
    });
  }
  
  // Trouver la facture correspondante
  const invoiceIndex = invoices.findIndex(inv => inv.id === factureId);
  
  if (invoiceIndex === -1) {
    return interaction.reply({
      content: `❌ Facture #${factureId} introuvable dans la base de données.`,
      ephemeral: true
    });
  }
  
  const invoice = invoices[invoiceIndex];
  const now = Date.now();
  
  if (action === 'pay') {
    // Mettre à jour l'embed avec le nouveau style luxueux
    invoice.status = 'paid';
    invoice.paidAt = now;
    invoice.paidBy = interaction.user.id;
    
    const updatedEmbed = createInvoiceEmbed(invoice, 'paid');
    
    // Désactiver les boutons
    const updatedComponents = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: 'Payée',
            custom_id: `paid_${factureId}`,
            emoji: { name: '✅' },
            disabled: true
          }
        ]
      }
    ];
    
    // Mettre à jour le message
    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: updatedComponents
    });
    // Ces valeurs sont déjà mises à jour plus haut
    invoices[invoiceIndex] = invoice;
    fs.writeFileSync(dbPath, JSON.stringify(invoices, null, 2));
    
    // Notifier le mécanicien avec un message luxueux
    try {
      const mechanic = await interaction.client.users.fetch(invoice.mechanicId);
      
      // Créer un embed de notification premium pour le paiement
      const notificationFields = [
        { name: `${EMOJIS.MONEY} Montant`, value: `**${invoice.montant}$**`, inline: true },
        { name: `${EMOJIS.CLIENT} Client`, value: invoice.clientName, inline: true },
        { name: `${EMOJIS.CALENDAR} Date de paiement`, value: new Date(now).toLocaleString('fr-FR'), inline: true },
        { name: `${EMOJIS.VEHICLE.CAR} Véhicule`, value: invoice.vehicule, inline: true }
      ];
      
      const notificationEmbed = createNotificationEmbed(
        `Paiement reçu pour la facture #${factureId}`,
        `Félicitations ! Votre client a effectué le paiement pour les services rendus.`,
        'success',
        notificationFields
      );
      
      await mechanic.send({
        content: `${EMOJIS.MONEY} **Auto Exotic** vous informe qu'un paiement a été reçu`,
        embeds: [notificationEmbed]
      });
    } catch (error) {
      console.error(`Impossible d'envoyer un MP au mécanicien:`, error);
    }
    
    // Répondre avec un message élégant
    return interaction.reply({
      embeds: [
        createNotificationEmbed(
          `Paiement effectué avec succès`,
          `Merci pour votre paiement! La facture #${factureId} a été marquée comme payée.`,
          'success',
          [{ name: `${EMOJIS.MONEY} Montant payé`, value: `**${invoice.montant}$**`, inline: true }]
        )
      ],
      ephemeral: true
    });
  } else if (action === 'dispute') {
    // Mettre à jour l'embed avec le nouveau style luxueux
    invoice.status = 'disputed';
    invoice.disputedAt = now;
    invoice.disputedBy = interaction.user.id;
    
    const updatedEmbed = createInvoiceEmbed(invoice, 'disputed');
    
    // Mettre à jour le message
    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: message.components
    });
    
    // Ces valeurs sont déjà mises à jour plus haut
    invoices[invoiceIndex] = invoice;
    fs.writeFileSync(dbPath, JSON.stringify(invoices, null, 2));
    
    // Notifier le mécanicien et le patron avec un message luxueux
    try {
      const mechanic = await interaction.client.users.fetch(invoice.mechanicId);
      
      // Créer un embed de notification premium pour la contestation
      const notificationFields = [
        { name: `${EMOJIS.MONEY} Montant`, value: `**${invoice.montant}$**`, inline: true },
        { name: `${EMOJIS.CLIENT} Client`, value: invoice.clientName, inline: true },
        { name: `${EMOJIS.CALENDAR} Date de contestation`, value: new Date(now).toLocaleString('fr-FR'), inline: true },
        { name: `${EMOJIS.VEHICLE.CAR} Véhicule`, value: invoice.vehicule, inline: true }
      ];
      
      const notificationEmbed = createNotificationEmbed(
        `Facture contestée #${factureId}`,
        `Un client a contesté votre facture. Un responsable va examiner cette situation dans les plus brefs délais.`,
        'warning',
        notificationFields
      );
      
      await mechanic.send({
        content: `${EMOJIS.WARNING} **Auto Exotic** vous informe qu'une facture a été contestée`,
        embeds: [notificationEmbed]
      });
      
      // Trouver un patron pour le notifier
      const guild = await interaction.client.guilds.fetch(invoice.guildId);
      const patronRole = guild.roles.cache.find(role => role.name.includes('Patron'));
      
      if (patronRole) {
        const patrons = await guild.members.fetch({ roles: [patronRole.id] });
        patrons.forEach(async patron => {
          try {
            // Créer un embed de notification premium pour le patron
            const patronFields = [
              { name: `${EMOJIS.MECHANIC} Mécanicien`, value: `<@${invoice.mechanicId}>`, inline: true },
              { name: `${EMOJIS.CLIENT} Client`, value: `<@${invoice.clientId}>`, inline: true },
              { name: `${EMOJIS.VEHICLE.CAR} Véhicule`, value: invoice.vehicule, inline: true },
              { name: `${EMOJIS.WRENCH} Travaux`, value: invoice.description, inline: false },
              { name: `${EMOJIS.MONEY} Montant`, value: `**${invoice.montant}$**`, inline: true },
              { name: `${EMOJIS.CALENDAR} Date d'émission`, value: new Date(invoice.createdAt).toLocaleString('fr-FR'), inline: true },
              { name: `${EMOJIS.CALENDAR} Date de contestation`, value: new Date(now).toLocaleString('fr-FR'), inline: true }
            ];
            
            const patronEmbed = createNotificationEmbed(
              `URGENT: Facture contestée #${factureId}`,
              `Une facture a été contestée et nécessite votre intervention immédiate en tant que responsable.`,
              'error',
              patronFields
            );
            
            await patron.send({
              content: `${EMOJIS.WARNING} **ATTENTION** - Une situation requiert votre intervention en tant que responsable d'Auto Exotic`,
              embeds: [patronEmbed]
            });
          } catch (error) {
            console.error(`Impossible d'envoyer un MP au patron:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`Erreur lors de la notification:`, error);
    }
    
    
    // Répondre avec un message élégant
    return interaction.reply({
      embeds: [
        createNotificationEmbed(
          `Contestation enregistrée`,
          `Vous avez contesté la facture #${factureId}. Un responsable va examiner votre demande dans les plus brefs délais.`,
          'warning',
          [
            { name: `${EMOJIS.MONEY} Montant contesté`, value: `**${invoice.montant}$**`, inline: true },
            { name: `${EMOJIS.CALENDAR} Date de contestation`, value: new Date(now).toLocaleString('fr-FR'), inline: true }
          ]
        )
      ],
      ephemeral: true
    });
  }
}
