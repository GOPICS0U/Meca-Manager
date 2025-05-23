// utils/automod.js
const { Collection } = require('discord.js');

// Collection pour stocker les messages récents des utilisateurs
const userMessages = new Collection();

/**
 * Configure l'auto-modération du serveur
 * @param {Client} client - Instance du client Discord
 */
function setupAutoMod(client) {
  client.on('messageCreate', async message => {
    // Ignorer les messages des bots et des webhooks
    if (message.author.bot || message.webhookId) return;
    
    // Récupérer les paramètres de modération depuis la config
    const config = require('../config.json');
    const { bannedWords, maxMessageFrequency, timeWindow, autoMuteThreshold } = config.moderationSettings;
    
    // Vérifier les mots interdits
    if (checkBannedWords(message, bannedWords)) {
      try {
        // Supprimer le message contenant des mots interdits
        await message.delete();
        
        // Avertir l'utilisateur
        const warningMessage = await message.channel.send({
          content: `⚠️ <@${message.author.id}>, votre message a été supprimé car il contenait des termes inappropriés.`
        });
        
        // Supprimer l'avertissement après 5 secondes
        setTimeout(() => {
          warningMessage.delete().catch(console.error);
        }, 5000);
        
        return;
      } catch (error) {
        console.error('Erreur lors de la suppression d\'un message interdit:', error);
      }
    }
    
    // Vérifier le spam
    if (checkSpam(message, maxMessageFrequency, timeWindow, autoMuteThreshold)) {
      try {
        // Récupérer le rôle Banni
        const bannedRole = message.guild.roles.cache.find(role => role.name.includes('Banni'));
        
        if (bannedRole) {
          // Ajouter le rôle Banni à l'utilisateur
          await message.member.roles.add(bannedRole);
          
          // Informer l'utilisateur
          await message.channel.send({
            content: `🚫 <@${message.author.id}> a été temporairement mute pour spam.`
          });
          
          // Retirer le rôle après 5 minutes
          setTimeout(async () => {
            try {
              await message.member.roles.remove(bannedRole);
              message.channel.send({
                content: `✅ <@${message.author.id}> n'est plus mute.`
              }).catch(console.error);
            } catch (error) {
              console.error('Erreur lors du retrait du rôle Banni:', error);
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (error) {
        console.error('Erreur lors du mute d\'un utilisateur:', error);
      }
    }
  });
  
  console.log('✅ Système d\'auto-modération configuré');
}

/**
 * Vérifie si un message contient des mots interdits
 * @param {Message} message - Message à vérifier
 * @param {Array} bannedWords - Liste des mots interdits
 * @returns {Boolean} - True si le message contient des mots interdits
 */
function checkBannedWords(message, bannedWords) {
  const content = message.content.toLowerCase();
  
  return bannedWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
    return regex.test(content);
  });
}

/**
 * Vérifie si un utilisateur fait du spam
 * @param {Message} message - Message à vérifier
 * @param {Number} maxFrequency - Nombre maximum de messages autorisés
 * @param {Number} timeWindow - Fenêtre de temps en ms
 * @param {Number} threshold - Seuil d'infraction pour le mute
 * @returns {Boolean} - True si l'utilisateur doit être mute
 */
function checkSpam(message, maxFrequency, timeWindow, threshold) {
  const userId = message.author.id;
  const now = Date.now();
  
  // Initialiser si c'est le premier message de l'utilisateur
  if (!userMessages.has(userId)) {
    userMessages.set(userId, {
      messages: [{ timestamp: now, content: message.content }],
      warnings: 0
    });
    return false;
  }
  
  // Récupérer les données de l'utilisateur
  const userData = userMessages.get(userId);
  
  // Filtrer les messages qui sont dans la fenêtre de temps
  userData.messages = userData.messages.filter(m => now - m.timestamp < timeWindow);
  
  // Ajouter le message actuel
  userData.messages.push({ timestamp: now, content: message.content });
  
  // Vérifier le nombre de messages
  if (userData.messages.length > maxFrequency) {
    userData.warnings += 1;
    
    // Réinitialiser les messages
    userData.messages = [];
    
    // Vérifier si l'utilisateur a dépassé le seuil
    if (userData.warnings >= threshold) {
      userData.warnings = 0;
      return true; // L'utilisateur doit être mute
    }
  }
  
  // Mettre à jour les données
  userMessages.set(userId, userData);
  return false;
}

module.exports = { setupAutoMod };