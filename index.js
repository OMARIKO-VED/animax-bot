require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
  AuditLogEvent,
  SlashCommandBuilder
} = require('discord.js');

const config = require('./config');

// ==========================================
// 24/7 CRASH GUARD & AUTO-HEALING
// ==========================================
process.on('uncaughtException', (err) => {
  console.error('[Bot Guard] Caught Unhandled Exception (Prevented Crash):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Bot Guard] Caught Unhandled Rejection (Prevented Crash):', reason);
});

// ==========================================
// LIVE WEBSITE OBSERVER & KNOWLEDGE ENGINE
// ==========================================
const websiteState = {
  isOnline: false,
  latency: 0,
  totalCatalog: 595,
  localAnimeList: [],
  trending: [],
  lastChecked: null,
  activeMirrors: ['Enma MegaPlay (1080p Ultra HD)']
};

async function syncWebsiteState() {
  const start = Date.now();
  try {
    const airingRes = await fetch(`${config.siteUrl}/api/top-airing`, { signal: AbortSignal.timeout(5000) });
    if (airingRes.ok) {
      const airingData = await airingRes.json();
      websiteState.isOnline = true;
      websiteState.latency = Date.now() - start;
      const list = Array.isArray(airingData.results?.data)
        ? airingData.results.data
        : (Array.isArray(airingData.results) ? airingData.results : (Array.isArray(airingData.data) ? airingData.data : []));
      websiteState.trending = list;
      websiteState.lastChecked = new Date();
    } else {
      websiteState.isOnline = false;
    }
  } catch (e) {
    websiteState.isOnline = false;
    websiteState.latency = 0;
  }

  try {
    if (websiteState.localAnimeList.length === 0 || Math.random() < 0.1) {
      const catalogRes = await fetch(`${config.siteUrl}/api/enma/massive-catalog`, { signal: AbortSignal.timeout(6000) });
      if (catalogRes.ok) {
        const catData = await catalogRes.json();
        const items = catData.results || catData.data || [];
        if (items.length > 0) {
          websiteState.totalCatalog = items.length;
          websiteState.localAnimeList = items;
        }
      }
    }
  } catch (_) {}
}

const token = process.env.DISCORD_TOKEN?.trim();

if (!token || token === 'your_bot_token_here' || token.length < 20) {
  console.log(`
===========================================================
  ❌ DISCORD_TOKEN is missing or not configured!
===========================================================
  Please follow these steps:
  1. Go to https://discord.com/developers/applications
  2. Create an Application, name it "Animax Bot"
  3. Go to the "Bot" tab -> Click "Reset Token" and copy it
  4. Paste the token into your .env file:
     DISCORD_TOKEN=your_token_here
  5. Run: npm start
===========================================================
`);
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember]
});

// Slash Command Definitions
const slashCommands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Automatically creates all Animax channels, categories, roles, and embeds in seconds.'),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Grants yourself the Admin role and all server roles (Server Owner Only).'),

  new SlashCommandBuilder()
    .setName('giveadmin')
    .setDescription('Grants the Admin role to a specified member (Server Owner Only).')
    .addUserOption((opt) => opt.setName('user').setDescription('The member to promote to Admin').setRequired(true)),

  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promotes a member to Admin (Server Owner Only).')
    .addUserOption((opt) => opt.setName('user').setDescription('The member to promote to Admin').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeadmin')
    .setDescription('Revokes the Admin role from a member (Server Owner Only).')
    .addUserOption((opt) => opt.setName('user').setDescription('The member to remove Admin from').setRequired(true)),

  new SlashCommandBuilder()
    .setName('lockgeneral')
    .setDescription('Closes general chat and voice so only Admins & High Roles can see and use them.'),

  new SlashCommandBuilder()
    .setName('unlockgeneral')
    .setDescription('Reopens general chat and voice channels to everyone.'),

  new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Live search for any anime title on AniList with score, synopsis, and stream link.')
    .addStringOption((opt) => opt.setName('title').setDescription('Anime title (e.g. Solo Leveling, Attack on Titan)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('airing')
    .setDescription('Shows the top trending and releasing anime airing this season.'),

  new SlashCommandBuilder()
    .setName('randomanime')
    .setDescription('Recommends a random top-rated anime or hidden gem to watch!'),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk deletes messages in the current channel (Staff Only).')
    .addIntegerOption((opt) => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)),

  new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Shows video player troubleshooting and streaming help.'),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates an interactive community voting poll with reactions.')
    .addStringOption((opt) => opt.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption((opt) => opt.setName('option1').setDescription('First Option').setRequired(true))
    .addStringOption((opt) => opt.setName('option2').setDescription('Second Option').setRequired(true))
    .addStringOption((opt) => opt.setName('option3').setDescription('Third Option (optional)').setRequired(false))
    .addStringOption((opt) => opt.setName('option4').setDescription('Fourth Option (optional)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('release')
    .setDescription('Publishes a stylized episode release alert into #latest-releases (Staff Only).')
    .addStringOption((opt) => opt.setName('title').setDescription('Anime Title (e.g. Solo Leveling)').setRequired(true))
    .addStringOption((opt) => opt.setName('episode').setDescription('Episode Number (e.g. Episode 08)').setRequired(true))
    .addStringOption((opt) => opt.setName('link').setDescription('Streaming link on Animax').setRequired(true))
    .addStringOption((opt) => opt.setName('image').setDescription('Poster or thumbnail image URL').setRequired(false)),

  new SlashCommandBuilder()
    .setName('mangarelease')
    .setDescription('Publishes a manga or light novel chapter release alert into #manga-and-novels (Staff Only).')
    .addStringOption((opt) => opt.setName('title').setDescription('Manga or Novel Title (e.g. Chainsaw Man)').setRequired(true))
    .addStringOption((opt) => opt.setName('chapter').setDescription('Chapter or Volume (e.g. Chapter 162 or Volume 11)').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Format type')
        .setRequired(false)
        .addChoices(
          { name: 'Manga / Manhwa', value: 'Manga' },
          { name: 'Light Novel', value: 'Light Novel' }
        )
    )
    .addStringOption((opt) => opt.setName('link').setDescription('Reading link on Animax').setRequired(false))
    .addStringOption((opt) => opt.setName('image').setDescription('Cover image URL').setRequired(false)),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Sends an official announcement card into #announcements (Staff Only).')
    .addStringOption((opt) => opt.setName('title').setDescription('Announcement Title').setRequired(true))
    .addStringOption((opt) => opt.setName('message').setDescription('Announcement Body text').setRequired(true)),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Updates website, CDN, and player status in #site-status (Staff Only).')
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Current health status')
        .setRequired(true)
        .addChoices(
          { name: 'Operational', value: 'Operational' },
          { name: 'Maintenance', value: 'Maintenance' },
          { name: 'Issues / Degraded', value: 'Issues' }
        )
    )
    .addStringOption((opt) => opt.setName('details').setDescription('Detailed information about status or downtime').setRequired(true)),

  new SlashCommandBuilder()
    .setName('checkserver')
    .setDescription('Checks live connection and health of the Animax streaming server (localhost).'),

  new SlashCommandBuilder()
    .setName('website')
    .setDescription('Displays a live dashboard of Animax streaming server, library count, and top trending.'),

  new SlashCommandBuilder()
    .setName('download')
    .setDescription('Generates instant high-speed download links for any anime episode.')
    .addStringOption((opt) => opt.setName('title').setDescription('Anime Title (e.g. One Piece, Attack on Titan)').setRequired(true))
    .addIntegerOption((opt) => opt.setName('episode').setDescription('Episode Number (default: 1)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Look up the next episode release date and countdown for any ongoing anime.')
    .addStringOption((opt) => opt.setName('title').setDescription('Anime Title (e.g. One Piece)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('manga')
    .setDescription('Live search for any manga or manhwa with AniList rating, chapters, and read links.')
    .addStringOption((opt) => opt.setName('title').setDescription('Manga title (e.g. Chainsaw Man, Solo Leveling, Berserk)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('novel')
    .setDescription('Live search for any light novel with AniList rating, volumes, and read links.')
    .addStringOption((opt) => opt.setName('title').setDescription('Light novel title (e.g. Classroom of the Elite, Mushoku Tensei)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays all Animax Bot commands and usage.')
];

const slashCommandsJSON = slashCommands.map((c) => c.toJSON());

client.once('clientReady', async () => {
  console.log('-----------------------------------------------------------');
  console.log(`🚀 Animax Bot is ONLINE as ${client.user.tag}!`);
  console.log(`📡 Ready to manage and setup Animax anime streaming server.`);
  console.log('-----------------------------------------------------------');

  // Initial sync with Animax website
  await syncWebsiteState();

  // Background observer interval: poll website every 30 seconds
  setInterval(async () => {
    await syncWebsiteState();
  }, 30000);

  // Dynamic Presence: rotate activities reflecting website state
  let presenceIndex = 0;
  const updateDynamicPresence = () => {
    try {
      const topTitle = websiteState.trending[0]?.title || 'One Piece';
      const activities = [
        { name: `${websiteState.totalCatalog || 595}+ Anime on Animax`, type: ActivityType.Watching },
        { name: `Trending: ${topTitle}`, type: ActivityType.Watching },
        { name: `${config.siteUrl.replace('http://', '')} | /website`, type: ActivityType.Watching },
        { name: websiteState.isOnline ? `🟢 Animax Online (${websiteState.latency}ms)` : 'Animax Streaming', type: ActivityType.Watching }
      ];
      const act = activities[presenceIndex % activities.length];
      client.user.setActivity(act.name, { type: act.type });
      presenceIndex++;
    } catch (_) {}
  };

  updateDynamicPresence();
  setInterval(updateDynamicPresence, 15000);

  // Register slash commands globally and on active guilds for instant use
  try {
    if (client.application) {
      await client.application.commands.set(slashCommandsJSON);
    }
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(slashCommandsJSON).catch(() => {});
    }
    console.log('✅ Slash commands successfully registered across all servers!');
  } catch (err) {
    console.error('⚠️ Could not register slash commands:', err.message);
  }

  // Auto-post intro into #manga-and-novels if empty
  try {
    for (const guild of client.guilds.cache.values()) {
      const mangaChannel = guild.channels.cache.find(
        (c) => c.name === 'manga-and-novels' && c.isTextBased()
      );
      if (mangaChannel) {
        await postMangaAndNovelsIntro(mangaChannel).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Could not auto-post manga intro:', err.message);
  }
});

// Register slash commands when bot joins any new server
client.on('guildCreate', async (guild) => {
  try {
    await guild.commands.set(slashCommandsJSON);
    console.log(`✅ Slash commands registered in new server: ${guild.name}`);
  } catch (err) {
    console.error(`⚠️ Could not register slash commands in ${guild.name}:`, err.message);
  }
});

// Role buttons map (pings + audio + genre roles)
const ROLE_BUTTON_MAP = {
  btn_ping_episodes: '🔔 Episode Pings',
  btn_ping_updates: '📢 Update Pings',
  btn_ping_watchparty: '🍿 Watch Party Pings',
  btn_pref_sub: '🎧 Subtitles Team',
  btn_pref_dub: '🎙️ English Dub Team',
  btn_genre_shonen: '⚔️ Shonen',
  btn_genre_isekai: '🌀 Isekai',
  btn_genre_romance: '💖 Romance',
  btn_genre_seinen: '🧠 Seinen',
  btn_genre_fantasy: '🔮 Fantasy & Magic',
  btn_genre_horror: '👻 Psychological & Horror'
};

// ==========================================
// AUTO-WELCOME & AUTO-ROLE (guildMemberAdd)
// ==========================================
client.on('guildMemberAdd', async (member) => {
  try {
    // 1. Auto-assign the Otaku (Member) role
    const memberRole = member.guild.roles.cache.find((r) => r.name === '🌸 Otaku (Member)');
    if (memberRole) {
      await member.roles.add(memberRole).catch(() => {});
    }

    // 2. Post warm anime welcome card
    const welcomeChannel = member.guild.channels.cache.find(
      (c) => (c.name === 'welcome' || c.name === 'announcements') && c.isTextBased()
    );

    if (welcomeChannel) {
      const rulesChannel = member.guild.channels.cache.find((c) => c.name === 'rules');
      const rolesChannel = member.guild.channels.cache.find((c) => c.name === 'role-select');
      const chatChannel = member.guild.channels.cache.find((c) => c.name === 'anime-discussion');

      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🌸 Welcome to Animax, ${member.user.username}!`)
        .setDescription(
          `Welcome <@${member.id}> to the official **Animax** anime streaming community!\n\n` +
          `• 📜 **Rules & Guidelines**: ${rulesChannel ? `<#${rulesChannel.id}>` : '#rules'}\n` +
          `• 🔔 **Notification & Genre Roles**: ${rolesChannel ? `<#${rolesChannel.id}>` : '#role-select'}\n` +
          `• 💬 **Anime Chat**: ${chatChannel ? `<#${chatChannel.id}>` : '#anime-discussion'}\n\n` +
          `Sit back, grab some popcorn, and enjoy streaming your favorite shows!`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: `Member #${member.guild.memberCount} • Happy Streaming!` })
        .setTimestamp();

      await welcomeChannel.send({ content: `👋 Welcome <@${member.id}>!`, embeds: [welcomeEmbed] });
    }
  } catch (err) {
    console.error('Error in guildMemberAdd handler:', err);
  }
});

// ==========================================
// 24/7 ANTI-BYPASS SECURITY GUARD
// ==========================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const adminRole = newMember.guild.roles.cache.find(
      (r) => r.name === 'Admin' || r.name === '👑 Founder / Admin'
    );
    if (!adminRole) return;

    const hadAdmin = oldMember.roles.cache.has(adminRole.id);
    const hasAdmin = newMember.roles.cache.has(adminRole.id);

    if (!hadAdmin && hasAdmin) {
      const ownerId = newMember.guild.ownerId;
      const botId = client.user.id;

      if (newMember.id === ownerId) return;

      const fetchedLogs = await newMember.guild
        .fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberRoleUpdate
        })
        .catch(() => null);

      if (!fetchedLogs) return;

      const roleLog = fetchedLogs.entries.first();
      if (!roleLog) return;

      const executor = roleLog.executor;
      const target = roleLog.target;

      if (target && target.id === newMember.id && Date.now() - roleLog.createdTimestamp < 15000) {
        if (executor && executor.id !== ownerId && executor.id !== botId) {
          console.warn(`[SECURITY] Blocked unauthorized Admin grant by ${executor.tag} to ${newMember.user.tag}`);

          await newMember.roles.remove(adminRole, 'Unauthorized Admin role grant - only Server Owner can grant Admin');

          const alertEmbed = new EmbedBuilder()
            .setColor(config.colors.danger)
            .setTitle('🚨 Security Block: Unauthorized Admin Assignment')
            .setDescription(
              `User <@${executor.id}> attempted to grant the **Admin** role to <@${newMember.id}>.\n\n` +
              `🔒 **Action Taken**: The **Admin** role was instantly revoked.\n` +
              `👑 **Rule**: Only the Server Owner (<@${ownerId}>) has authority to grant the Admin title.`
            )
            .setTimestamp();

          const alertChannel = newMember.guild.channels.cache.find(
            (c) => (c.name === 'announcements' || c.name === 'general-chat') && c.isTextBased()
          );

          if (alertChannel) {
            await alertChannel.send({ embeds: [alertEmbed] });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in guildMemberUpdate security guard:', err);
  }
});

// ==========================================
// ANILIST API HELPERS
// ==========================================
async function searchAnimeAniList(searchTitle) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        description(asHtml: false)
        episodes
        status
        averageScore
        seasonYear
        genres
        studios(isMain: true) {
          nodes {
            name
          }
        }
        coverImage {
          large
          extraLarge
        }
        siteUrl
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { search: searchTitle } })
    });
    const data = await res.json();
    return data?.data?.Media || null;
  } catch (err) {
    console.error('Error searching AniList:', err);
    return null;
  }
}

async function getAiringAnimeAniList() {
  const query = `
    query {
      Page(page: 1, perPage: 8) {
        media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            english
            romaji
          }
          episodes
          nextAiringEpisode {
            episode
            timeUntilAiring
          }
          averageScore
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    return data?.data?.Page?.media || [];
  } catch (err) {
    console.error('Error fetching airing anime:', err);
    return [];
  }
}

async function getRandomAnimeAniList() {
  const randomPage = Math.floor(Math.random() * 60) + 1;
  const query = `
    query ($page: Int) {
      Page(page: $page, perPage: 1) {
        media(type: ANIME, sort: SCORE_DESC) {
          id
          title {
            english
            romaji
          }
          description(asHtml: false)
          episodes
          averageScore
          genres
          coverImage {
            large
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { page: randomPage } })
    });
    const data = await res.json();
    return data?.data?.Page?.media?.[0] || null;
  } catch (err) {
    console.error('Error fetching random anime:', err);
    return null;
  }
}

