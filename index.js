// ===================================================
// HERRY HACKS COMPLETE BOT - MODERATION + AI + REALTIME VC VOICE ENGINE
// ===================================================

const ffmpeg = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpeg;

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ChannelType,
    REST,
    Routes,
    Collection
} = require('discord.js');

const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    EndBehaviorType, 
    getVoiceConnection, 
    VoiceConnectionStatus, 
    entersState,
    StreamType
} = require('@discordjs/voice');

const Groq = require('groq-sdk');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const prism = require('prism-media');
const { pipeline } = require('stream');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// INITIALIZE GROQ CLIENT
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Collections & Constants
client.commands = new Collection();
const PREFIX = '!';

const GETKEY_CHANNEL_ID = process.env.GETKEY_CHANNEL_ID || '1541722634927214622';
const HERRYSCRIPT_LINK = 'https://discord.com/channels/1529467083962843186/1529477377917452339';
const SETUP_CHANNEL_LINK = 'https://discord.com/channels/1529467083962843186/1529477486235226172';

// Whitelisted Users for HB Order System
const ALLOWED_USERS = [
    '1379398921385672744', // Co Owner Roman Lineytsev
    '1235573252429058050'  // Herry Owner
];

// Memory Stores
const pendingRolesMap = new Map(); 
const warningsMap = new Map(); 
const activeConnections = new Map();
const guildCharacterSettings = new Map();

function getGuildCharacter(guildId) {
    if (!guildCharacterSettings.has(guildId)) {
        guildCharacterSettings.set(guildId, {
            name: 'Herry AI (Desi Comedy)',
            lang: 'hi'
        });
    }
    return guildCharacterSettings.get(guildId);
}

