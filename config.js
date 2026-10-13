module.exports = {
  // Animax website URL (localhost or public domain)
  siteUrl: process.env.ANIMAX_URL || 'http://localhost:8080',

  // Prefix fallback for commands
  prefix: '!',

  // Embed branding colors (Animax theme)
  colors: {
    primary: 0xFF2A54,    // Vibrant Coral/Crimson
    secondary: 0x6C5CE7,  // Anime Purple
    success: 0x00B894,    // Green
    warning: 0xFDCB6E,    // Yellow
    danger: 0xD63031,     // Red
    info: 0x0984E3        // Blue
  },

  // Roles to create on the server
  roles: [
    // Staff & Hierarchy
    {
      name: 'Admin',
      color: '#FF2A54',
      hoist: true,
      permissions: ['Administrator'],
      mentionable: false
    },
    {
      name: '💻 Site Developer',
      color: '#A29BFE',
      hoist: true,
      permissions: ['ManageGuild', 'ManageChannels', 'ManageMessages', 'KickMembers', 'BanMembers'],
      mentionable: false
    },
    {
      name: '🛡️ Moderator',
      color: '#0984E3',
      hoist: true,
      permissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'MuteMembers', 'DeafenMembers'],
      mentionable: true
    },
    {
      name: '⭐ VIP Supporter',
      color: '#FDCB6E',
      hoist: true,
      permissions: [],
      mentionable: false
    },
    {
      name: '🌸 Otaku (Member)',
      color: '#00CEC9',
      hoist: false,
      permissions: [],
      mentionable: false
    },

    // Notification Pings
    {
      name: '🔔 Episode Pings',
      color: '#E17055',
      hoist: false,
      permissions: [],
      mentionable: true
    },
    {
      name: '📢 Update Pings',
      color: '#6C5CE7',
      hoist: false,
      permissions: [],
      mentionable: true
    },
    {
      name: '🍿 Watch Party Pings',
      color: '#FD79A8',
      hoist: false,
      permissions: [],
      mentionable: true
    },

    // Audio Preference Roles
    {
      name: '🎧 Subtitles Team',
      color: '#10B981',
      hoist: false,
      permissions: [],
      mentionable: false
    },
    {
      name: '🎙️ English Dub Team',
      color: '#0EA5E9',
      hoist: false,
      permissions: [],
      mentionable: false
    },

    // Favorite Anime Genre Roles
    {
      name: '⚔️ Shonen',
      color: '#E67E22',
      hoist: false,
      permissions: [],
      mentionable: false
    },
    {
      name: '🌀 Isekai',
      color: '#9B59B6',
      hoist: false,
      permissions: [],
      mentionable: false
    },
    {
      name: '💖 Romance',
      color: '#FD79A8',
      hoist: false,
      permissions: [],
      mentionable: false
    },
    {
      name: '🧠 Seinen',
      color: '#34495E',
      hoist: false,
      permissions: [],
      mentionable: false
    },
    {
      name: '🔮 Fantasy & Magic',
      color: '#3B82F6',
      hoist: false,
      permissions: [],
      mentionable: false
    },
    {
      name: '👻 Psychological & Horror',
      color: '#8B5CF6',
      hoist: false,
      permissions: [],
      mentionable: false
    }
  ],

  // Server Category & Channel Structure
  structure: [
    {
      category: '📌 INFORMATION & RULES',
      channels: [
        {
          name: 'welcome',
          type: 'GuildText',
          topic: 'Welcome to the official Animax Community! New member greetings and overview.',
          readOnly: true,
          action: 'postWelcomeGuide'
        },
        {
          name: 'rules',
          type: 'GuildText',
          topic: 'Official rules and guidelines for Animax community.',
          readOnly: true,
          action: 'postRules'
        },
        {
          name: 'announcements',
          type: 'GuildText',
          topic: 'Official site news, feature launches, and server updates.',
          readOnly: true,
          action: 'postWelcome'
        },
        {
          name: 'faq',
          type: 'GuildText',
          topic: 'Frequently asked questions & video streaming playback troubleshooting.',
          readOnly: true,
          action: 'postFAQ'
        },
        {
          name: 'site-status',
          type: 'GuildText',
          topic: 'Live status for Animax web app, video players, and CDN.',
          readOnly: true,
          action: 'postStatus'
        },
        {
          name: 'role-select',
          type: 'GuildText',
          topic: 'Click buttons below to get notification pings and your favorite anime genre roles!',
          readOnly: true,
          action: 'postRoleSelect'
        }
      ]
    },
    {
      category: '🔔 EPISODE ALERTS & SCHEDULES',
      channels: [
        {
          name: 'latest-releases',
          type: 'GuildText',
          topic: 'Instant alerts when new episodes are uploaded to Animax with direct stream links.',
          readOnly: true,
          action: 'postReleaseInfo'
        },
        {
          name: 'airing-schedule',
          type: 'GuildText',
          topic: 'Live broadcast schedule and release countdowns for upcoming anime episodes.',
          readOnly: true,
          action: 'postAiringSchedule'
        },
        {
          name: 'trending-anime',
          type: 'GuildText',
          topic: 'Weekly rankings, seasonal charts, and top trending series.',
          readOnly: false
        },
        {
          name: 'anime-polls',
          type: 'GuildText',
          topic: 'Official community polls, character matchups, and seasonal votes.',
          readOnly: false
        }
      ]
    },
    {
      category: '💬 COMMUNITY & CHAT',
      channels: [
        {
          name: 'general-chat',
          type: 'GuildText',
          topic: 'General chat (Closed - Admins & High Roles Only).',
          readOnly: false,
          staffOnly: true
        },
        {
          name: 'anime-discussion',
          type: 'GuildText',
          topic: 'Discuss ongoing and classic anime series, theories, and recommendations.',
          readOnly: false
        },
        {
          name: 'episode-reactions',
          type: 'GuildText',
          topic: 'React to newly aired episodes. Please wrap spoilers in || spoiler tags ||!',
          readOnly: false
        },
        {
          name: 'recommendations',
          type: 'GuildText',
          topic: 'Share your top anime hidden gems or ask the community for your next watch!',
          readOnly: false
        },
        {
          name: 'manga-and-novels',
          type: 'GuildText',
          topic: 'Manga, manhwa, manhua, and light novel recommendations and chapters.',
          readOnly: false,
          action: 'postMangaIntro'
        },
        {
          name: 'memes-and-media',
          type: 'GuildText',
          topic: 'Anime memes, screenshots, wallpapers, clips, and fan art.',
          readOnly: false
        },
        {
          name: 'soundtracks-and-ost',
          type: 'GuildText',
          topic: 'Share your favorite anime openings, endings, OST tracks, and composers.',
          readOnly: false
        },
        {
          name: 'bot-commands',
          type: 'GuildText',
          topic: 'Use /anime, /schedule, /airing, /randomanime, /faq, and other bot commands here!',
          readOnly: false
        }
      ]
    },
    {
      category: '🛠️ SUPPORT & FEEDBACK',
      channels: [
        {
          name: 'bug-reports',
          type: 'GuildText',
          topic: 'Report video playback errors, broken subtitles, or buffering issues.',
          readOnly: false
        },
        {
          name: 'anime-requests',
          type: 'GuildText',
          topic: 'Request missing anime series, movies, or dual audio/subs.',
          readOnly: false
        },
        {
          name: 'site-suggestions',
          type: 'GuildText',
          topic: 'Share your feature ideas to help us improve Animax.',
          readOnly: false
        }
      ]
    },
    {
      category: '🔊 VOICE & WATCH PARTIES',
      channels: [
        {
          name: '🔊 Lounge',
          type: 'GuildVoice',
          staffOnly: true
        },
        {
          name: '📺 Watch Party 1',
          type: 'GuildVoice'
        },
        {
          name: '📺 Watch Party 2',
          type: 'GuildVoice'
        },
        {
          name: '🍿 Community Hangout',
          type: 'GuildVoice'
        }
      ]
    }
  ],

  // Pre-configured text for rules embed
  rulesContent: {
    title: '📜 Animax Community Rules',
    description: 'Welcome to the official **Animax** Discord server! Please read and follow our community guidelines to keep this an awesome place for all anime fans.',
    fields: [
      {
        name: '1. Respect Everyone',
        value: 'Treat everyone with kindness. Harassment, hate speech, racism, sexism, or toxic behavior will result in an immediate mute or ban.'
      },
      {
        name: '2. Spoiler Etiquette (Strictly Enforced)',
        value: 'Never spoil unadapted manga events or recent episodes in open channels. Always wrap spoilers in `|| spoiler tags ||` and specify the anime name before the tag.'
      },
      {
        name: '3. No Piracy Links / Self-Promotion',
        value: 'Do not post unauthorized download links, phishing URLs, malicious sites, or advertise other Discord servers or competing services.'
      },
      {
        name: '4. Keep Channels On-Topic',
        value: 'Post bugs in `#bug-reports`, anime requests in `#anime-requests`, bot commands in `#bot-commands`, and general chat in `#anime-discussion`.'
      },
      {
        name: '5. Streaming & Video Issues',
        value: 'If a stream is buffering or not playing, check `#site-status` and `#faq` first. If it is not resolved, report it with the anime name, episode number, and server name in `#bug-reports`.'
      }
    ],
    footer: 'Animax Community Guidelines • Enjoy Streaming!'
  },

  // Streaming FAQ and troubleshooting content
  faqContent: {
    title: '❓ Animax Streaming Help Desk & Troubleshooting',
    description: 'Having issues with playback, audio, or subtitles on **Animax**? Here are quick fixes for the most common problems:',
    fields: [
      {
        name: '🎬 Video Buffering / Freezing',
        value: '• Switch the video server using the server selector below the video player (e.g. Server 1 / Server 2 / HD-1).\n• Clear your browser cache or try an Incognito/Private window.\n• Lower the resolution from 1080p to 720p if your connection is unstable.'
      },
      {
        name: '🔊 Sub vs. Dub Switching',
        value: '• Click the **Audio** toggle (SUB / DUB) on the anime detail page.\n• Some older or airing episodes may take 24–48 hours after release to receive English Dub audio tracks.'
      },
      {
        name: '⬛ Black Screen / Audio Only',
        value: '• Turn off **Hardware Acceleration** in your browser settings (Settings > System > Hardware Acceleration) and restart your browser.\n• Disable aggressive ad-block extensions that block HTML5 video players.'
      },
      {
        name: '📱 Mobile & Smart TV Streaming',
        value: '• Animax is fully optimized for mobile browsers and supports **Chromecast** and **AirPlay** directly from the player controls.\n• You can install Animax as a progressive web app (PWA) by tapping **"Add to Home Screen"** on Chrome or Safari.'
      },
      {
        name: '🚨 Still Having Issues?',
        value: 'Check <#site-status> for current CDN maintenance or file a ticket in <#bug-reports> with the show title, episode number, and your device/browser.'
      }
    ],
    footer: 'Animax Help Desk • Smooth Streaming Everywhere'
  }
};
