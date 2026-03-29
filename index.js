require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});
const TOKEN = process.env.TOKEN;
const ASSIST_CHANNELS = process.env.ASSIST_CHANNELS.split(',');

// simple database
let data = {};
if (fs.existsSync('data.json')) {
  data = JSON.parse(fs.readFileSync('data.json'));
}

// create buttons
const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('in')
    .setLabel('IN')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId('out')
    .setLabel('OUT')
    .setStyle(ButtonStyle.Danger)
);

// send panel command
client.on('messageCreate', async (msg) => {
  if (msg.content === '!panel') {
    msg.channel.send({
      content: 'Click IN when you start assisting, OUT when you stop.',
      components: [row]
    });
  }

  if (msg.content === '!leaderboard') {
    const sorted = Object.entries(data)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    let text = '🏆 Leaderboard:\n';
    for (let i = 0; i < sorted.length; i++) {
      const user = await client.users.fetch(sorted[i][0]);
      text += `${i + 1}. ${user.username} - ${Math.floor(sorted[i][1].total / 60)} min\n`;
    }

    msg.channel.send(text);
  }
});

// button handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;

  if (!data[userId]) {
    data[userId] = {
      total: 0,
      active: false,
      lastClick: 0
    };
  }

  const member = interaction.guild.members.cache.get(userId);
  const inAssist = member.voice.channelId && ASSIST_CHANNELS.includes(member.voice.channelId);

  if (interaction.customId === 'in') {
    if (!inAssist) {
      return interaction.reply({ content: '❌ You must be in an assist voice channel!', ephemeral: true });
    }

    data[userId].active = true;
    data[userId].lastClick = Date.now();

    interaction.reply({ content: '✅ Timer started!', ephemeral: true });
  }

  if (interaction.customId === 'out') {
    data[userId].active = false;
    interaction.reply({ content: '⛔ Timer stopped!', ephemeral: true });
  }

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
});

// timer loop
setInterval(() => {
  const now = Date.now();

  for (const userId in data) {
    const user = data[userId];

    if (!user.active) continue;

    // auto stop after 30 min inactivity
    if (now - user.lastClick > 30 * 60 * 1000) {
      user.active = false;
      continue;
    }

    user.total += 60; // add 1 minute
  }

  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}, 60 * 1000);

client.once('ready', () => {
  console.log(`${client.user.tag} is online!`);
});

client.login(TOKEN);