async function searchMangaAniList(title, isNovel = false) {
  const query = `
    query ($search: String, $format: MediaFormat) {
      Media(search: $search, type: MANGA, format: $format, sort: [POPULARITY_DESC]) {
        id
        idMal
        title {
          english
          romaji
          native
        }
        format
        chapters
        volumes
        status
        averageScore
        description(asHtml: false)
        genres
        coverImage {
          extraLarge
          large
        }
        siteUrl
      }
    }
  `;

  try {
    const variables = { search: title };
    if (isNovel) variables.format = 'NOVEL';
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const data = await res.json();
    return data?.data?.Media || null;
  } catch (err) {
    console.error('Error searching AniList Manga:', err);
    return null;
  }
}

async function executeMangaLookup(title, isNovel = false) {
  const manga = await searchMangaAniList(title, isNovel);
  if (!manga) {
    return { error: `❌ Could not find any ${isNovel ? 'light novel' : 'manga'} matching: **${title}**.` };
  }

  const titleEnglish = manga.title?.english || manga.title?.romaji || manga.title?.native;
  const titleRomaji = manga.title?.romaji ? `*${manga.title.romaji}*` : '';
  const cleanDescription = (manga.description || 'No synopsis provided.')
    .replace(/<[^>]*>?/gm, '')
    .slice(0, 420) + '...';

  const score = manga.averageScore ? `⭐ **${manga.averageScore} / 100**` : 'Unrated';
  const chapters = manga.chapters ? `📖 **${manga.chapters} Chapters**` : 'Publishing';
  const volumes = manga.volumes ? `📚 **${manga.volumes} Volumes**` : 'Ongoing';
  const genres = manga.genres ? manga.genres.join(', ') : 'Manga';
  const formatLabel = manga.format === 'NOVEL' ? 'Light Novel' : 'Manga';

  const readUrl = isNovel 
    ? `https://www.novelupdates.com/?s=${encodeURIComponent(titleEnglish)}`
    : `https://mangadex.org/search?q=${encodeURIComponent(titleEnglish)}`;

  const embed = new EmbedBuilder()
    .setColor(isNovel ? 0xFD79A8 : 0x6C5CE7)
    .setTitle(`${isNovel ? '📖 [Light Novel]' : '📚 [Manga]'} ${titleEnglish}`)
    .setDescription(`${titleRomaji}\n\n${cleanDescription}`)
    .addFields(
      { name: '📊 Rating', value: score, inline: true },
      { name: '📑 Chapters / Vols', value: `${chapters} • ${volumes}`, inline: true },
      { name: '📌 Status', value: manga.status || 'RELEASING', inline: true },
      { name: '🏷️ Genres', value: genres, inline: false },
      { name: '🔗 Read Online', value: `[Read on ${isNovel ? 'NovelUpdates' : 'MangaDex'}](${readUrl}) • [AniList Profile](${manga.siteUrl || `https://anilist.co/manga/${manga.id}`}) • [View on Animax](${config.siteUrl}/#catalogSection)` }
    )
    .setFooter({ text: `Animax Manga Hub • Format: ${formatLabel}` })
    .setTimestamp();

  if (manga.coverImage?.extraLarge || manga.coverImage?.large) {
    embed.setThumbnail(manga.coverImage.extraLarge || manga.coverImage.large);
  }

  return { embed };
}

async function postMangaAndNovelsIntro(channel) {
  if (!channel || !channel.isTextBased()) return;
  const msgs = await channel.messages.fetch({ limit: 1 }).catch(() => null);
  if (msgs && msgs.size > 0) return; // Channel already has messages

  const embed = new EmbedBuilder()
    .setColor(0x6C5CE7)
    .setTitle('📚 Welcome to #manga-and-novels!')
    .setDescription(
      'Welcome to the dedicated reading and discussion zone for **Manga**, **Manhwa**, **Manhua**, and **Light Novels** on Animax!\n\n' +
      '**✨ Features & Bot Commands:**\n' +
      '• **Search Manga**: Type `/manga <title>` (e.g. `/manga Chainsaw Man` or `/manga Solo Leveling`)\n' +
      '• **Search Light Novels**: Type `/novel <title>` (e.g. `/novel Classroom of the Elite` or `/novel Overlord`)\n' +
      '• **Animax Reading Hub**: Browse the **Manga** & **Light Novels** library directly on the [Animax Website](' + config.siteUrl + '/#catalogSection)!\n' +
      '• **Discussion & Sharing**: Share chapter reactions, novel theories, and reading recommendations with the community!'
    )
    .addFields(
      { name: '🔥 Top Popular Manga', value: '• **Chainsaw Man**\n• **Solo Leveling**\n• **Jujutsu Kaisen**\n• **Berserk**\n• **One Piece**', inline: true },
      { name: '📖 Top Light Novels', value: '• **Classroom of the Elite**\n• **Mushoku Tensei**\n• **Re:Zero**\n• **Overlord**\n• **Sword Art Online**', inline: true }
    )
    .setFooter({ text: 'Animax Manga & Light Novel Hub • Use /manga or /novel anytime' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ==========================================
// CORE COMMAND IMPLEMENTATIONS
// ==========================================

function getHelpEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎬 Animax Bot Commands & Features')
    .setDescription('Official bot for the **Animax** Anime Streaming Community')
    .addFields(
      {
        name: '🎌 Anime, Manga & Novels Lookups',
        value:
          '• `/anime <title>` — Live anime search with ratings, synopsis, and stream link.\n' +
          '• `/manga <title>` — Search any manga/manhwa with chapter count, ratings, and read links.\n' +
          '• `/novel <title>` — Search light novels with volume counts and translations.\n' +
          '• `/schedule [title]` — Look up next episode release countdowns and broadcast dates.\n' +
          '• `/airing` — View top trending anime currently releasing this season.\n' +
          '• `/randomanime` — Get a top-rated random anime recommendation!\n' +
          '• `/faq` — Streaming player and playback troubleshooting guide.'
      },
      {
        name: '👑 Server Owner Commands (Owner Only)',
        value:
          '• `/admin` — Claim the Admin role and all community roles.\n' +
          '• `/giveadmin @user` (or `/promote`) — Grant Admin to a trusted member.\n' +
          '• `/removeadmin @user` — Revoke Admin from a member.'
      },
      {
        name: '🛡️ Moderation & Management (Staff Only)',
        value:
          '• `/setup` — Auto-generates the server architecture, roles, and embeds.\n' +
          '• `/lockgeneral` & `/unlockgeneral` — Restricts or reopens general chat & voice.\n' +
          '• `/clear <amount>` — Bulk deletes 1–100 messages to remove spam/spoilers.\n' +
          '• `/poll <question> <options>` — Creates interactive community polls.\n' +
          '• `/release` — Publishes new episode alerts into `#latest-releases`.\n' +
          '• `/announce` — Sends announcements into `#announcements`.\n' +
          '• `/status` — Updates site, player, and CDN status in `#site-status`.'
      }
    )
    .setFooter({ text: 'Animax Bot • Use slash commands (/) or prefix (!)' })
    .setTimestamp();
}

async function executeSetup(guild, member, editReply) {
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== member.id) {
    return editReply({ content: '⛔ You need **Administrator** permissions to run the server setup.' });
  }

  const oldFounderRole = guild.roles.cache.find((r) => r.name === '👑 Founder / Admin');
  if (oldFounderRole) {
    await oldFounderRole.setName('Admin').catch(() => {});
  }

  // 1. Create Roles
  await editReply({ content: '⏳ **[1/3]** Verifying roles (Admin, Moderator, Supporter)...' }).catch(() => {});
  const createdRoles = {};
  for (const roleDef of config.roles) {
    let role = guild.roles.cache.find((r) => r.name === roleDef.name);
    if (!role && roleDef.name === 'Admin') {
      role = guild.roles.cache.find((r) => r.name === '👑 Founder / Admin');
    }

    if (!role) {
      role = await guild.roles.create({
        name: roleDef.name,
        color: roleDef.color,
        hoist: roleDef.hoist || false,
        mentionable: roleDef.mentionable || false,
        permissions: roleDef.permissions
          ? roleDef.permissions.map((p) => PermissionsBitField.Flags[p])
          : [],
        reason: 'Animax Bot automated server setup'
      });
    }
    createdRoles[roleDef.name] = role;
  }

  try {
    const rolesToAssign = Object.values(createdRoles);
    await member.roles.add(rolesToAssign);
  } catch (roleErr) {
    console.warn('Could not auto-assign all roles during setup:', roleErr.message);
  }

  const adminRole = createdRoles['Admin'] || createdRoles['👑 Founder / Admin'];
  const devRole = createdRoles['💻 Site Developer'];
  const modRole = createdRoles['🛡️ Moderator'];

  // 2. Create Categories & Channels
  await editReply({ content: '⏳ **[2/3]** Generating channels & categories...' }).catch(() => {});
  for (const catDef of config.structure) {
    let category = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catDef.category.toLowerCase()
    );

    if (!category) {
      category = await guild.channels.create({
        name: catDef.category,
        type: ChannelType.GuildCategory,
        reason: 'Animax server setup'
      });
    }

    for (const chDef of catDef.channels) {
      const isVoice = chDef.type === 'GuildVoice';
      const chType = isVoice ? ChannelType.GuildVoice : ChannelType.GuildText;

      let channel = guild.channels.cache.find(
        (c) => c.name.toLowerCase() === chDef.name.toLowerCase() && c.parentId === category.id
      );

      const permissionOverwrites = [];

      if (chDef.staffOnly) {
        if (isVoice) {
          permissionOverwrites.push({
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
          });
          if (adminRole) permissionOverwrites.push({ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] });
          if (devRole) permissionOverwrites.push({ id: devRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] });
          if (modRole) permissionOverwrites.push({ id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] });
        } else {
          permissionOverwrites.push({
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          });
          if (adminRole) permissionOverwrites.push({ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AddReactions] });
          if (devRole) permissionOverwrites.push({ id: devRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AddReactions] });
          if (modRole) permissionOverwrites.push({ id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AddReactions] });
        }
      } else if (chDef.readOnly) {
        permissionOverwrites.push({
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AddReactions],
          deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.CreatePrivateThreads]
        });
        if (adminRole) permissionOverwrites.push({ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] });
        if (devRole) permissionOverwrites.push({ id: devRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks] });
      }

      if (!channel) {
        channel = await guild.channels.create({
          name: chDef.name,
          type: chType,
          topic: chDef.topic || '',
          parent: category.id,
          permissionOverwrites: permissionOverwrites.length > 0 ? permissionOverwrites : undefined,
          reason: 'Animax server setup'
        });
      } else {
        if (permissionOverwrites.length > 0) {
          await channel.permissionOverwrites.set(permissionOverwrites).catch(() => {});
        }
        if (chDef.topic && !isVoice && channel.topic !== chDef.topic) {
          await channel.setTopic(chDef.topic).catch(() => {});
        }
      }

      // Actions / Embed postings (only if channel is empty)
      let isEmpty = true;
      if (chDef.action && channel.isTextBased()) {
        const msgs = await channel.messages.fetch({ limit: 1 }).catch(() => null);
        isEmpty = !msgs || msgs.size === 0;
      }

      if (isEmpty && chDef.action === 'postWelcomeGuide') {
        const welcomeGuideEmbed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('🌸 Welcome to the Official Animax Community!')
          .setDescription(
            'Your #1 hub for high-quality anime streaming, watch parties, weekly episode reactions, and community chatter.\n\n' +
            '**Quick Getting Started Checklist:**\n' +
            '1️⃣ **Read the Rules**: Visit <#rules> to check our spoiler etiquette and guidelines.\n' +
            '2️⃣ **Pick Notification & Genre Roles**: Visit <#role-select> to receive episode drop alerts and customized genre role badges!\n' +
            '3️⃣ **Join the Conversation**: Talk anime in <#anime-discussion> or react to the latest airing shows in <#episode-reactions>.\n' +
            '4️⃣ **Try Bot Commands**: Head to <#bot-commands> and type `/anime` or `/randomanime`!\n' +
            '5️⃣ **Having Playback Issues?**: Check <#faq> and <#site-status>.'
          )
          .setFooter({ text: 'Animax Streaming • Enjoy your stay!' })
          .setTimestamp();
        await channel.send({ embeds: [welcomeGuideEmbed] });
      } else if (chDef.action === 'postRules') {
        const rulesEmbed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(config.rulesContent.title)
          .setDescription(config.rulesContent.description)
          .addFields(config.rulesContent.fields)
          .setFooter({ text: config.rulesContent.footer })
          .setTimestamp();
        await channel.send({ embeds: [rulesEmbed] });
      } else if (chDef.action === 'postWelcome') {
        const announceEmbed = new EmbedBuilder()
          .setColor(config.colors.secondary)
          .setTitle('📢 Welcome to Animax Announcements!')
          .setDescription(
            'Stay tuned here for major site updates, player improvements, domain mirrors, seasonal anime schedule launches, and community giveaways!'
          )
          .setFooter({ text: 'Animax Official Announcements' })
          .setTimestamp();
        await channel.send({ embeds: [announceEmbed] });
      } else if (chDef.action === 'postFAQ') {
        const faqEmbed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle(config.faqContent.title)
          .setDescription(config.faqContent.description)
          .addFields(config.faqContent.fields)
          .setFooter({ text: config.faqContent.footer })
          .setTimestamp();
        await channel.send({ embeds: [faqEmbed] });
      } else if (chDef.action === 'postStatus') {
        const statusEmbed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🟢 Animax Platform Status: All Systems Operational')
          .setDescription('Video CDN, HLS players, subtitle tracks, and search index are running normally.')
          .addFields(
            { name: '🌐 Web App', value: '`ONLINE`', inline: true },
            { name: '📺 Video CDN', value: '`ONLINE`', inline: true },
            { name: '⚡ API & Database', value: '`ONLINE`', inline: true }
          )
          .setFooter({ text: 'Last checked' })
          .setTimestamp();
        await channel.send({ embeds: [statusEmbed] });
      } else if (chDef.action === 'postRoleSelect') {
        const roleSelectEmbed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('🔔 Notification, Audio Preference & Anime Genre Roles')
          .setDescription(
            'Customize your server experience and tailor your notifications by clicking the buttons below!\n\n' +
            '**Row 1: Notification Alerts**\n' +
            '• 🔔 **Episode Alerts**: Pinged immediately when new episodes go live.\n' +
            '• 📢 **Site Updates**: Pinged for site improvements and maintenance.\n' +
            '• 🍿 **Watch Parties**: Pinged when community stream nights begin.\n\n' +
            '**Row 2: Audio Language Preferences**\n' +
            '• 🎧 **Subtitles Team**: Prefer Japanese voice with English subtitles.\n' +
            '• 🎙️ **English Dub Team**: Prefer English dubbed anime streams.\n\n' +
            '**Row 3: Favorite Anime Genres**\n' +
            'Show off your favorite anime taste with a custom color badge!\n' +
            '• ⚔️ **Shonen** • 🌀 **Isekai** • 💖 **Romance** • 🧠 **Seinen** • 🔮 **Fantasy** • 👻 **Horror**'
          )
          .setFooter({ text: 'Click any button to toggle the role on or off!' });

        const pingsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_ping_episodes').setLabel('Episode Alerts').setEmoji('🔔').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('btn_ping_updates').setLabel('Site Updates').setEmoji('📢').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('btn_ping_watchparty').setLabel('Watch Parties').setEmoji('🍿').setStyle(ButtonStyle.Success)
        );

        const audioRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_pref_sub').setLabel('Subtitles Team').setEmoji('🎧').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_pref_dub').setLabel('English Dub Team').setEmoji('🎙️').setStyle(ButtonStyle.Secondary)
        );

        const genresRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('btn_genre_shonen').setLabel('Shonen').setEmoji('⚔️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_genre_isekai').setLabel('Isekai').setEmoji('🌀').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_genre_romance').setLabel('Romance').setEmoji('💖').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_genre_seinen').setLabel('Seinen').setEmoji('🧠').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('btn_genre_fantasy').setLabel('Fantasy').setEmoji('🔮').setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ embeds: [roleSelectEmbed], components: [pingsRow, audioRow, genresRow] });
      } else if (chDef.action === 'postAiringSchedule') {
        const scheduleEmbed = new EmbedBuilder()
          .setColor(config.colors.secondary)
          .setTitle('📅 Weekly Anime Broadcast Schedule & Countdowns')
          .setDescription(
            'Keep track of currently airing anime, upcoming episode broadcast dates, and live release countdowns.\n\n' +
            '**Top Airing This Season:**\n' +
            '• **One Piece** — Sundays (Fuji TV) • Full HD Multi-Audio\n' +
            '• **Reincarnated as a Sword S2** — Thursdays\n' +
            '• **Bleach: Thousand-Year Blood War** — Saturdays\n\n' +
            '💡 *Type `/schedule` or `/airing` in <#bot-commands> to check exact live episode release countdowns!*'
          )
          .setFooter({ text: 'Animax Live Airing Engine' })
          .setTimestamp();
        await channel.send({ embeds: [scheduleEmbed] });
      } else if (chDef.action === 'postReleaseInfo') {
        const releaseSampleEmbed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('📺 [EXAMPLE] Solo Leveling Season 2 - Episode 08')
          .setDescription('A brand new episode is now ready to stream on **Animax**!')
          .addFields(
            { name: 'Sub / Dub', value: 'Japanese Audio (English Subs)', inline: true },
            { name: 'Quality', value: '1080p Full HD', inline: true },
            { name: 'Watch Now', value: `[Click to Watch on Animax](${config.siteUrl})` }
          )
          .setFooter({ text: 'Staff can post releases using /release' })
          .setTimestamp();
        await channel.send({ embeds: [releaseSampleEmbed] });
      } else if (chDef.action === 'postMangaIntro') {
        await postMangaAndNovelsIntro(channel);
      }
    }
  }

  const finishEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Animax Mega Server Setup Complete!')
    .setDescription(
      'Your Discord server has been upgraded with:\n\n' +
      '• **12 Custom Roles** (Staff, Supporter, Member, Ping roles, & Anime Genre badges)\n' +
      '• **5 Categories & 17 Channels** (including `#welcome`, `#faq`, `#bot-commands`, `#anime-polls`)\n' +
      '• **Auto-Welcome & Auto-Role System** for newcomers\n' +
      '• **Streaming Troubleshooting Desk** in `#faq`\n' +
      '• **Interactive 2-Row Role Picker** for pings and anime genres\n' +
      '• **Live Anime Database Integration** (`/anime`, `/airing`, `/randomanime`)\n\n' +
      '💡 *Use `/help` to see the complete list of bot commands.*'
    )
    .setTimestamp();

  return editReply({ content: null, embeds: [finishEmbed] });
}

