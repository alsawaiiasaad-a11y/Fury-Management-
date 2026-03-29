require('dotenv').config();

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

async function sendDesignEmbed(channel) {
    // Attach the GIF
    const file = new AttachmentBuilder('./assets/design.gif');
    
    // Create the embed
    const embed = new EmbedBuilder()
        .setColor(0x0099FF) // Choose any color
        .setTitle("Fury Management System") // Your embed title
        .setDescription("Click (IN) to start the timer on voice,and you need to click (IN) every 30min") // Optional description
        .setImage('attachment://design.gif') // Display the GIF
        .setFooter({ text: "Your bot name" });

    // Send the embed
    channel.send({ embeds: [embed], files: [file] });
}

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
      content: '                        ',
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
  data[userId].lastClick = 0;

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

  const channel = client.channels.cache.get("1480131154672615556");

  if (!channel) {
    console.log("Channel not found!");
    return;
  }

  sendDesignEmbed(channel);
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = oldState.id;

  // ignore bots
  if (oldState.member.user.bot) return;

  // user LEFT voice channel
  if (oldState.channelId && !newState.channelId) {
    if (data[userId] && data[userId].active) {
      data[userId].active = false;

      console.log(`⛔ Auto-stopped timer for ${oldState.member.user.tag}`
);

      fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    }
  }
});

client.login(TOKEN);