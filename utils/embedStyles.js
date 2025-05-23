// utils/embedStyles.js
const { EmbedBuilder } = require('discord.js');

/**
 * Couleurs premium pour les embeds
 */
const COLORS = {
  // Couleurs principales
  PRIMARY: '#1E2124',      // Gris foncé presque noir (fond principal)
  SECONDARY: '#2F3136',    // Gris foncé (fond secondaire)
  ACCENT: '#FFD700',       // Or (accent principal)
  ACCENT_SECONDARY: '#C0C0C0', // Argent (accent secondaire)
  
  // Couleurs fonctionnelles
  SUCCESS: '#00D26A',      // Vert émeraude
  WARNING: '#FF9500',      // Orange premium
  ERROR: '#FF3B30',        // Rouge vif
  INFO: '#007AFF',         // Bleu royal
  
  // Couleurs de statut
  PENDING: '#9B59B6',      // Violet
  IN_PROGRESS: '#3498DB',  // Bleu process
  COMPLETED: '#2ECC71',    // Vert succès
  REJECTED: '#E74C3C',     // Rouge rejet
  
  // Couleurs spécifiques
  INVOICE: '#F1C40F',      // Jaune doré pour factures
  REPAIR: '#5D76A9',       // Bleu-gris pour réparations
  REPORT: '#1ABC9C',       // Turquoise pour rapports
  ADMIN: '#8E44AD'         // Violet foncé pour admin
};

/**
 * Bordures et séparateurs pour les embeds
 */
const SEPARATORS = {
  THIN: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
  MEDIUM: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  THICK: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  FANCY: '✧･ﾟ: *✧･ﾟ:*:･ﾟ✧*:･ﾟ✧:･ﾟ: *✧･ﾟ:*:･ﾟ✧*:･ﾟ✧',
  STARS: '★━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━★',
  DIAMONDS: '♦️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━♦️'
};

/**
 * Emojis personnalisés pour les différentes sections
 */
const EMOJIS = {
  // Emojis de statut
  STATUS: {
    PENDING: '⏳',
    ACCEPTED: '✅',
    REJECTED: '❌',
    IN_PROGRESS: '🔧',
    COMPLETED: '🏁',
    PAID: '💸',
    DISPUTED: '⚠️'
  },
  
  // Emojis de véhicule
  VEHICLE: {
    CAR: '🏎️',
    SPORT: '🏎️',
    SUV: '🚙',
    TRUCK: '🚚',
    BIKE: '🏍️',
    LUXURY: '🪩'
  },
  
  // Emojis de complexité
  COMPLEXITY: {
    SIMPLE: '🟢',
    MEDIUM: '🟡',
    COMPLEX: '🟠',
    VERY_COMPLEX: '🔴'
  },
  
  // Autres emojis utiles
  MONEY: '💰',
  MECHANIC: '👨‍🔧',
  CLIENT: '👤',
  TIME: '⏰',
  CONTACT: '📱',
  DOCUMENT: '📄',
  TOOLS: '🛠️',
  WRENCH: '🔧',
  GARAGE: '🏢',
  STATS: '📊',
  CALENDAR: '📅',
  INVOICE: '🧾',
  REPAIR: '🔩',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  SUCCESS: '✅',
  ERROR: '❌',
  STAR: '⭐',
  MEDAL_GOLD: '🥇',
  MEDAL_SILVER: '🥈',
  MEDAL_BRONZE: '🥉'
};

/**
 * Crée un embed de facture au style premium
 * @param {Object} invoice - Données de la facture
 * @param {String} status - Statut de la facture
 * @returns {EmbedBuilder} - L'embed stylisé
 */