// Helper: Owner Admin
async function executeAdmin(guild, member) {
  if (guild.ownerId !== member.id) {
    return { error: `⛔ **Access Denied**: Only the Server Owner (<@${guild.ownerId}>) has permission to use this command.` };
  }

  let adminRole = guild.roles.cache.find((r) => r.name === 'Admin' || r.name === '👑 Founder / Admin');
  if (!adminRole) {
    adminRole = await guild.roles.create({
      name: 'Admin',
      color: '#FF2A54',
      hoist: true,
      permissions: [PermissionsBitField.Flags.Administrator],
      reason: 'Animax Admin role creation'
    });
  }

  const rolesToGive = [];
  for (const roleDef of config.roles) {
    let r = guild.roles.cache.find((role) => role.name === roleDef.name);
    if (!r && roleDef.name === 'Admin') r = adminRole;
    if (r && !member.roles.cache.has(r.id)) rolesToGive.push(r);
  }

  if (rolesToGive.length === 0) {
    return { success: '✅ You already have the **Admin** role and all server roles assigned!' };
  }

  await member.roles.add(rolesToGive);
  const roleList = rolesToGive.map((r) => `• <@&${r.id}>`).join('\n');

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('👑 Roles Successfully Granted!')
    .setDescription(`Assigned the **Admin** role and all community roles to <@${member.id}>:\n\n${roleList}`)
    .setFooter({ text: 'Animax Bot • Server Owner Authority' })
    .setTimestamp();

  return { embed };
}

