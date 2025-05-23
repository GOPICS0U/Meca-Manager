// commands/facture.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createInvoiceEmbed } = require('../utils/embedStyles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('facture')
    .setDescription('Générer une facture pour un client')
    .addUserOption(option => 
      option.setName('client')
        .setDescription('Le client à facturer')
        .setRequired(true))
    .addNumberOption(option => 
      option.setName('montant')
        .setDescription('Montant de la facture en $')
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option => 
      option.setName('description')
        .setDescription('Description des travaux effectués')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('vehicule')
        .setDescription('Véhicule concerné')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction, client) {
    // Vérifier si l'utilisateur a le rôle Mécano ou Patron
    const member = interaction.member;
    const hasRole = member.roles.cache.some(role => 
      role.name.includes('Mécano') || role.name.includes('Patron')
    );
    
    if (!hasRole) {
      return interaction.reply({
        content: "❌ Seuls les mécaniciens et le patron peuvent émettre des factures!",
        ephemeral: true
      });
    }
    
    // Récupérer les options
    const clientUser = interaction.options.getUser('client');
    const montant = interaction.options.getNumber('montant');
    const description = interaction.options.getString('description');
    const vehicule = interaction.options.getString('vehicule');
    
    // Créer un ID unique pour la facture
    const factureId = `FAC-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Créer l'embed pour la facture avec le nouveau style luxueux
    const invoiceData = {
      id: factureId,
      mechanicId: interaction.user.id,
      mechanicName: interaction.user.tag,
      clientId: clientUser.id,
      clientName: clientUser.tag,
      vehicule,
      description,
      montant,
      createdAt: Date.now()
    };
    
    const factureEmbed = createInvoiceEmbed(invoiceData, 'pending');
    
    // Envoyer la facture
    const sentMessage = await interaction.reply({
      embeds: [factureEmbed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: 'Payer',
              custom_id: `pay_${factureId}`,
              emoji: { name: '💸' }

            },
            {
              type: 2,
              style: 4,
              label: 'Contester',
              custom_id: `dispute_${factureId}`,
              emoji: { name: '⚠️' }
            }
          ]
        }
      ],
      fetchReply: true
    });
    
    // Enregistrer la facture dans une base de données locale (JSON)
    const dbPath = path.join(__dirname, '../data/invoices.json');
    let invoices = [];
    
    // Vérifier si le fichier existe
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      invoices = JSON.parse(data);
    } else {
      // Créer le dossier data s'il n'existe pas
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }
    
    // Ajouter la nouvelle facture
    invoices.push({
      id: factureId,
      mechanicId: interaction.user.id,
      mechanicName: interaction.user.tag,
      clientId: clientUser.id,
      clientName: clientUser.tag,
      vehicule,
      description,
      montant,
      status: 'pending', // pending, paid, disputed, cancelled
      messageId: sentMessage.id,
      channelId: interaction.channelId,
      guildId: interaction.guildId,
      createdAt: Date.now(),
      paidAt: null
    });
    
    // Enregistrer dans le fichier
    fs.writeFileSync(dbPath, JSON.stringify(invoices, null, 2));
    
    // Notifier le client en MP
    try {
      await clientUser.send({
        content: `🔔 Vous avez reçu une nouvelle facture de **${montant}$** du garage Auto Exotic!`,
        embeds: [factureEmbed]
      });
    } catch (error) {
      // L'utilisateur a peut-être désactivé ses MP
      await interaction.followUp({
        content: `⚠️ Impossible d'envoyer un MP à ${clientUser.username}. La facture a été émise uniquement dans ce canal.`,
        ephemeral: true
      });
    }
  },
};