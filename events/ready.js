// events/ready.js
module.exports = {
  name: 'ready',
  once: true,
  
  async execute(client) {
    console.log(`🔥 ${client.user.tag} est en ligne!`);
    console.log(`🏎️ Bot Auto Exotic GTARP prêt à servir ${client.guilds.cache.size} serveurs`);
  }
};