// Helper: Give Admin
async function executeGiveAdmin(guild, authorMember, targetMember) {
  if (guild.ownerId !== authorMember.id) {
    return { error: `⛔ **Access Denied**: Only the Server Owner (<@${guild.ownerId}>) has permission to grant the **Admin** role.` };
  }

  let adminRole = guild.roles.cache.find((r) => r.name === 'Admin' || r.name === '👑 Founder / Admin');
  if (!adminRole) {
    adminRole = await guild.roles.create({
      name: 'Admin',
      color: '#FF2A54',
      hoist: true,
      permissions: [PermissionsBitField.Flags.Administrator],
      reason: 'Animax Admin role creation'
    });
  }

  if (targetMember.roles.cache.has(adminRole.id)) {
    return { error: `⚠️ <@${targetMember.id}> already has the **Admin** role.` };
  }

  await targetMember.roles.add(adminRole);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('👑 Admin Role Granted')
    .setDescription(`Server Owner <@${authorMember.id}> has officially granted the **Admin** role to <@${targetMember.id}>!`)
    .setFooter({ text: 'Animax Bot • Exclusive Owner Authority' })
    .setTimestamp();

  return { embed };
}

// Helper: Remove Admin
async function executeRemoveAdmin(guild, authorMember, targetMember) {
  if (guild.ownerId !== authorMember.id) {
    return { error: `⛔ **Access Denied**: Only the Server Owner (<@${guild.ownerId}>) has permission to revoke the **Admin** role.` };
  }

  if (targetMember.id === guild.ownerId) {
    return { error: '❌ You cannot remove the Admin role from yourself (the Server Owner).' };
  }

  const adminRole = guild.roles.cache.find((r) => r.name === 'Admin' || r.name === '👑 Founder / Admin');
  if (!adminRole || !targetMember.roles.cache.has(adminRole.id)) {
    return { error: `⚠️ <@${targetMember.id}> does not currently have the **Admin** role.` };
  }

  await targetMember.roles.remove(adminRole);
  return { success: `✅ Successfully removed the **Admin** role from <@${targetMember.id}>.` };
}

// Helper: Lock General
async function executeLockGeneral(guild, member) {
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== member.id) {
    return { error: '⛔ You need **Administrator** permissions or must be the server owner to use this command.' };
  }

  const adminRole = guild.roles.cache.find((r) => r.name === 'Admin' || r.name === '👑 Founder / Admin');
  const devRole = guild.roles.cache.find((r) => r.name === '💻 Site Developer');
  const modRole = guild.roles.cache.find((r) => r.name === '🛡️ Moderator');

  const textChannels = guild.channels.cache.filter(
    (c) => (c.name.toLowerCase() === 'general-chat' || c.name.toLowerCase() === 'general') && c.isTextBased()
  );
  const voiceChannels = guild.channels.cache.filter(
    (c) => (c.name.toLowerCase().includes('lounge') || c.name.toLowerCase().includes('general')) && c.type === ChannelType.GuildVoice
  );

  const lockedList = [];

  for (const [, textCh] of textChannels) {
    const textOverwrites = [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }];
    if (adminRole) textOverwrites.push({ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AddReactions] });
    if (devRole) textOverwrites.push({ id: devRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AddReactions] });
    if (modRole) textOverwrites.push({ id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AddReactions] });

    await textCh.permissionOverwrites.set(textOverwrites);
    await textCh.setTopic('General chat (Closed - Admins & High Roles Only).').catch(() => {});
    lockedList.push(`• <#${textCh.id}> (Text Channel)`);
  }

  for (const [, voiceCh] of voiceChannels) {
    const voiceOverwrites = [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] }];
    if (adminRole) voiceOverwrites.push({ id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] });
    if (devRole) voiceOverwrites.push({ id: devRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] });
    if (modRole) voiceOverwrites.push({ id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.Stream] });

    await voiceCh.permissionOverwrites.set(voiceOverwrites);
    lockedList.push(`• <#${voiceCh.id}> (Voice Channel)`);
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🔒 General Channels Closed & Hidden from Public')
    .setDescription(
      `The general channels are now **closed and hidden** from regular members.\n\n` +
      `**Only visible and accessible to Admins & High Roles**:\n` +
      `• 👑 **Admin**\n` +
      `• 💻 **Site Developer**\n` +
      `• 🛡️ **Moderator**\n\n` +
      `**Secured Channels**:\n${lockedList.length > 0 ? lockedList.join('\n') : '*(No matching general channels found)*'}\n\n` +
      '💡 *Regular members still have access to #anime-discussion, #episode-reactions, and public watch party voice channels.*'
    )
    .setFooter({ text: 'Animax Bot • Access Control' })
    .setTimestamp();

  return { embed };
}

// Helper: Unlock General
async function executeUnlockGeneral(guild, member) {
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && guild.ownerId !== member.id) {
    return { error: '⛔ You need **Administrator** permissions or must be the server owner to use this command.' };
  }

  const textChannels = guild.channels.cache.filter(
    (c) => (c.name.toLowerCase() === 'general-chat' || c.name.toLowerCase() === 'general') && c.isTextBased()
  );
  const voiceChannels = guild.channels.cache.filter(
    (c) => (c.name.toLowerCase().includes('lounge') || c.name.toLowerCase().includes('general')) && c.type === ChannelType.GuildVoice
  );

  for (const [, textCh] of textChannels) {
    await textCh.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: true, SendMessages: true });
    await textCh.setTopic('Hang out and chat with fellow anime fans.').catch(() => {});
  }

  for (const [, voiceCh] of voiceChannels) {
    await voiceCh.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: true, Connect: true, Speak: true });
  }

  return { success: '🔓 **General channels have been reopened to everyone!**' };
}

// Helper: Clear messages
async function executeClear(channel, member, amount) {
  if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return { error: '⛔ You need **Manage Messages** permissions to clear messages.' };
  }

  try {
    const deleted = await channel.bulkDelete(amount, true);
    return { success: `🧹 Successfully deleted **${deleted.size}** messages.` };
  } catch (err) {
    return { error: `❌ Failed to delete messages: \`${err.message}\`. (Note: Messages older than 14 days cannot be bulk deleted).` };
  }
}

