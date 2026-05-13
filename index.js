// 🔹 Token beolvasása
const token = process.env.BOT_TOKEN?.trim();

if (!token) {
  console.error("❌ BOT_TOKEN nincs beállítva Render Environment Variables alatt!");
  process.exit(1);
}

client.login(token);

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const fs = require('fs');

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

  const allowedChannelId = '1427954374923259965'; // csak ebben a szobában reagál
  if (message.channel.id !== allowedChannelId) return;

  if (message.content.toLowerCase().startsWith('!szivar')) {
    const args = message.content.split(' ').slice(1);
    const keresettVaros = args.join(' ').trim().toLowerCase();

    if (!keresettVaros) {
      return message.reply('Kérlek adj meg egy várost! Példa: `!szivar Szeged`');
    }

    const talalatok = dohanyboltok.filter(bolt =>
      bolt.city.toLowerCase().includes(keresettVaros)
    );

    if (talalatok.length === 0) {
      return message.reply(`Nem találtam szivart árusító dohányboltot **${keresettVaros}** környékén 😔`);
    }

    // ➡️ Lapoztatás beállítása
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
        .setFooter({ text: `Oldal ${pageIndex + 1}/${totalPages} – Összesen ${talalatok.length} találat` });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⏮️ Előző')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('⏭️ Következő')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(totalPages <= 1)
    );

    const embedMessage = await message.reply({ embeds: [generateEmbed(page)], components: [row] });

    const filter = (i) => ['prev', 'next'].includes(i.customId) && i.user.id === message.author.id;
    const collector = embedMessage.createMessageComponentCollector({ filter, time: 120000 }); // 2 percig aktív

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'prev' && page > 0) page--;
      else if (interaction.customId === 'next' && page < totalPages - 1) page++;

      // Frissítjük a gombok állapotát
      row.components[0].setDisabled(page === 0);
      row.components[1].setDisabled(page === totalPages - 1);

      await interaction.update({ embeds: [generateEmbed(page)], components: [row] });
    });

    collector.on('end', async () => {
      // Időtúllépés után gombok letiltása
      row.components.forEach((b) => b.setDisabled(true));
      await embedMessage.edit({ components: [row] });
    });
  }
});

// 🔹 Token beillesztése (.env-ből)
require('dotenv').config();
client.login(process.env.BOT_TOKEN);

// Keep-alive webserver for Render free plan
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('SzivarBot is running!'));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Webserver running on port ${process.env.PORT || 3000}`);
});

async function keepAliveReconnect() {
  console.log("⏳ Checking bot connection...");

  try {
    if (!client.isReady()) {
      console.log("⚠️ Bot is not connected — trying to reconnect...");
      client.destroy(); // bontjuk a régi, lefagyott kapcsolatot
      await client.login(token);
      console.log("✅ Bot reconnected successfully!");
    } else {
      console.log("✅ Bot connection is healthy.");
    }
  } catch (error) {
    console.error("❌ Reconnect attempt failed:", error);
  }
}

// Ellenőrzi 5 percenként (300 000 ms)
setInterval(keepAliveReconnect, 300000);