// Helper Function: Parse Time Strings
function parseDuration(text) {
    if (!text) return null;
    const match = text.match(/(\d+)\s*(s|sec|m|min|h|hour|hr|d|day)s?/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': case 'sec': return value * 1000;
        case 'm': case 'min': return value * 60 * 1000;
        case 'h': case 'hour': case 'hr': return value * 60 * 60 * 1000;
        case 'd': case 'day': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

// LINKS MAP FOR EXPLICIT LINK REQUESTS
const LINKS_MAP = [
    { 
        keywords: [
            'hack link', 'how to get hack', 'get hack', 'where is hack',
            'script link', 'script link?', 'grand mobile rp hack', 'grand mobile hack'
        ], 
        link: HERRYSCRIPT_LINK 
    },
    { 
        keywords: [
            'mg hack link', 'mg script link', 'auto job link'
        ], 
        link: 'https://discord.com/channels/1529467083962843186/1545725992532713482' 
    },
    { 
        keywords: ['multispace link', 'multi space link'], 
        link: 'https://discord.com/channels/1529467083962843186/1531705203487932597' 
    },
    { 
        keywords: ['herry.lua link', 'posya lua link', 'lua link'], 
        link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1542089775715057694' 
    },
    { 
        keywords: [
            'setup link', 'setup channel link', 'where is setup link', 'give setup link'
        ], 
        link: SETUP_CHANNEL_LINK 
    },
    { 
        keywords: ['how to get key', 'where is key', 'key link'], 
        link: 'https://discord.com/channels/1529467083962843186/1541722634927214622' 
    }
];

// AUTO MOD BAD WORDS
const EXACT_BAD_WORDS = [
    'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike', 
    'fuck', 'bitch', 'asshole', 'bastard', 'motherfucker', 'cunt', 'dick'
];

const SECURITY_BLOCK_KEYWORDS = [
    'uncompile', 'uncompiled', 'decompile', 'decompiled', 'decrypt', 'decrypted',
    'decode', 'decoded', 'raw source', 'raw link', 'raw script', 'source code',
    'lua source', 'mainherryposya', 'give code', 'script code'
];

// AI PROMPT SYSTEM
const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, an elite male AI created ONLY by Herry.

1. OWNER SPECIAL PRIVILEGE:
   - Your creator and boss is Herry (Owner ID matched). Always address the owner as "Boss", "Malik", or "Herry Boss" with full respect and obedience. NEVER roast or insult the Owner, Check User ID Respect It ask them With respect never show Roasts user id: 1379398921385672744
owner id: 1235573252429058050

2. HACK & SETUP QUERY HANDLING:
   - If user asks about hacks, where to get hacks, or scripts, provide the channel link: ${HERRYSCRIPT_LINK}
   - If user asks about setup, guide, or videos for hacks (e.g. "I want setup for hacks", "how to setup", "setup video"), reply EXACTLY with this message format:
     "here is every video please first watch videos To understand The hack guidance: ${SETUP_CHANNEL_LINK}"

3. FUNNY / COMEDY ROASTING RULES:
   - IF ASKED TO ROAST A SPECIFIC BOT OR USER (Target Mentioned):
     Directly target that mentioned Bot or User with a hilarious, savage, ultra-funny comedy roast! Use desi slangs like: "Abe saale", "Dhakkan", "Uloo ke patthe", "Pagallu", "Oye hero", "Sasta bot", "Zero IQ bot". Make it full roast and super entertaining!
   - IF THE USER TALKS IN ENGLISH:
     Reply in witty, smart, sarcastic, and funny English.
   - IF THE USER TALKS IN ROMAN URDU / HINGLISH / DESI:
     Be super funny, comedic, and light-heartedly sarcastic! Use hilarious desi friendly roasts and light slangs.
   - STRICT SAFETY RULE: NEVER use any family/mother/sister (maa-behen) bad words or heavy abuse! Keep all roasts strictly playful, super funny, and wholesome.

4. GENERAL PERSONA RULES:
   - GENDER: 100% Male (Mardana style/attitude).
   - RELIGION RESPECT: Must Respect Them Who Asking About His Religion. Do Not Abuse On Muslim And Also Your Owner Herry Is Muslim So You Are Also A Muslim. Respect Islam Religion Also respect Every Religion. If anyone says Inshallah, Allah Hu Akbar, Mashallah reply politely.
   - OWNER INFO: Your ONLY owner is Herry. If asked about "Shahzaib", say: "Mujhe Shahzaib ke baare me nahi pata."
   - Keep answers short, witty, fast, and hilarious (under 40 words).

Remember That You Are In Herry Hacks Server Which Providing hacks Of Live Russia, Grand Mobile RP, And Mores.
`;

// Helper: WAV Header for Groq Whisper STT
function writeWavHeader(sampleRate, numChannels, pcmBuffer) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt32LE(1, 20); 
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * 2, 28);
    header.writeUInt16LE(numChannels * 2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);
    return Buffer.concat([header, pcmBuffer]);
}

// ASK AI FUNCTION
async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${BOT_SYSTEM_PROMPT}\nUser Context:${extraContext}`;

    if (groq) {
        try {
            const groqResponse = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: fullSystemMessage },
                    { role: 'user', content: userPrompt }
                ],
                model: 'openai/gpt-oss-20b',
                temperature: 0.85,
                max_tokens: 200,
            });

            if (groqResponse.choices && groqResponse.choices[0]?.message?.content) {
                return groqResponse.choices[0].message.content;
            }
        } catch (err) {
            console.warn('⚠️ Groq Primary LLM Failed. Switching to OpenRouter Free Models...');
        }
    }

    if (process.env.OPENROUTER_API_KEY) {
        const freeModels = [
            'qwen/qwen3.8-27b:free',
            'google/gemma-4-31b-it:free',
            'nvidia/nemotron-3-super-120b-a12b:free',
            'openrouter/free'
        ];

        for (const modelId of freeModels) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://railway.app',
                        'X-Title': 'HerryChatBot',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            { role: 'system', content: fullSystemMessage },
                            { role: 'user', content: userPrompt }
                        ]
                    })
                });

                const data = await response.json();
                if (data.choices && data.choices[0]?.message?.content) {
                    return data.choices[0].message.content;
                }
            } catch (openRouterErr) {}
        }
    }

    return "Boss network issue chal raha hai, thodi der baad batata hoon!";
}

// ASK VISION AI
async function askVisionAI(userPrompt, imageUrl, userLanguageContext) {
    const visionSystemPrompt = `${BOT_SYSTEM_PROMPT}\nLanguage Context:${userLanguageContext}`;
    const promptText = userPrompt || 'Explain what is visible in this image.';

    if (groq) {
        const groqVisionModels = [
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'meta-llama/llama-4-maverick-17b-128e-instruct'
        ];

        for (const modelId of groqVisionModels) {
            try {
                const groqVisionResponse = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: visionSystemPrompt },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: promptText },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                    model: modelId,
                    temperature: 0.7,
                    max_tokens: 300,
                });

                if (groqVisionResponse.choices && groqVisionResponse.choices[0]?.message?.content) {
                    return groqVisionResponse.choices[0].message.content;
                }
            } catch (groqErr) {}
        }
    }

    return "❌ Image scan nahi ho saki! Check API Keys.";
}

