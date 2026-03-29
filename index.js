require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!announce')) {
    const args = message.content.replace('!announce ', '').split('|');

    if (args.length < 2) {
      return message.reply("Use: !announce Title | Message + attach image");
    }

    const title = args[0].trim();
    const description = args[1].trim();

    const attachment = message.attachments.first();

    if (!attachment) {
      return message.reply("❌ Please attach an image!");
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x00AEFF)
      .setImage(attachment.url)
      .setFooter({ text: "Server News" })
      .setTimestamp();

    const channel = await client.channels.fetch(CHANNEL_ID);

    const sentMessage = await channel.send({ embeds: [embed] });

    // ✅ Better check for announcement channel
    if (channel.type === ChannelType.GuildAnnouncement) {
      await sentMessage.crosspost();
    }
  }
});

client.login(TOKEN);