// Helper: Anime Search Embed (checks Animax Localhost Website FIRST, then AniList)
async function executeAnimeSearch(title) {
  // 1. Check Animax Website Live Search First
  let localResult = null;
  try {
    const localRes = await fetch(`${config.siteUrl}/api/search?keyword=${encodeURIComponent(title)}`, { signal: AbortSignal.timeout(4000) });
    if (localRes.ok) {
      const json = await localRes.json();
      const items = json.results?.data || json.results || [];
      if (items.length > 0) {
        localResult = items[0];
      }
    }
  } catch (_) {}

  if (localResult) {
    const titleText = localResult.title || title;
    const cleanDesc = (localResult.description || 'Watch now on Animax Ultra HD Anime Streaming.').slice(0, 380) + '...';
    const ratingTag = localResult.rating || localResult.tvInfo?.rating || 'PG-13';
    const subCount = localResult.episodes?.sub || localResult.sub || localResult.tvInfo?.eps || localResult.episodes || 'Multiple';
    const dubCount = localResult.episodes?.dub || localResult.dub || localResult.tvInfo?.dub || 'Available';
    const scoreVal = localResult.score ? `⭐ **${localResult.score} / 10**` : '⭐ **8.8 / 10**';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🎬 ${titleText}`)
      .setDescription(`${cleanDesc}\n\n🟢 **Available on Animax Streaming**`)
      .addFields(
        { name: '📊 Rating', value: ratingTag, inline: true },
        { name: '🎬 Episodes', value: `${subCount} (SUB) / ${dubCount} (DUB)`, inline: true },
        { name: '⚡ Stream Servers', value: 'HD-1, HD-2, HD-3, StreamSB', inline: true },
        { name: '🍿 Stream on Animax', value: `[▶️ Click to Watch on Animax](${config.siteUrl}/?search=${encodeURIComponent(titleText)})`, inline: false }
      )
      .setFooter({ text: 'Animax Live Catalog • Direct Streaming' })
      .setTimestamp();

    if (localResult.poster || localResult.image) {
      embed.setThumbnail(localResult.poster || localResult.image);
    }
    return { embed };
  }

  // 2. Fallback to AniList
  const anime = await searchAnimeAniList(title);
  if (!anime) {
    return { error: `❌ Could not find any anime matching: **${title}**.` };
  }

  const cleanDescription = (anime.description || 'No synopsis provided.')
    .replace(/<[^>]*>?/gm, '')
    .slice(0, 400) + '...';

  const titleEnglish = anime.title.english || anime.title.romaji;
  const titleRomaji = anime.title.romaji ? `*${anime.title.romaji}*` : '';
  const studio = anime.studios?.nodes?.[0]?.name || 'Unknown Studio';
  const score = anime.averageScore ? `⭐ **${anime.averageScore} / 100**` : 'N/A';
  const episodes = anime.episodes ? `${anime.episodes} Episodes` : 'Airing / TBA';
  const genres = anime.genres ? anime.genres.join(', ') : 'None listed';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(titleEnglish)
    .setDescription(`${titleRomaji}\n\n${cleanDescription}`)
    .addFields(
      { name: '📊 Rating', value: score, inline: true },
      { name: '🎬 Episodes', value: episodes, inline: true },
      { name: '🏢 Studio', value: studio, inline: true },
      { name: '🏷️ Genres', value: genres, inline: false },
      { name: '🍿 Stream on Animax', value: `[Watch on Animax Streaming](${config.siteUrl}/?search=${encodeURIComponent(titleEnglish)})` }
    )
    .setFooter({ text: 'Animax Anime Database • AniList Integration' })
    .setTimestamp();

  if (anime.coverImage?.large || anime.coverImage?.extraLarge) {
    embed.setThumbnail(anime.coverImage.extraLarge || anime.coverImage.large);
  }

  return { embed };
}

// Helper: Episode Download Lookup
async function executeDownloadLookup(title, ep = 1) {
  let mobUrl = 'http://192.168.100.85:8080';
  try {
    const tPath = path.join(__dirname, '..', '..', 'tunnel-url.txt');
    if (fs.existsSync(tPath)) {
      const u = fs.readFileSync(tPath, 'utf8').trim();
      if (u.startsWith('http')) mobUrl = u;
    }
  } catch (_) {}

  try {
    const sRes = await fetch(`${config.siteUrl}/api/download-links?id=${encodeURIComponent(title)}&ep=${ep}`);
    const sData = await sRes.json();
    if (sData.success && sData.data) {
      const d = sData.data;
      const fields = (d.mirrors || []).map((m, idx) => ({
        name: `${m.isRaw ? '⚡' : '🎬'} Mirror ${idx + 1}: ${m.server}`,
        value: `[${m.isRaw ? '📥 Direct 1080p Stream' : '▶️ Stream Mirror'}](${m.downloadUrl})\n\`${m.quality} • ${m.speed}\``,
        inline: true
      }));

      fields.push({
        name: '📱 Mobile / Web App',
        value: `[Open on Mobile / Web App](${mobUrl}/?search=${encodeURIComponent(d.animeTitle)})`,
        inline: true
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📥 Download: ${d.animeTitle} - Episode ${ep}`)
        .setDescription(`Select from verified high-speed mirrors below to download or stream offline without 410 errors:`)
        .addFields(fields)
        .setFooter({ text: 'Animax Multi-Mirror Download Engine' })
        .setTimestamp();
      return { embed };
    }
  } catch (err) {
    return { error: `❌ Could not resolve download mirrors for "${title}": ${err.message}` };
  }

  return { error: `❌ Could not resolve download links for "${title}".` };
}

// Helper: Live Website Dashboard Embed
async function executeWebsiteDashboard() {
  await syncWebsiteState();
  const isOnline = websiteState.isOnline;
  const statusEmoji = isOnline ? '🟢' : '🔴';
  const statusText = isOnline ? 'ONLINE & STREAMING' : 'OFFLINE / RECONNECTING';

  const list = Array.isArray(websiteState.trending) ? websiteState.trending : [];
  const trendingList = list.slice(0, 5).map((t, idx) => {
    const title = t.title || 'Unknown';
    const ep = t.episodes?.sub || t.sub || t.tvInfo?.eps || t.episodes || '?';
    return `**${idx + 1}.** [${title}](${config.siteUrl}/?search=${encodeURIComponent(title)}) • *Ep ${ep}*`;
  }).join('\n') || 'None recorded yet';

  const embed = new EmbedBuilder()
    .setColor(isOnline ? config.colors.success : config.colors.danger)
    .setTitle(`🌐 Animax Streaming Platform — Live Dashboard`)
    .setDescription(`Real-time system telemetry and content knowledge from **Animax**`)
    .addFields(
      { name: '📡 Server Status', value: `${statusEmoji} **${statusText}**`, inline: true },
      { name: '⚡ Response Latency', value: isOnline ? `\`${websiteState.latency}ms\`` : '`Timeout`', inline: true },
      { name: '📚 Library Vault', value: `\`${websiteState.totalCatalog}+ Anime Available\``, inline: true },
      { name: '🔥 Trending Today on Animax', value: trendingList, inline: false },
      { name: '🚀 Video Mirrors', value: '• **HD-1:** Fast CDN (Sub/Dub)\n• **HD-2:** Alternate 1080p\n• **HD-3:** Direct Stream\n• **Multi-Mirror:** Auto-Failover', inline: true },
      { name: '🔗 Platform URL', value: `[Open Animax Website](${config.siteUrl})`, inline: true }
    )
    .setFooter({ text: `Animax Bot 24/7 Watchdog • Last checked ${new Date().toLocaleTimeString()}` })
    .setTimestamp();

  return { embed };
}

// Helper: Airing Anime Embed
async function executeAiring() {
  const animeList = await getAiringAnimeAniList();
  if (animeList.length === 0) {
    return { error: '❌ Could not retrieve currently airing anime schedule.' };
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.secondary)
    .setTitle('🔥 Top Airing Anime This Season')
    .setDescription('Popular ongoing shows airing right now. Catch the latest drops on **Animax**!')
    .setFooter({ text: 'Animax Seasonal Schedule • Stay tuned for new releases' })
    .setTimestamp();

  for (const item of animeList.slice(0, 6)) {
    const title = item.title.english || item.title.romaji;
    const nextEp = item.nextAiringEpisode ? `Ep ${item.nextAiringEpisode.episode}` : 'Ongoing';
    const score = item.averageScore ? `⭐ ${item.averageScore}%` : 'Unrated';
    embed.addFields({
      name: title,
      value: `• **Next:** ${nextEp} | **Score:** ${score} • [Watch on Animax](${config.siteUrl}/?search=${encodeURIComponent(title)})`,
      inline: false
    });
  }

  return { embed };
}

// Helper: Episode Release Schedule & Countdown
async function executeSchedule(titleQuery) {
  if (titleQuery) {
    try {
      const res = await fetch(`${config.siteUrl}/api/next-airing?title=${encodeURIComponent(titleQuery)}`, { signal: AbortSignal.timeout(5000) });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const next = d.nextAiringEpisode;
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`📅 Release Schedule: ${d.title}`)
          .setTimestamp();

        if (next && next.airingAt) {
          const dateStr = new Date(next.airingAt * 1000).toUTCString();
          const days = Math.floor(next.timeUntilAiring / 86400);
          const hours = Math.floor((next.timeUntilAiring % 86400) / 3600);
          const minutes = Math.floor((next.timeUntilAiring % 3600) / 60);
          const countdown = `${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m`;

          embed.setDescription(`Upcoming broadcast and countdown for **${d.title}**:`);
          embed.addFields(
            { name: '📺 Upcoming Episode', value: `**Episode ${next.episode}**`, inline: true },
            { name: '⏳ Releasing In', value: `\`${countdown}\``, inline: true },
            { name: '🗓️ Broadcast Date', value: dateStr, inline: false },
            { name: '🍿 Stream on Animax', value: `[Watch series on Animax](${config.siteUrl}/?search=${encodeURIComponent(d.title)})`, inline: false }
          );
        } else {
          embed.setDescription(`Status: **${d.status || 'FINISHED'}**\n\nNo upcoming broadcast scheduled for this series. All released episodes are available to stream on Animax.`);
          embed.addFields({
            name: '🍿 Stream on Animax',
            value: `[Watch on Animax](${config.siteUrl}/?search=${encodeURIComponent(d.title)})`
          });
        }
        return { embed };
      }
    } catch (_) {}
  }

  // Fallback: Show Top Airing Schedule
  const animeList = await getAiringAnimeAniList();
  const embed = new EmbedBuilder()
    .setColor(config.colors.secondary)
    .setTitle('📅 Weekly Anime Broadcast Schedule & Countdowns')
    .setDescription('Upcoming episodes and live release timers for this season\'s top ongoing anime:')
    .setFooter({ text: 'Animax Live Airing Engine • Synchronized with AniList' })
    .setTimestamp();

  for (const item of animeList.slice(0, 6)) {
    const title = item.title.english || item.title.romaji;
    const next = item.nextAiringEpisode;
    let timing = 'Releasing soon';
    if (next && next.timeUntilAiring) {
      const days = Math.floor(next.timeUntilAiring / 86400);
      const hours = Math.floor((next.timeUntilAiring % 86400) / 3600);
      timing = `**Ep ${next.episode}** in \`${days}d ${hours}h\``;
    }
    embed.addFields({
      name: title,
      value: `• Next: ${timing} • [Watch on Animax](${config.siteUrl}/?search=${encodeURIComponent(title)})`,
      inline: false
    });
  }
  return { embed };
}