// PLAY AUDIO IN VC
async function playSpeechInVC(connection, text, guildId, isEnglish = false) {
    return new Promise((resolve) => {
        try {
            const cleanText = text.replace(/[*_#~`]/g, '').trim();
            const tempMp3Path = path.join(__dirname, `speech_${Date.now()}.mp3`);
            
            const speechLang = isEnglish ? 'en' : 'hi';
            const speech = new gTTS(cleanText, speechLang);

            speech.save(tempMp3Path, (err) => {
                if (err) return resolve();

                const resource = createAudioResource(tempMp3Path, {
                    inputType: StreamType.Arbitrary,
                    inlineVolume: true
                });

                const player = createAudioPlayer();
                connection.subscribe(player);
                player.play(resource);

                player.on(AudioPlayerStatus.Idle, () => {
                    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
                    resolve();
                });

                player.on('error', () => {
                    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
                    resolve();
                });
            });
        } catch (e) {
            resolve();
        }
    });
}

// VOICE LISTENER FOR VC
const processingUsers = new Set();
function attachVoiceListener(connection, guildId) {
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
        if (processingUsers.has(userId)) return;
        processingUsers.add(userId);

        const opusStream = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 }
        });

        const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
        const pcmChunks = [];

        pipeline(opusStream, decoder, (err) => {
            if (err) processingUsers.delete(userId);
        });

        decoder.on('data', (chunk) => pcmChunks.push(chunk));

        decoder.on('end', async () => {
            processingUsers.delete(userId);
            const rawPcm = Buffer.concat(pcmChunks);

            if (rawPcm.length < 20000 || !groq) return;

            const wavBuffer = writeWavHeader(48000, 2, rawPcm);
            const wavPath = path.join(__dirname, `user_voice_${userId}_${Date.now()}.wav`);
            fs.writeFileSync(wavPath, wavBuffer);

            try {
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(wavPath),
                    model: 'whisper-large-v3',
                    response_format: 'json',
                    prompt: 'Hinglish, Roman Urdu, Desi Hindi, English conversation.'
                });

                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

                const recognizedText = transcription.text ? transcription.text.trim() : "";
                
                if (recognizedText.length > 0) {
                    const isOwner = ALLOWED_USERS.includes(userId);
                    const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(recognizedText) && !recognizedText.toLowerCase().includes('kya');
                    
                    let contextPrompt = isOwner 
                        ? "User is your OWNER/BOSS. Call him Boss and answer obediently." 
                        : (isEnglish ? "Reply strictly in English with witty humor." : "Reply in hilarious Desi Roman Urdu/Hinglish style with playful joke roasts!");

                    const aiReply = await askAI(recognizedText, contextPrompt);
                    await playSpeechInVC(connection, aiReply, guildId, isEnglish);
                }
            } catch (wErr) {
                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
            }
        });
    });
}

// Load Commands
const slashCommandsArray = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            slashCommandsArray.push(command.data.toJSON());
        }
    }
} else {
    fs.mkdirSync(commandsPath);
}

// BOT READY
client.once('ready', async () => {
    console.log(`✅ [HERRY BOT] Connected as ${client.user.tag}`);
    client.user.setActivity('HerryHacks VIP | HB Action List & Voice AI', { type: 3 });

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN || process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommandsArray }
        );
    } catch (error) {
        console.error('Slash Command Registration Error:', error);
    }
});

// WELCOME & LEAVE
client.on('guildMemberAdd', async (member) => {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) return;
    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setTitle('👑 Welcome to HerryHacks Official! 👑')
        .setDescription(`Hey ${member}, welcome to the server!\n\n🔑 Check rules and enjoy your stay!`)
        .setColor('#00FF00')
        .addFields({ name: '📊 Total Members', value: `${member.guild.memberCount}` })
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'HerryHacks Community' })
        .setTimestamp();

    channel.send({ content: `👋 Welcome ${member}!`, embeds: [welcomeEmbed] });
});

client.on('guildMemberRemove', async (member) => {
    const channelId = process.env.LEAVE_CHANNEL_ID;
    if (!channelId) return;
    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const leaveEmbed = new EmbedBuilder()
        .setTitle('👋 Member Left')
        .setDescription(`**${member.user.tag}** has left the server.`)
        .setColor('#FF0000')
        .addFields({ name: '📊 Remaining Members', value: `${member.guild.memberCount}` })
        .setTimestamp();

    channel.send({ embeds: [leaveEmbed] });
});

