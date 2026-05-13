require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const fs = require('fs');
const express = require('express');

// 🔹 Token beolvasása
const token = process.env.BOT_TOKEN?.trim();

if (!token) {
  console.error("❌ BOT_TOKEN nincs beállítva Render Environment Variables alatt!");
  process.exit(1);
}

// 🔹 Betöltjük a JSON adatokat
const dohanyboltok = JSON.parse(fs.readFileSync('./dohanyboltok.json', 'utf8'));

// 🔹 Discord kliens létrehozása
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Bejelentkezve mint ${client.user.tag}`);
});

// 🔹 Üzenet figyelés
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const allowedChannelId = '1427954374923259965';
  if (message.channel.id !== allowedChannelId) return;

  if (message.content.toLowerCase().startsWith('!szivar')) {
    const args = message.content.split(' ').slice(1);
    const keresettVaros = args.join(' ').trim().toLowerCase();

    if (!keresettVaros) {
      return message.reply('Kérlek adj meg egy várost! Példa: `!szivar Szeged`');
    }

    const talalatok = dohanyboltok.filter(bolt =>
      bolt.city && bolt.city.toLowerCase().includes(keresettVaros)
    );

    if (talalatok.length === 0) {
      return message.reply(`Nem találtam szivart árusító dohányboltot **${keresettVaros}** környékén 😔`);
    }

    let page = 0;
    const perPage = 10;
    const totalPages = Math.ceil(talalatok.length / perPage);

    const generateEmbed = (pageIndex) => {
      const start = pageIndex * perPage;
      const current = talalatok.slice(start, start + perPage);

      const description = current
        .map(b => `• **${b.name}** – ${b.address}, ${b.city} (${b.postalCode})`)
        .join('\n');

      return new EmbedBuilder()
        .setColor(0x8B4513)
        .setTitle(`Szivarboltok ${keresettVaros.charAt(0).toUpperCase() + keresettVaros.slice(1)} környékén`)
        .setDescription(description)
        .setFooter({
          text: `Oldal ${pageIndex + 1}/${totalPages} – Összesen ${talalatok.length} találat`,
        });
    };

    const createRow = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⏮️ Előző')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('⏭️ Következő')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const embedMessage = await message.reply({
      embeds: [generateEmbed(page)],
      components: [createRow()],
    });

    const filter = (i) =>
      ['prev', 'next'].includes(i.customId) &&
      i.user.id === message.author.id;

    const collector = embedMessage.createMessageComponentCollector({
      filter,
      time: 120000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'prev' && page > 0) {
        page--;
      }

      if (interaction.customId === 'next' && page < totalPages - 1) {
        page++;
      }

      await interaction.update({
        embeds: [generateEmbed(page)],
        components: [createRow()],
      });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⏮️ Előző')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),

        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('⏭️ Következő')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      try {
        await embedMessage.edit({ components: [disabledRow] });
      } catch (error) {
        console.error("❌ Nem sikerült letiltani a gombokat:", error);
      }
    });
  }
});

// 🔹 Keep-alive webserver Renderhez
const app = express();

app.get('/', (req, res) => {
  res.send('SzivarBot is running!');
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Webserver running on port ${process.env.PORT || 3000}`);
});

// 🔹 Bot indítása
client.login(token);