function createInvoiceEmbed(invoice, status = 'pending') {
  // Déterminer la couleur et l'emoji de statut
  let color, statusEmoji, statusText;
  
  switch (status) {
    case 'paid':
      color = COLORS.SUCCESS;
      statusEmoji = EMOJIS.STATUS.PAID;
      statusText = 'Payée';
      break;
    case 'disputed':
      color = COLORS.WARNING;
      statusEmoji = EMOJIS.STATUS.DISPUTED;
      statusText = 'Contestée';
      break;
    default:
      color = COLORS.INVOICE;
      statusEmoji = EMOJIS.MONEY;
      statusText = 'En attente de paiement';
  }
  
  // Créer l'embed
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.INVOICE} Facture Auto Exotic #${invoice.id}`)
    .setColor(color)
    .setDescription(`${SEPARATORS.DIAMONDS}\n**Facture émise pour <@${invoice.clientId}>**\n${SEPARATORS.DIAMONDS}`)
    .setAuthor({
      name: `Émise par: ${invoice.mechanicName}`,
      iconURL: `https://cdn.discordapp.com/emojis/1042377154350325770.webp?size=96&quality=lossless` // Emoji de clé à molette
    })
    .setThumbnail('https://i.imgur.com/6vYRoLa.png') // Logo Auto Exotic
    .addFields(
      { name: `${EMOJIS.VEHICLE.LUXURY} Véhicule`, value: invoice.vehicule, inline: true },
      { name: `${EMOJIS.TOOLS} Travaux effectués`, value: invoice.description, inline: true },
      { name: `${EMOJIS.MONEY} Montant`, value: `**${invoice.montant}$**`, inline: true },
      { name: `${EMOJIS.CALENDAR} Date d'émission`, value: new Date(invoice.createdAt).toLocaleString('fr-FR'), inline: true },
      { name: `${statusEmoji} Statut`, value: statusText, inline: true }
    )
    .setFooter({ 
      text: `Auto Exotic GTARP • Le luxe à votre service`, 
      iconURL: 'https://i.imgur.com/6vYRoLa.png'
    })
    .setTimestamp();
}

/**
 * Crée un embed de réparation au style premium
 * @param {Object} repair - Données de la réparation
 * @param {String} status - Statut de la réparation
 * @returns {EmbedBuilder} - L'embed stylisé
 */
function createRepairEmbed(repair, status = 'pending') {
  // Déterminer la couleur et l'emoji de statut
  let color, statusEmoji, statusText;
  
  switch (status) {
    case 'accepted':
      color = COLORS.SUCCESS;
      statusEmoji = EMOJIS.STATUS.ACCEPTED;
      statusText = 'Acceptée';
      break;
    case 'rejected':
      color = COLORS.ERROR;
      statusEmoji = EMOJIS.STATUS.REJECTED;
      statusText = 'Refusée';
      break;
    case 'in_progress':
      color = COLORS.IN_PROGRESS;
      statusEmoji = EMOJIS.STATUS.IN_PROGRESS;
      statusText = 'En cours';
      break;
    case 'completed':
      color = COLORS.COMPLETED;
      statusEmoji = EMOJIS.STATUS.COMPLETED;
      statusText = 'Terminée';
      break;
    default:
      color = COLORS.REPAIR;
      statusEmoji = EMOJIS.STATUS.PENDING;
      statusText = 'En attente';
  }
  
  // Déterminer l'emoji de complexité
  let complexityEmoji;
  switch (repair.complexite) {
    case 'simple':
      complexityEmoji = EMOJIS.COMPLEXITY.SIMPLE;
      break;
    case 'moyenne':
      complexityEmoji = EMOJIS.COMPLEXITY.MEDIUM;
      break;
    case 'complexe':
      complexityEmoji = EMOJIS.COMPLEXITY.COMPLEX;
      break;
    case 'tres_complexe':
      complexityEmoji = EMOJIS.COMPLEXITY.VERY_COMPLEX;
      break;
    default:
      complexityEmoji = EMOJIS.COMPLEXITY.MEDIUM;
  }
  
  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.REPAIR} Demande de réparation #${repair.id}`)
    .setColor(color)
    .setDescription(`${SEPARATORS.STARS}\n**Demande de service pour votre véhicule**\n${SEPARATORS.STARS}`)
    .setAuthor({
      name: repair.userName || 'Client Auto Exotic',
      iconURL: repair.userAvatar || 'https://i.imgur.com/6vYRoLa.png'
    })
    .setThumbnail('https://i.imgur.com/6vYRoLa.png') // Logo Auto Exotic
    .addFields(
      { name: `${EMOJIS.VEHICLE.CAR} Véhicule`, value: repair.vehicule, inline: true },
      { name: `${EMOJIS.WRENCH} Problème`, value: repair.probleme, inline: true },
      { name: `${complexityEmoji} Complexité`, value: getComplexiteLabel(repair.complexite), inline: true },
      { name: `${EMOJIS.MECHANIC} Niveau requis`, value: repair.niveauRequis, inline: true },
      { name: `${EMOJIS.CONTACT} Contact`, value: `<@${repair.userId}>`, inline: true },
      { name: `${statusEmoji} Statut`, value: statusText, inline: true }
    )
    .setFooter({ 
      text: `Auto Exotic GTARP • Excellence et précision`, 
      iconURL: 'https://i.imgur.com/6vYRoLa.png'
    })
    .setTimestamp();
  
  // Ajouter le mécanicien assigné si disponible
  if (repair.assignedTo) {
    embed.addFields({ name: `${EMOJIS.MECHANIC} Mécanicien assigné`, value: `<@${repair.assignedTo}>`, inline: true });
  }
  
  // Ajouter la date de dernière mise à jour si disponible
  if (repair.lastUpdated) {
    embed.addFields({ 
      name: `${EMOJIS.TIME} Dernière mise à jour`, 
      value: new Date(repair.lastUpdated).toLocaleString('fr-FR'), 
      inline: true 
    });
  }
  
  return embed;
}