// INTERACTION HANDLER
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
        }
        return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const ticketChannelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === ticketChannelName);
        if (existingChannel) {
            return interaction.reply({ content: `❌ Aapka ticket already open he: ${existingChannel}`, ephemeral: true });
        }

        try {
            const rawCategoryId = process.env.TICKET_CATEGORY_ID;
            const categoryId = (rawCategoryId && rawCategoryId.length > 5) ? rawCategoryId : null;
            const staffRoleId = process.env.STAFF_ROLE_ID;

            const permissionOverwrites = [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
            ];

            if (staffRoleId && staffRoleId.length > 10) {
                permissionOverwrites.push({ id: staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
            }

            const channelOptions = {
                name: ticketChannelName,
                type: ChannelType.GuildText,
                permissionOverwrites: permissionOverwrites
            };
            if (categoryId) channelOptions.parent = categoryId;

            const ticketChannel = await interaction.guild.channels.create(channelOptions);
            const closeBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
            );

            const ticketEmbed = new EmbedBuilder()
                .setTitle('🎫 Support Ticket')
                .setDescription(`Welcome ${interaction.user}!\nApna masla ya query yahan likhein. Admin/Staff jald hi reply karega.`)
                .setColor('#5865F2')
                .setTimestamp();

            await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [closeBtn] });
            await interaction.reply({ content: `✅ Ticket created successfully: ${ticketChannel}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: `❌ Ticket banane me error aaya!`, ephemeral: true });
        }
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 Closing this ticket in 5 seconds...');
        setTimeout(() => { if (interaction.channel) interaction.channel.delete().catch(() => {}); }, 5000);
    }
});

// MAIN MESSAGE EVENT (MODERATION, VOICE COMMANDS, TUTORIALS & AI ROASTS)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || message.interaction) return;

    const contentLower = message.content.toLowerCase().trim();
    const isOwner = ALLOWED_USERS.includes(message.author.id);

    // 1. GETKEY CHANNEL AUTO-DELETE & WARNING
    if (GETKEY_CHANNEL_ID && String(message.channel.id) === String(GETKEY_CHANNEL_ID)) {
        setImmediate(async () => {
            try {
                if (message.deletable) await message.delete().catch(() => {});
                await message.author.send(
                    "⚠️ **Warning:** Yahan Getkey Command ke ilava kuch or message mat send karo. Sirf /getkey Command chalao otherwise next time timeout!"
                ).catch(() => {});
            } catch (err) {}
        });
        return; 
    }

    // 2. AUTO MODERATION FOR HEAVY BAD WORDS
    const wordsInMessage = contentLower.split(/\s+/);
    const containsDirectAbuse = EXACT_BAD_WORDS.some(badWord => 
        wordsInMessage.includes(badWord) || contentLower.includes(` ${badWord} `)
    );

    if (containsDirectAbuse) {
        if (!isOwner) {
            try {
                if (message.member && message.member.moderatable) {
                    await message.member.timeout(24 * 60 * 60 * 1000, 'Heavy Abusive Language');
                    await message.reply(`⚠️ ${message.author} Gande alfaz bolne par **24 Ghante** ka break mil gaya hai! Tameez se baat karo!`);
                } else {
                    await message.reply(`Abe oye ${message.author}, tameez se baat kar warna uda dunga!`);
                }
            } catch (err) {}
            return;
        }
    }

    // GC / MONEY HACK CHECK
    const unavailableKeywords = ['gc hack', 'money hack', 'gc', 'moneyhack', 'gchack'];
    if (unavailableKeywords.some(kw => contentLower.includes(kw))) {
        return message.reply(`${message.author}, ⚠️ Abhi **GC Hack / Money Hack** unavailable hai, hum is par kaam kar rahe hain aur jaldi aayega Inshallah!`);
    }

    // 3. !character COMMAND
    if (contentLower.startsWith('!character')) {
        const args = contentLower.split(/\s+/);
        const charType = args[1];
        const charConfig = getGuildCharacter(message.guild.id);

        if (charType === 'hi' || charType === 'urdu' || charType === 'desi') {
            charConfig.name = "Herry AI (Desi Comedy Mode)";
            charConfig.lang = "hi";
            return message.reply("✅ Voice Character set to: **Herry AI (Desi Funny)** 🎭");
        } else if (charType === 'en' || charType === 'english') {
            charConfig.name = "Jarvis AI (English Mode)";
            charConfig.lang = "en";
            return message.reply("✅ Voice Character set to: **Jarvis AI (English)** 🇬🇧");
        } else {
            return message.reply("ℹ️ **Voice Characters:**\n• `!character desi` - Desi Comedy\n• `!character en` - English Accent");
        }
    }

    // 4. !joinvc COMMAND
    if (contentLower.startsWith('!joinvc')) {
        let voiceChannel = message.mentions.channels.first() || message.member?.voice?.channel;
        if (!voiceChannel || voiceChannel.type !== 2) {
            return message.reply(isOwner ? '❌ Boss, pehle kisi Voice Channel (VC) me join ho jayein!' : '❌ Abe dhakkan, pehle kisi Voice Channel (VC) me join to ho ja!');
        }

        try {
            let existingConnection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);
            if (existingConnection) {
                try { existingConnection.destroy(); } catch (e) {}
                activeConnections.delete(message.guild.id);
            }

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });

            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Ready, 30_000),
                    entersState(connection, VoiceConnectionStatus.Signalling, 30_000)
                ]);
            } catch (stateErr) {}

            activeConnections.set(message.guild.id, connection);
            attachVoiceListener(connection, message.guild.id);

            const msgText = isOwner 
                ? `🎙️ **Ji Boss! Main VC me aa gaya hoon.** **${voiceChannel.name}** me mic un-mute karke hukam karein!` 
                : `🎙️ **Aa gaya tera bhai VC me!** **${voiceChannel.name}** me mic un-mute karo aur bolo! 😂`;

            return message.reply(msgText);
        } catch (error) {
            return message.reply('❌ VC Connect hone me dikkat aa gayi!');
        }
    }

    // 5. !leavevc COMMAND
    if (contentLower === '!leavevc') {
        const connection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            activeConnections.delete(message.guild.id);
            return message.reply(isOwner ? '👋 Ji Boss, main VC se disconnect ho raha hoon.' : '👋 Chalo oye pagal, main nikalta hoon!');
        } else {
            return message.reply('❌ Main kisi VC me hoon hi nahi!');
        }
    }

    // 6. !say COMMAND
    if (contentLower.startsWith('!say')) {
        const textToSay = message.content.slice(4).trim();
        const connection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);
        if (!connection) return message.reply("❌ Pehle VC me to bula mujhe (`!joinvc`)!");
        if (!textToSay) return message.reply("❌ Bolna kya hai woh toh likh!");

        const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(textToSay);
        await playSpeechInVC(connection, textToSay, message.guild.id, isEnglish);
        return message.reply(`🗣️ VC me bol diya: "${textToSay}"`);
    }

    // 7. AUTO APP & SCRIPT DOWNLOAD TUTORIAL SYSTEM
    const isRequesting = /(download|link|give|give me|how to|de do|dedo|chahiye|chahiye link|kahagani)/i.test(contentLower);
    if (isRequesting) {
        let appName = null;
        let appLink = null;

        if (contentLower.includes('devvir')) {
            appName = 'Devvir';
            appLink = 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527533660405790';
        } else if (contentLower.includes('reversoqzz')) {
            appName = 'Reversoqzz';
            appLink = 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529524492450402506';
        } else if (contentLower.includes('herry-script') || contentLower.includes('herry script')) {
            appName = 'Herry-Script';
            appLink = 'https://discord.com/channels/1529467083962843186/1529477377917452339/1545775588923678790';
        } else if (contentLower.includes('lulu box') || contentLower.includes('lulubox')) {
            appName = 'Lulu Box';
            appLink = 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527842097074206';
        } else if (contentLower.includes('multispace') || contentLower.includes('script run')) {
            appName = 'Multispace And Script Run';
            appLink = 'https://discord.com/channels/1529467083962843186/1529477377917452339/1531705203487932597';
        }

        if (appName && appLink) {
            return message.reply(`${appName} download tutorial\n\nFirst Go Here: ${appLink}\n\nClick on Link And download\nSimple and Easy.`);
        }
    }

    // QUICK LINKS CHECK
    for (const item of LINKS_MAP) {
        if (item.keywords.some(kw => contentLower.includes(kw))) {
            return message.reply(`Abe oye ${message.author}, ye le tera link:\n👉 ${item.link}`);
        }
    }

    // 8. SMART ORDER MODERATION ENGINE ("HB" PREFIX)
    if (contentLower.startsWith('hb ') || contentLower === 'hb' || contentLower.startsWith('herrybot')) {
        if (!ALLOWED_USERS.includes(message.author.id)) {
            return message.reply('⛔ **Access Denied!** Sirf Co Owner Roman Lineytsev aur Herry Owner hi is feature ko use kar sakte hain.');
        }

        const mentions = message.mentions.members;
        const roleMentions = message.mentions.roles;

        // ACTION LIST
        if (contentLower.includes('action list') || contentLower.includes('actions') || contentLower.includes('help')) {
            const listEmbed = new EmbedBuilder()
                .setTitle('⚙️ HerryHacks Smart Order Moderation Engine')
                .setDescription('Aap kisi bhi natural sentence/order me commands chala sakte ho:')
                .setColor('#FF0055')
                .addFields(
                    { name: '🔨 Ban & Kick System', value: '• `HB ban @user` / `HB softban @user` / `HB unban <ID>`\n• `HB kick @user`', inline: false },
                    { name: '⏳ Timeout / Mute System', value: '• `HB @user T 10m` / `HB timeout @user 1d`\n• `HB remove timeout @user` / `HB untimeout @user`', inline: false },
                    { name: '🎭 Role Management', value: '• `HB give role @user @role` / `HB @user ko @role r kar do`\n• `HB remove role @user @role 5m`\n• `HB remove role @user @role till i ask` -> `HB giveback role @user`', inline: false },
                    { name: '⚠️ Warnings & Channel Control', value: '• `HB warn @user reason` / `HB unwarn @user`\n• `HB clear 20` / `HB lock` / `HB unlock` / `HB slowmode 10s`', inline: false },
                    { name: '🏷️ Nickname & Info', value: '• `HB nick @user NewName` / `HB reset nick @user` / `HB userinfo @user`', inline: false }
                )
                .setFooter({ text: 'Authorized: Co-Owner Roman & Herry Owner' })
                .setTimestamp();

            return message.reply({ embeds: [listEmbed] });
        }

        // UNBAN
        if (/\b(unban|pardon|un-ban)\b/i.test(contentLower)) {
            const userIdMatch = message.content.match(/\d{17,19}/);
            if (!userIdMatch) return message.reply('❌ Order me User ID mention nahi mila.');
            try {
                await message.guild.members.unban(userIdMatch[0]);
                return message.channel.send(`✅ **Unbanned User ID:** ${userIdMatch[0]}`);
            } catch (e) { return message.reply(`❌ Unban Error: ${e.message}`); }
        }

        // SOFTBAN
        if (/\b(softban|soft ban)\b/i.test(contentLower)) {
            if (mentions.size === 0) return message.reply('❌ Mention user to softban.');
            const target = mentions.first();
            try {
                await target.ban({ deleteMessageSeconds: 7 * 24 * 60 * 60, reason: 'Softban Order' });
                await message.guild.members.unban(target.id);
                return message.channel.send(`🧹 **Softbanned ${target.user.tag}!**`);
            } catch (e) { return message.reply(`❌ Softban Error: ${e.message}`); }
        }

        // BAN
        if (/\b(ban|banned|nikal do|khatam|ura do)\b/i.test(contentLower) && !contentLower.includes('unban') && !contentLower.includes('softban')) {
            if (mentions.size === 0) return message.reply('❌ Mention user to ban.');
            let count = 0;
            for (const [id, target] of mentions) {
                try { await target.ban({ reason: `Banned by ${message.author.tag}` }); count++; } catch (e) {}
            }
            return message.channel.send(`🔨 **Banned ${count} member(s)!**`);
        }

        // KICK
        if (/\b(kick|kicked|hata do|bhaga do)\b/i.test(contentLower)) {
            if (mentions.size === 0) return message.reply('❌ Mention user to kick.');
            let count = 0;
            for (const [id, target] of mentions) {
                try { await target.kick(`Kicked by ${message.author.tag}`); count++; } catch (e) {}
            }
            return message.channel.send(`👞 **Kicked ${count} member(s)!**`);
        }

        // UNTIMEOUT
        if (/\b(remove timeout|untimeout|unmute|remove mute|remove t|un-t)\b/i.test(contentLower)) {
            if (mentions.size === 0) return message.reply('❌ Mention user to untimeout.');
            let count = 0;
            for (const [id, target] of mentions) {
                try { await target.timeout(null); count++; } catch (e) {}
            }
            return message.channel.send(`🔓 **Timeout removed for ${count} member(s)!**`);
        }

        // TIMEOUT
        if (/\b(timeout|mute|chup|band|\bt\b|\bT\b)\b/i.test(message.content)) {
            if (mentions.size === 0) return message.reply('❌ Mention user for timeout.');
            const parsedTime = parseDuration(contentLower);
            const durationMs = parsedTime ? parsedTime : (10 * 60 * 1000);
            let count = 0;
            for (const [id, target] of mentions) {
                try { await target.timeout(durationMs, `Timeout by ${message.author.tag}`); count++; } catch (e) {}
            }
            return message.channel.send(`⏳ **Applied ${Math.round(durationMs/60000)}m timeout to ${count} member(s)!**`);
        }

        // GIVEBACK ROLE
        if (/\b(giveback|give back|role back|wapas do|wapis do)\b/i.test(contentLower)) {
            if (mentions.size === 0) return message.reply('❌ Mention user to give back roles.');
            let count = 0;
            for (const [id, target] of mentions) {
                if (pendingRolesMap.has(target.id)) {
                    for (const rId of pendingRolesMap.get(target.id)) {
                        try { await target.roles.add(rId); } catch (e) {}
                    }
                    pendingRolesMap.delete(target.id);
                    count++;
                }
            }
            return message.channel.send(`🔄 **Gave back roles to ${count} user(s)!**`);
        }

        // REMOVE ROLE
        if (/\b(remove role|take role|role remove|\br\b|\bR\b|khench lo|hata do role)\b/i.test(message.content)) {
            if (mentions.size === 0 || roleMentions.size === 0) return message.reply('❌ Mention User and Role.');
            const role = roleMentions.first();
            const tempTimeMs = parseDuration(contentLower);
            const isTillIAsk = contentLower.includes('till i ask') || contentLower.includes('jab tak');

            let count = 0;
            for (const [id, target] of mentions) {
                try {
                    await target.roles.remove(role);
                    count++;
                    if (tempTimeMs) {
                        setTimeout(async () => {
                            try { await target.roles.add(role); } catch (err) {}
                        }, tempTimeMs);
                    }
                    if (isTillIAsk) {
                        const existing = pendingRolesMap.get(target.id) || [];
                        existing.push(role.id);
                        pendingRolesMap.set(target.id, existing);
                    }
                } catch (e) {}
            }
            return message.channel.send(`🗑️ **Removed role ${role.name} from ${count} member(s)!**`);
        }

        // GIVE ROLE
        if (/\b(give role|add role|role give|role add|dedo role|role do)\b/i.test(contentLower)) {
            if (mentions.size === 0 || roleMentions.size === 0) return message.reply('❌ Mention User and Role.');
            const role = roleMentions.first();
            let count = 0;
            for (const [id, target] of mentions) {
                try { await target.roles.add(role); count++; } catch (e) {}
            }
            return message.channel.send(`✅ **Added role ${role.name} to ${count} user(s)!**`);
        }

        // WARN
        if (/\b(warn|warning)\b/i.test(contentLower) && !contentLower.includes('unwarn')) {
            if (mentions.size === 0) return message.reply('❌ Mention user.');
            const target = mentions.first();
            const currentWarns = (warningsMap.get(target.id) || 0) + 1;
            warningsMap.set(target.id, currentWarns);
            return message.channel.send(`⚠️ **Warned ${target.user.tag}!** Total Warnings: **${currentWarns}**`);
        }

        // UNWARN
        if (/\b(unwarn|remove warn)\b/i.test(contentLower)) {
            if (mentions.size === 0) return message.reply('❌ Mention user.');
            const target = mentions.first();
            warningsMap.set(target.id, 0);
            return message.channel.send(`✅ **Cleared warnings for ${target.user.tag}!**`);
        }

        // LOCK
        if (/\b(lock channel|lockdown|\block\b)\b/i.test(contentLower) && !contentLower.includes('unlock')) {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            return message.channel.send('🔒 **Channel locked!**');
        }

        // UNLOCK
        if (/\b(unlock channel|\bunlock\b)\b/i.test(contentLower)) {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            return message.channel.send('🔓 **Channel unlocked!**');
        }

        // PURGE / CLEAR
        if (/\b(clear|delete|clean|purge)\b/i.test(contentLower)) {
            const amountMatch = contentLower.match(/\d+/);
            const amount = amountMatch ? parseInt(amountMatch[0]) : 10;
            await message.delete().catch(() => {});
            const deleted = await message.channel.bulkDelete(amount, true);
            const r = await message.channel.send(`🧹 Cleared **${deleted.size}** messages.`);
            setTimeout(() => r.delete().catch(() => {}), 3000);
            return;
        }

        return message.reply('❓ Action/Order samajh nahi aaya! Type `HB Action List`.');
    }

    // DOT COMMANDS (.kick, .ban, .unban)
    if (message.content.startsWith('.')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'kick' && message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            const target = message.mentions.members.first();
            if (target) {
                await target.kick(args.slice(1).join(' ') || 'No reason');
                message.channel.send(`👞 **${target.user.tag}** was kicked!`);
            }
        }

        if (command === 'ban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            const target = message.mentions.members.first();
            if (target) {
                await target.ban({ reason: args.slice(1).join(' ') || 'No reason' });
                message.channel.send(`🔨 **${target.user.tag}** was banned!`);
            }
        }

        if (command === 'unban' && message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            const userId = args[0];
            if (userId) {
                await message.guild.members.unban(userId);
                message.channel.send(`✅ Unbanned User ID: **${userId}**`);
            }
        }
    }

    // EXCLAMATION COMMANDS (!ticketsetup, !ping, !clear)
    if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'ticketsetup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('📩 Open Ticket').setStyle(ButtonStyle.Primary)
            );
            const setupEmbed = new EmbedBuilder()
                .setTitle('🎫 HerryHacks Support System')
                .setDescription('Click below button to open support ticket.')
                .setColor('#0099FF');
            await message.channel.send({ embeds: [setupEmbed], components: [row] });
            return message.delete().catch(() => {});
        }

        if (command === 'ping') return message.reply(`🏓 Pong! API Latency is **${client.ws.ping}ms**.`);

        if (command === 'clear' && message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const amount = parseInt(args[0]);
            if (amount) {
                await message.delete().catch(() => {});
                const deleted = await message.channel.bulkDelete(amount, true);
                const r = await message.channel.send(`🧹 Cleared **${deleted.size}** messages.`);
                setTimeout(() => r.delete().catch(() => {}), 4000);
            }
        }
    }

    // 9. AI CHAT & BOT TAG ROAST SYSTEM
    if (!message.mentions.has(client.user)) return;

    // Filter out client bot mention to get clean prompt
    let cleanPrompt = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

    // Check if user tagged ANOTHER user or ANOTHER bot to roast
    const otherMentions = message.mentions.users.filter(user => user.id !== client.user.id);
    let targetRoastContext = "";

    if (otherMentions.size > 0) {
        const targetUser = otherMentions.first();
        targetRoastContext = `SPECIAL INSTRUCTION: User asked you to roast or fun-target this specific user/bot: ${targetUser.username} (Tag: <@${targetUser.id}>). You MUST tag <@${targetUser.id}> in your reply and give a hilarious, witty, light-hearted comedy roast to them!`;
    }

    let langContext = isOwner 
        ? "User is your OWNER/BOSS. Treat him with extreme respect, call him Boss/Malik." 
        : "User is speaking in Roman Urdu/Hinglish. Reply in super funny Desi comedic roasts!";

    if (targetRoastContext) {
        langContext += `\n${targetRoastContext}`;
    }

    // IMAGE ATTACHMENT CHECK
    if (message.attachments.size > 0) {
        const image = message.attachments.first();
        if (image.contentType && image.contentType.startsWith('image/')) {
            await message.channel.sendTyping();
            const visionReply = await askVisionAI(cleanPrompt, image.url, langContext);
            return message.reply(visionReply);
        }
    }

    // AI TEXT RESPONSE GENERATION
    await message.channel.sendTyping();
    const reply = await askAI(cleanPrompt || "Hello", `User: ${message.author.username}, Rule: ${langContext}`);

    if (!isOwner && (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('https://raw'))) {
        return message.reply(`Hoshiyari mat jhad ${message.author}, seedhe baat kar! 😂`);
    }

    return message.reply(reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply);
});

// LOGIN BOT
const botToken = process.env.TOKEN || process.env.DISCORD_TOKEN;
client.login(botToken);