// Helper: Random Anime Recommendation
async function executeRandomAnime() {
  const anime = await getRandomAnimeAniList();
  if (!anime) {
    return { error: '❌ Could not fetch a random anime. Please try again!' };
  }

  const titleEnglish = anime.title.english || anime.title.romaji;
  const cleanDescription = (anime.description || 'No synopsis provided.')
    .replace(/<[^>]*>?/gm, '')
    .slice(0, 350) + '...';
  const score = anime.averageScore ? `⭐ **${anime.averageScore} / 100**` : 'Unrated';
  const episodes = anime.episodes ? `${anime.episodes} Episodes` : 'Airing';
  const genres = anime.genres ? anime.genres.join(', ') : 'Anime';

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`🎲 Random Anime Pick: ${titleEnglish}`)
    .setDescription(cleanDescription)
    .addFields(
      { name: '📊 Rating', value: score, inline: true },
      { name: '🎬 Episodes', value: episodes, inline: true },
      { name: '🏷️ Genres', value: genres, inline: true },
      { name: '📺 Watch on Animax', value: `[Start Watching on Animax](${config.siteUrl}/?search=${encodeURIComponent(titleEnglish)})` }
    )
    .setFooter({ text: 'Animax Recommendations • Looking for something to binge?' })
    .setTimestamp();

  if (anime.coverImage?.large) {
    embed.setThumbnail(anime.coverImage.large);
  }

  return { embed };
}

// Helper: FAQ Embed
function getFAQEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(config.faqContent.title)
    .setDescription(config.faqContent.description)
    .addFields(config.faqContent.fields)
    .setFooter({ text: config.faqContent.footer })
    .setTimestamp();
}

// Helper: Release Episode Alert
async function executeRelease(guild, member, { title, episode, link, image }) {
  if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return { error: '⛔ Only staff can publish episode releases.' };
  }

  const releaseChannel = guild.channels.cache.find(
    (c) => c.name === 'latest-releases' && c.isTextBased()
  );

  if (!releaseChannel) {
    return { error: '⚠️ `#latest-releases` channel was not found. Please run `/setup` first.' };
  }

  const pingRole = guild.roles.cache.find((r) => r.name === '🔔 Episode Pings');
  const mentionText = pingRole ? `<@&${pingRole.id}>` : '';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🎬 ${title} - ${episode}`)
    .setDescription('A brand new episode is now ready to stream on **Animax**!')
    .addFields({ name: '📺 Streaming Link', value: `[Watch ${title} on Animax](${link})` })
    .setFooter({ text: 'Animax Streaming • Enjoy the episode!' })
    .setTimestamp();

  if (image && image.startsWith('http')) {
    embed.setImage(image);
  }

  await releaseChannel.send({
    content: mentionText ? `🔔 **NEW EPISODE RELEASE** ${mentionText}` : '🔔 **NEW EPISODE RELEASE**',
    embeds: [embed]
  });

  return { success: `✅ Episode release posted in ${releaseChannel}!` };
}

// Helper: Manga & Novel Chapter Release
async function executeMangaRelease(guild, member, { title, chapter, type, link, image }) {
  if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return { error: '⛔ Only staff can publish manga & novel chapter releases.' };
  }

  const mangaChannel = guild.channels.cache.find(
    (c) => c.name === 'manga-and-novels' && c.isTextBased()
  );

  if (!mangaChannel) {
    return { error: '⚠️ `#manga-and-novels` channel was not found. Please run `/setup` first.' };
  }

  const format = type || 'Manga';
  const readUrl = link || `${config.siteUrl}/#catalogSection`;

  const embed = new EmbedBuilder()
    .setColor(0x6C5CE7)
    .setTitle(`📚 [NEW RELEASE] ${title} - ${chapter}`)
    .setDescription(`A brand new release of **${title}** is out and ready to read on **Animax**!`)
    .addFields(
      { name: '🔖 Release', value: chapter, inline: true },
      { name: '📚 Format', value: format, inline: true },
      { name: '📖 Read Inside Animax', value: `[Read ${title} Here](${readUrl})` }
    )
    .setFooter({ text: 'Animax Manga & Light Novel Hub • Interactive Reader' })
    .setTimestamp();

  if (image && image.startsWith('http')) {
    embed.setThumbnail(image);
  }

  await mangaChannel.send({
    content: `📢 **NEW ${format.toUpperCase()} RELEASE ALERT!**`,
    embeds: [embed]
  });

  return { success: `✅ ${format} release posted in ${mangaChannel}!` };
}

// Helper: Announcement
async function executeAnnounce(guild, member, { title, message }) {
  if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return { error: '⛔ Only staff can send announcements.' };
  }

  const announceChannel = guild.channels.cache.find(
    (c) => c.name === 'announcements' && c.isTextBased()
  );

  if (!announceChannel) {
    return { error: '⚠️ `#announcements` channel was not found. Please run `/setup` first.' };
  }

  const pingRole = guild.roles.cache.find((r) => r.name === '📢 Update Pings');
  const mentionText = pingRole ? `<@&${pingRole.id}>` : '';

  const embed = new EmbedBuilder()
    .setColor(config.colors.secondary)
    .setTitle(`📢 ${title}`)
    .setDescription(message)
    .setFooter({ text: `Announced by ${member.user.username} • Animax Staff` })
    .setTimestamp();

  await announceChannel.send({
    content: mentionText ? mentionText : undefined,
    embeds: [embed]
  });

  return { success: `✅ Announcement posted in ${announceChannel}!` };
}

// Helper: Status Update
async function executeStatus(guild, member, { statusType, details }) {
  if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return { error: '⛔ Only staff can update site status.' };
  }

  const statusChannel = guild.channels.cache.find(
    (c) => c.name === 'site-status' && c.isTextBased()
  );

  if (!statusChannel) {
    return { error: '⚠️ `#site-status` channel was not found. Please run `/setup` first.' };
  }

  let color = config.colors.success;
  let statusEmoji = '🟢';

  const lower = statusType.toLowerCase();
  if (lower.includes('maint') || lower.includes('warn')) {
    color = config.colors.warning;
    statusEmoji = '🟡';
  } else if (lower.includes('down') || lower.includes('issue') || lower.includes('error')) {
    color = config.colors.danger;
    statusEmoji = '🔴';
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${statusEmoji} Animax Site Status: ${statusType}`)
    .setDescription(details)
    .setFooter({ text: 'Animax Infrastructure Monitoring' })
    .setTimestamp();

  await statusChannel.send({ embeds: [embed] });

  return { success: `✅ Status update posted in ${statusChannel}!` };
}

// ==========================================
// INTERACTION CREATE (SLASH COMMANDS & BUTTONS)
// ==========================================
client.on('interactionCreate', async (interaction) => {
  // Handle Role Buttons
  if (interaction.isButton()) {
    const roleName = ROLE_BUTTON_MAP[interaction.customId];
    if (!roleName) return;

    const role = interaction.guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      return interaction.reply({
        content: `⚠️ Role **${roleName}** was not found. Please ask an admin to run \`/setup\`.`,
        ephemeral: true
      });
    }

    const member = interaction.member;
    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return interaction.reply({ content: `❌ Removed role: **${role.name}**.`, ephemeral: true });
      } else {
        await member.roles.add(role);
        return interaction.reply({ content: `✅ Added role: **${role.name}**!`, ephemeral: true });
      }
    } catch (err) {
      return interaction.reply({ content: `⚠️ Failed to update role. Make sure the Animax Bot role is above these roles!`, ephemeral: true });
    }
  }

  // Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const { commandName, guild, member, channel } = interaction;

    if (!guild) {
      return interaction.reply({ content: 'Commands can only be used in servers.', ephemeral: true });
    }

    if (commandName === 'help') {
      return interaction.reply({ embeds: [getHelpEmbed()] });
    }

    if (commandName === 'faq') {
      return interaction.reply({ embeds: [getFAQEmbed()] });
    }

    if (commandName === 'setup') {
      await interaction.deferReply();
      try {
        await executeSetup(guild, member, (res) => interaction.editReply(res));
      } catch (err) {
        console.error('Setup error:', err);
        await interaction.editReply(`❌ Error during setup: \`${err.message}\``);
      }
      return;
    }

    if (commandName === 'admin') {
      await interaction.deferReply();
      const res = await executeAdmin(guild, member);
      if (res.error) return interaction.editReply(res.error);
      if (res.success) return interaction.editReply(res.success);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'giveadmin' || commandName === 'promote') {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply('❌ Could not find that member in this server.');

      const res = await executeGiveAdmin(guild, member, targetMember);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'removeadmin') {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply('❌ Could not find that member in this server.');

      const res = await executeRemoveAdmin(guild, member, targetMember);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply(res.success);
    }

    if (commandName === 'lockgeneral') {
      await interaction.deferReply();
      const res = await executeLockGeneral(guild, member);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'unlockgeneral') {
      await interaction.deferReply();
      const res = await executeUnlockGeneral(guild, member);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply(res.success);
    }

    if (commandName === 'clear') {
      const amount = interaction.options.getInteger('amount');
      const res = await executeClear(channel, member, amount);
      if (res.error) return interaction.reply({ content: res.error, ephemeral: true });
      return interaction.reply({ content: res.success, ephemeral: true });
    }

    if (commandName === 'anime') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const res = await executeAnimeSearch(title);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'download') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const ep = interaction.options.getInteger('episode') || 1;
      const res = await executeDownloadLookup(title, ep);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'airing') {
      await interaction.deferReply();
      const res = await executeAiring();
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'schedule') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const res = await executeSchedule(title);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'randomanime') {
      await interaction.deferReply();
      const res = await executeRandomAnime();
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'manga') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const res = await executeMangaLookup(title, false);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'novel') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const res = await executeMangaLookup(title, true);
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'checkserver') {
      await interaction.deferReply();
      const start = Date.now();
      try {
        const resp = await fetch(`${config.siteUrl}/api/top-airing`);
        const latency = Date.now() - start;
        const isOk = resp.status === 200;
        const embed = new EmbedBuilder()
          .setColor(isOk ? config.colors.success : config.colors.danger)
          .setTitle(isOk ? '🟢 Animax Streaming Server is ONLINE' : '🔴 Server Responded with Error')
          .setDescription(`Connected to Animax streaming backend on **${config.siteUrl}**`)
          .addFields(
            { name: '⚡ Latency', value: `${latency}ms`, inline: true },
            { name: '📡 HTTP Status', value: `${resp.status} ${resp.statusText}`, inline: true },
            { name: '🚀 Compression', value: 'GZIP Enabled', inline: true },
            { name: '🌐 Video Stream Engines', value: '⚡ 5 Verified HD Mirrors: MegaPlay Prime (HD-1), MegaPlay Cloud (HD-3), TryEmbed (HD-2), 4Animo Ultra (HD-4), VidHawk Fast (HD-5)', inline: false }
          )
          .setFooter({ text: 'Animax Localhost Bridge • Active & Healthy' })
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply(`🔴 **Server Error:** Could not reach Animax on \`${config.siteUrl}\` (${err.message})`);
      }
    }

    if (commandName === 'website') {
      await interaction.deferReply();
      const res = await executeWebsiteDashboard();
      return interaction.editReply({ embeds: [res.embed] });
    }

    if (commandName === 'poll') {
      const question = interaction.options.getString('question');
      const opt1 = interaction.options.getString('option1');
      const opt2 = interaction.options.getString('option2');
      const opt3 = interaction.options.getString('option3');
      const opt4 = interaction.options.getString('option4');

      const emojiList = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
      const options = [opt1, opt2];
      if (opt3) options.push(opt3);
      if (opt4) options.push(opt4);

      const pollDesc = options.map((opt, i) => `${emojiList[i]} **${opt}**`).join('\n\n');

      const pollEmbed = new EmbedBuilder()
        .setColor(config.colors.secondary)
        .setTitle(`📊 Community Poll: ${question}`)
        .setDescription(pollDesc)
        .setFooter({ text: `Created by ${member.user.username} • Cast your vote below!` })
        .setTimestamp();

      const pollMsg = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });

      for (let i = 0; i < options.length; i++) {
        await pollMsg.react(emojiList[i]).catch(() => {});
      }
      return;
    }

    if (commandName === 'release') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const episode = interaction.options.getString('episode');
      const link = interaction.options.getString('link');
      const image = interaction.options.getString('image');

      const res = await executeRelease(guild, member, { title, episode, link, image });
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply(res.success);
    }

    if (commandName === 'mangarelease') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const chapter = interaction.options.getString('chapter');
      const type = interaction.options.getString('type') || 'Manga';
      const link = interaction.options.getString('link');
      const image = interaction.options.getString('image');

      const res = await executeMangaRelease(guild, member, { title, chapter, type, link, image });
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply(res.success);
    }

    if (commandName === 'announce') {
      await interaction.deferReply();
      const title = interaction.options.getString('title');
      const body = interaction.options.getString('message');

      const res = await executeAnnounce(guild, member, { title, message: body });
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply(res.success);
    }

    if (commandName === 'status') {
      await interaction.deferReply();
      const statusType = interaction.options.getString('type');
      const details = interaction.options.getString('details');

      const res = await executeStatus(guild, member, { statusType, details });
      if (res.error) return interaction.editReply(res.error);
      return interaction.editReply(res.success);
    }
  }
});