/**
 * Crée un embed de notification au style premium
 * @param {String} title - Titre de la notification
 * @param {String} description - Description de la notification
 * @param {String} type - Type de notification (success, warning, error, info)
 * @param {Array} fields - Champs additionnels
 * @returns {EmbedBuilder} - L'embed stylisé
 */
function createNotificationEmbed(title, description, type = 'info', fields = []) {
  // Déterminer la couleur et l'emoji selon le type
  let color, emoji;
  
  switch (type) {
    case 'success':
      color = COLORS.SUCCESS;
      emoji = EMOJIS.SUCCESS;
      break;
    case 'warning':
      color = COLORS.WARNING;
      emoji = EMOJIS.WARNING;
      break;
    case 'error':
      color = COLORS.ERROR;
      emoji = EMOJIS.ERROR;
      break;
    default:
      color = COLORS.INFO;
      emoji = EMOJIS.INFO;
  }
  
  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${title}`)
    .setColor(color)
    .setDescription(`${description}`)
    .setFooter({ 
      text: `Auto Exotic GTARP • Notification`, 
      iconURL: 'https://i.imgur.com/6vYRoLa.png'
    })
    .setTimestamp();
  
  // Ajouter les champs additionnels
  if (fields.length > 0) {
    embed.addFields(...fields);
  }
  
  return embed;
}

/**
 * Crée un embed de rapport au style premium
 * @param {String} title - Titre du rapport
 * @param {String} description - Description du rapport
 * @param {Array} fields - Champs du rapport
 * @returns {EmbedBuilder} - L'embed stylisé
 */
function createReportEmbed(title, description, fields = []) {
  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.STATS} ${title}`)
    .setColor(COLORS.REPORT)
    .setDescription(`${SEPARATORS.MEDIUM}\n${description}\n${SEPARATORS.MEDIUM}`)
    .setThumbnail('https://i.imgur.com/6vYRoLa.png') // Logo Auto Exotic
    .setFooter({ 
      text: `Auto Exotic GTARP • Rapport généré le ${new Date().toLocaleString('fr-FR')}`, 
      iconURL: 'https://i.imgur.com/6vYRoLa.png'
    })
    .setTimestamp();
  
  // Ajouter les champs
  if (fields.length > 0) {
    embed.addFields(...fields);
  }
  
  return embed;
}

/**
 * Fonction utilitaire pour obtenir le libellé de la complexité
 * @param {String} value - Valeur de complexité
 * @returns {String} - Libellé formaté
 */
function getComplexiteLabel(value) {
  const complexites = {
    'simple': `${EMOJIS.COMPLEXITY.SIMPLE} Simple - Entretien de base`,
    'moyenne': `${EMOJIS.COMPLEXITY.MEDIUM} Moyenne - Réparation standard`,
    'complexe': `${EMOJIS.COMPLEXITY.COMPLEX} Complexe - Réparation avancée`,
    'tres_complexe': `${EMOJIS.COMPLEXITY.VERY_COMPLEX} Très complexe - Expertise requise`
  };
  
  return complexites[value] || `${EMOJIS.COMPLEXITY.MEDIUM} Moyenne - Réparation standard`;
}

/**
 * Fonction utilitaire pour obtenir l'emoji d'un service
 * @param {String} service - Nom du service
 * @returns {String} - Emoji correspondant
 */
function getServiceEmoji(service) {
  const serviceEmojis = {
    'Réparation': EMOJIS.WRENCH,
    'Peinture': '🎨',
    'Performance': '🚀',
    'Carrosserie': '🏎️',
    'Autre': '🔩'
  };
  
  return serviceEmojis[service] || '🔧';
}

module.exports = {
  COLORS,
  SEPARATORS,
  EMOJIS,
  createInvoiceEmbed,
  createRepairEmbed,
  createNotificationEmbed,
  createReportEmbed,
  getComplexiteLabel,
  getServiceEmoji
};