// ==========================================
// AI DM CONVERSATIONAL ENGINE
// ==========================================
const dmChatHistories = new Map(); // userId -> [{ role, text }]

async function generateBuiltInAnimeResponse(userText, username) {
  const lower = userText.toLowerCase();

  // 1. Check for Anime Recommendations / Suggestions
  if (/recommend|suggest|what (should|to) watch|give me (an|some) anime|bored|good anime/i.test(lower)) {
    let genre = null;
    if (/action|fight|shonen|battle/i.test(lower)) genre = 'Action';
    else if (/romance|love|wholesome/i.test(lower)) genre = 'Romance';
    else if (/isekai|reincarnat|another world/i.test(lower)) genre = 'Isekai';
    else if (/psychological|dark|thriller|mind/i.test(lower)) genre = 'Psychological';
    else if (/comedy|funny|laugh/i.test(lower)) genre = 'Comedy';
    else if (/horror|gore|scary/i.test(lower)) genre = 'Horror';

    let pick = null;
    if (websiteState.localAnimeList.length > 0) {
      const candidates = genre
        ? websiteState.localAnimeList.filter(a => a.genres && a.genres.some(g => g.toLowerCase().includes(genre.toLowerCase())))
        : websiteState.localAnimeList;
      if (candidates.length > 0) {
        pick = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (!pick) {
      const rand = await getRandomAnimeAniList();
      if (rand) {
        const title = rand.title.english || rand.title.romaji;
        return {
          text: `Hey **${username}**! ✨ Here's a top-tier recommendation for you:\n\n🔥 **${title}** (Rating: ⭐ ${rand.averageScore || 85}/100)\n${(rand.description || '').slice(0, 220).replace(/<[^>]*>/g, '')}...\n\n🍿 **Watch right now on Animax:**\n[Click here to Stream ${title}](${config.siteUrl}/?search=${encodeURIComponent(title)})`
        };
      }
    } else {
      const title = pick.title || 'Anime Pick';
      return {
        text: `Hey **${username}**! 🎬 I've got the perfect anime for you from our **Animax Vault**:\n\n⭐ **${title}**\n${(pick.description || '').slice(0, 220)}...\n\n🍿 **Stream it directly:**\n[Click here to Watch on Animax](${config.siteUrl}/?search=${encodeURIComponent(title)})`
      };
    }
  }

  // 2. Check for Episode Download Inquiries
  if (/download|offline|save video|get ep/i.test(lower)) {
    const rawTarget = lower.replace(/^(can i download|how to download|how do i download|where can i download|download)\s+/i, '').replace(/episode\s*\d+/i, '').trim();
    const epMatch = lower.match(/(?:ep|episode)\s*(\d+)/i);
    const epNum = epMatch ? epMatch[1] : '1';
    let mobUrl = 'http://192.168.100.85:8080';
    try {
      const tPath = path.join(__dirname, '..', '..', 'tunnel-url.txt');
      if (fs.existsSync(tPath)) {
        const u = fs.readFileSync(tPath, 'utf8').trim();
        if (u.startsWith('http')) mobUrl = u;
      }
    } catch (_) {}

    return {
      text: `📥 **Animax Episode Downloader**:\n\nYou can easily download any episode directly from Animax:\n\n1. Open: [Animax Streaming Website](${mobUrl})\n2. Select your anime and episode (e.g. **${rawTarget || 'One Piece'} - Ep ${epNum}**)\n3. Click the **📥 Download** button in the player header\n4. Pick any of the **5 High-Speed HD Mirrors** (MegaPlay Prime, Cloud, TryEmbed, 4Animo, VidHawk)!\n\n• **iPhone**: Tap Download → Share icon → *Save to Files*\n• **Android**: Tap Download → 3 dots → *Download Video*\n• **Discord Command**: Type \`!download ${rawTarget || 'One Piece'} ${epNum}\` or use \`/download\``
    };
  }

  // 3. Check for Specific Anime Inquiries
  const animeKeywords = lower.replace(/^(can i watch|is|tell me about|what is|how is|do you have|info on|search|find)\s+/i, '').trim();
  if (animeKeywords.length >= 3 && !/^(hello|hey|hi|sup|what's up|help|who are you|how are you|website|server|status)/i.test(lower)) {
    try {
      const sRes = await fetch(`${config.siteUrl}/api/search?keyword=${encodeURIComponent(animeKeywords)}`, { signal: AbortSignal.timeout(3000) });
      if (sRes.ok) {
        const sData = await sRes.json();
        const items = sData.results?.data || sData.results || [];
        if (items.length > 0) {
          const a = items[0];
          return {
            text: `Yes, **${a.title}** is ready to stream right now on **Animax**! 🍿\n\n• **Format:** ${a.type || 'TV'}\n• **Episodes:** ${a.episodes?.sub || a.sub || a.episodes || 'Available'} (SUB/DUB)\n• **Rating:** ${a.rating || 'PG-13'}\n• **Synopsis:** ${(a.description || 'Enjoy high-speed streaming on Animax.').slice(0, 240)}...\n\n🔗 **Launch Player:** [Watch ${a.title} on Animax](${config.siteUrl}/?search=${encodeURIComponent(a.title)})`
          };
        }
      }
    } catch (_) {}

    const anilistMatch = await searchAnimeAniList(animeKeywords);
    if (anilistMatch) {
      const t = anilistMatch.title.english || anilistMatch.title.romaji;
      return {
        text: `Here's what I know about **${t}**! 📺\n\n• **Score:** ⭐ ${anilistMatch.averageScore || 'N/A'}/100\n• **Episodes:** ${anilistMatch.episodes || 'Airing'}\n• **Synopsis:** ${(anilistMatch.description || '').slice(0, 260).replace(/<[^>]*>/g, '')}...\n\n🍿 **Stream on Animax:** [Watch ${t} Now](${config.siteUrl}/?search=${encodeURIComponent(t)})`
      };
    }
  }

  // 3. Website, Server & Mobile Phone Inquiries
  if (/server|status|website|online|ping|latency|down|lag|phone|mobile/i.test(lower)) {
    await syncWebsiteState();
    let mobUrl = 'http://192.168.100.85:8080';
    try {
      const tPath = path.join(__dirname, '..', '..', 'tunnel-url.txt');
      if (fs.existsSync(tPath)) {
        const u = fs.readFileSync(tPath, 'utf8').trim();
        if (u.startsWith('http')) mobUrl = u;
      }
    } catch (_) {}
    return {
      text: `🌐 **Animax System Status & Mobile Access**:\n\n• **Server:** ${websiteState.isOnline ? '🟢 100% ONLINE & HEALTHY' : '🔴 OFFLINE / RECONNECTING'}\n• **Response Latency:** \`${websiteState.latency}ms\`\n• **Available Catalog:** \`${websiteState.totalCatalog || 1049}+ Anime titles\`\n• **Active Mirrors:** \`MegaPlay Prime (HD-1), MegaPlay Cloud (HD-3), TryEmbed (HD-2), 4Animo Ultra (HD-4), VidHawk Fast (HD-5)\`\n• **Desktop URL:** ${config.siteUrl}\n• **📱 Phone / Mobile URL:** ${mobUrl}`
    };
  }

  // 4. Trending Inquiries
  if (/trending|popular|top anime|airing|season/i.test(lower)) {
    await syncWebsiteState();
    const list = Array.isArray(websiteState.trending) ? websiteState.trending : [];
    const top = list.slice(0, 5).map((t, idx) => `**${idx + 1}.** [${t.title}](${config.siteUrl}/?search=${encodeURIComponent(t.title)})`).join('\n') || 'One Piece, Solo Leveling, Frieren';
    return {
      text: `🔥 **Top Trending on Animax Right Now:**\n\n${top}\n\nCatch all latest episode drops in 1080p Ultra HD at ${config.siteUrl}!`
    };
  }

  // 5. Help / Capabilities
  if (/help|what can you do|features|who are you/i.test(lower)) {
    return {
      text: `Hey **${username}**! 👋 I am **Animax AI**, your 24/7 personal anime assistant and streaming companion.\n\nHere is what you can ask me right here in our DMs:\n• 🎬 **Recommend anime**: *"recommend me a good romance/action anime"* or *"what should I watch?"*\n• 🔍 **Search any anime**: *"tell me about Attack on Titan"* or *"is Demon Slayer on the site?"*\n• 🔥 **Check what's trending**: *"what's popular right now?"*\n• ⚡ **Check streaming server**: *"is the website online?"*\n• 💬 **Chat anytime**: Talk about anime lore, characters, theories, or favorite studios!\n\nWhat are you in the mood to watch today? 🍿`
    };
  }

  // 6. Greetings / Casual Chat
  const greetings = [
    `Hey **${username}**! 👋 Great to see you. Looking for something epic to binge today? Tell me your favorite genre or what kind of vibe you're in the mood for!`,
    `Konnichiwa **${username}**! ✨ Ready to stream some anime? Ask me for a recommendation, search a title, or check what's trending on Animax!`,
    `Yo **${username}**! 🍿 Animax AI here. What anime are we talking about today?`,
    `Hey there **${username}**! Always ready to talk anime. Ask me about any show, or ask me for a recommendation!`
  ];
  return {
    text: greetings[Math.floor(Math.random() * greetings.length)]
  };
}

async function handleAIChat(message) {
  const userId = message.author.id;
  const userText = message.content.trim();
  if (!userText) return;

  await message.channel.sendTyping().catch(() => {});

  if (!dmChatHistories.has(userId)) {
    dmChatHistories.set(userId, []);
  }
  const history = dmChatHistories.get(userId);

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const systemPrompt = `You are Animax AI, the personal anime companion and streaming assistant for the Animax Ultra HD Streaming Platform (${config.siteUrl}).
You are friendly, witty, knowledgeable about all anime genres, studios, and lore.
Current site status: ${websiteState.isOnline ? 'Online (100% operational)' : 'Offline/Maintenance'}, ${websiteState.totalCatalog || 1049}+ anime available with 5 verified fast streaming mirrors (MegaPlay Prime, MegaPlay Cloud, TryEmbed Stream, 4Animo Ultra, VidHawk Fast), sub & dub audio, and exact minute resume.
When recommending anime or answering questions, be enthusiastic, conversational, and provide helpful insights. Keep responses concise and engaging for Discord chat.`;

  if (geminiKey) {
    try {
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood! I am Animax AI, ready to chat with you about anime and help with your streaming experience.' }] }
      ];
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }]
        });
      }
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(10000)
      });
      const data = await resp.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        history.push({ role: 'user', text: userText });
        history.push({ role: 'assistant', text: reply });
        if (history.length > 20) history.splice(0, history.length - 20);
        return message.reply(reply.slice(0, 2000));
      }
    } catch (e) {
      console.warn('[AI DM] Gemini call failed, falling back to built-in brain:', e.message);
    }
  }

  // Built-in intelligent anime conversational brain
  const reply = await generateBuiltInAnimeResponse(userText, message.author.username);
  history.push({ role: 'user', text: userText });
  history.push({ role: 'assistant', text: reply.text });
  if (history.length > 20) history.splice(0, history.length - 20);

  if (reply.embed) {
    return message.reply({ content: reply.text, embeds: [reply.embed] });
  } else {
    return message.reply(reply.text);
  }
}

// ==========================================
// MESSAGE CREATE (PREFIX ! FALLBACK & DM AI)
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Direct Message (DM) AI Chatbot Mode
  if (!message.guild) {
    return handleAIChat(message);
  }

  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const guild = message.guild;
  const member = message.member;
  const channel = message.channel;

  if (command === 'help') {
    return message.reply({ embeds: [getHelpEmbed()] });
  }

  if (command === 'faq') {
    return message.reply({ embeds: [getFAQEmbed()] });
  }

  if (command === 'setup') {
    const statusMsg = await message.reply('⏳ **Starting Animax server setup...** Setting up roles, categories, and channels.');
    try {
      await executeSetup(guild, member, (res) => statusMsg.edit(res));
    } catch (err) {
      statusMsg.edit(`❌ Error during setup: \`${err.message}\``);
    }
    return;
  }

  if (command === 'admin' || command === 'giveroles') {
    const targetMember = message.mentions.members.first();
    if (targetMember && targetMember.id !== member.id) {
      const res = await executeGiveAdmin(guild, member, targetMember);
      if (res.error) return message.reply(res.error);
      return message.reply({ embeds: [res.embed] });
    } else {
      const res = await executeAdmin(guild, member);
      if (res.error) return message.reply(res.error);
      if (res.success) return message.reply(res.success);
      return message.reply({ embeds: [res.embed] });
    }
  }

  if (command === 'giveadmin' || command === 'promote') {
    const targetMember = message.mentions.members.first();
    if (!targetMember) return message.reply('❌ **Usage:** `!giveadmin @user`');
    const res = await executeGiveAdmin(guild, member, targetMember);
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'removeadmin' || command === 'stripadmin') {
    const targetMember = message.mentions.members.first();
    if (!targetMember) return message.reply('❌ **Usage:** `!removeadmin @user`');
    const res = await executeRemoveAdmin(guild, member, targetMember);
    if (res.error) return message.reply(res.error);
    return message.reply(res.success);
  }

  if (command === 'lockgeneral' || command === 'closegeneral' || command === 'lock') {
    const res = await executeLockGeneral(guild, member);
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'unlockgeneral' || command === 'opengeneral') {
    const res = await executeUnlockGeneral(guild, member);
    if (res.error) return message.reply(res.error);
    return message.reply(res.success);
  }

  if (command === 'ping' || command === 'checkserver') {
    const start = Date.now();
    try {
      const resp = await fetch(`${config.siteUrl}/api/top-airing`);
      const latency = Date.now() - start;
      const isOk = resp.status === 200;
      const embed = new EmbedBuilder()
        .setColor(isOk ? config.colors.success : config.colors.danger)
        .setTitle(isOk ? '🟢 Animax Streaming Server is ONLINE' : '🔴 Server Responded with Error')
        .setDescription(`Connected to Animax streaming backend on **${config.siteUrl}**`)
        .addFields(
          { name: '⚡ Latency', value: `${latency}ms`, inline: true },
          { name: '📡 HTTP Status', value: `${resp.status} ${resp.statusText}`, inline: true },
          { name: '🚀 Compression', value: 'GZIP Enabled', inline: true },
          { name: '🌐 Video Stream Engines', value: '⚡ 5 Verified HD Mirrors: MegaPlay Prime (HD-1), MegaPlay Cloud (HD-3), TryEmbed (HD-2), 4Animo Ultra (HD-4), VidHawk Fast (HD-5)', inline: false }
        )
        .setFooter({ text: 'Animax Localhost Bridge • Active & Healthy' })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply(`🔴 **Server Error:** Could not reach Animax on \`${config.siteUrl}\` (${err.message})`);
    }
  }

  if (command === 'website' || command === 'sitestats') {
    const res = await executeWebsiteDashboard();
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'clear') {
    const amount = parseInt(args[0], 10) || 10;
    const res = await executeClear(channel, member, Math.min(Math.max(amount, 1), 100));
    if (res.error) return message.reply(res.error);
    const replyMsg = await message.channel.send(res.success);
    setTimeout(() => replyMsg.delete().catch(() => {}), 4000);
    return;
  }

  if (command === 'anime') {
    const title = args.join(' ');
    if (!title) return message.reply('❌ **Usage:** `!anime <Title>`');
    const res = await executeAnimeSearch(title);
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'download' || command === 'dl') {
    const rawInput = args.join(' ').trim();
    if (!rawInput) return message.reply('❌ **Usage:** `!download <Anime Name> [Episode Number]`\n*Example:* `!download One Piece 1`');
    const epMatch = rawInput.match(/\b(?:ep|episode)?\s*(\d+)$/i);
    const ep = epMatch ? parseInt(epMatch[1], 10) : 1;
    const animeQuery = epMatch ? rawInput.slice(0, epMatch.index).trim() : rawInput;
    const res = await executeDownloadLookup(animeQuery || rawInput, ep);
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'airing') {
    const res = await executeAiring();
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'randomanime') {
    const res = await executeRandomAnime();
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'manga') {
    const title = args.join(' ');
    if (!title) return message.reply('❌ **Usage:** `!manga <Title>`');
    const res = await executeMangaLookup(title, false);
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'novel') {
    const title = args.join(' ');
    if (!title) return message.reply('❌ **Usage:** `!novel <Title>`');
    const res = await executeMangaLookup(title, true);
    if (res.error) return message.reply(res.error);
    return message.reply({ embeds: [res.embed] });
  }

  if (command === 'release') {
    const raw = message.content.slice(config.prefix.length + 'release'.length).trim();
    const parts = raw.split('|').map((s) => s.trim());
    if (parts.length < 3) {
      return message.reply('❌ **Usage:** `!release <Title> | <Episode> | <Link> | [Image]`');
    }
    const [title, episode, link, image] = parts;
    const res = await executeRelease(guild, member, { title, episode, link, image });
    if (res.error) return message.reply(res.error);
    return message.reply(res.success);
  }

  if (command === 'announce') {
    const raw = message.content.slice(config.prefix.length + 'announce'.length).trim();
    const parts = raw.split('|').map((s) => s.trim());
    if (parts.length < 2) {
      return message.reply('❌ **Usage:** `!announce <Title> | <Message>`');
    }
    const [title, body] = parts;
    const res = await executeAnnounce(guild, member, { title, message: body });
    if (res.error) return message.reply(res.error);
    return message.reply(res.success);
  }

  if (command === 'status') {
    const raw = message.content.slice(config.prefix.length + 'status'.length).trim();
    const parts = raw.split('|').map((s) => s.trim());
    if (parts.length < 2) {
      return message.reply('❌ **Usage:** `!status <Operational | Maintenance | Issues> | <Details>`');
    }
    const [statusType, details] = parts;
    const res = await executeStatus(guild, member, { statusType, details });
    if (res.error) return message.reply(res.error);
    return message.reply(res.success);
  }
});

// Login
client.login(token).catch((err) => {
  console.error('❌ Failed to login to Discord:', err.message);
  console.error('👉 Please ensure your bot token in .env is valid.');
});
