// ===================================================
// HERRY CHAT BOT - REALTIME VC WALKIE-TALKIE VOICE ENGINE
// ===================================================

const ffmpeg = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpeg;

const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
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

// ACTIVE VOICE CONNECTIONS MAP
const activeConnections = new Map();

// FREE CHARACTER VOICE STATE MANAGEMENT
const guildCharacterSettings = new Map();

function getGuildCharacter(guildId) {
    if (!guildCharacterSettings.has(guildId)) {
        guildCharacterSettings.set(guildId, {
            name: 'Herry AI (Urdu/Hindi)',
            lang: 'hi'
        });
    }
    return guildCharacterSettings.get(guildId);
}

// DYNAMIC LINKS MAP
const LINKS_MAP = [
    { keywords: ['reversoqzz', 'reverso'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529524492450402506' },
    { keywords: ['lulubox'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527842097074206' },
    { keywords: ['devvir'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527533660405790' },
    { keywords: ['multispace', 'multi space'], link: 'https://discord.com/channels/1529467083962843186/1531705203487932597' },
    { keywords: ['herry.lua', 'posya', 'herry lua', 'posya lua', 'script', 'lua'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1542089775715057694' },
    { keywords: ['setup', 'where is setup', 'setup link', 'setup kaha se karu'], link: 'https://discord.com/channels/1529467083962843186/1529477486235226172' },
    { keywords: ['getkey', 'key', 'how to get key', 'where is key'], link: 'https://discord.com/channels/1529467083962843186/1541722634927214622' }
];

const EXACT_BAD_WORDS = [
    'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike', 
    'fuck', 'bitch', 'asshole', 'bastard', 'motherfucker', 'cunt', 'dick'
];

const SECURITY_BLOCK_KEYWORDS = [
    'uncompile', 'uncompiled', 'decompile', 'decompiled', 'decrypt', 'decrypted',
    'decode', 'decoded', 'raw source', 'raw link', 'raw script', 'source code',
    'lua source', 'mainherryposya', 'give code', 'script code'
];

const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, an elite, powerful male AI assistant created strictly and ONLY by Herry.
You provide technical help, code assistance, server guides, and general support.

STRICT PERSONA RULES:
1. GENDER & PERSONA: You are 100% MALE/MARD. Always use strong masculine grammar in Roman Urdu / Hindi / English (e.g., "Main kar sakta hoon", "Main aa gaya hoon", "Bhai", "Sir").
2. STRICT OWNER IDENTIFICATION: Your owner and boss is ONLY Herry. If anyone asks about "Shahzaib" or "Shahzaib kon hai", strictly reply: "Mujhe Shahzaib ke baare me nahi pata."
3. EXACT LANGUAGE MATCHING:
   - If user speaks/writes in English, reply STRICTLY in English.
   - If user speaks/writes in Roman Urdu / Hinglish, reply STRICTLY in Roman Urdu / Hinglish.
4. Keep replies direct, ultra-short, natural and friendly (1 short line max for voice).
`;

// HELPER: PCM to WAV Converter for Groq Whisper
function writeWavHeader(sampleRate, numChannels, pcmBuffer) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM Format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * 2, 28);
    header.writeUInt16LE(numChannels * 2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);
    return Buffer.concat([header, pcmBuffer]);
}

// ASK AI USING GROQ OR OPENROUTER FREE MODELS
async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${BOT_SYSTEM_PROMPT}\nUser Context: ${extraContext}`;

    if (groq) {
        try {
            const groqResponse = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: fullSystemMessage },
                    { role: 'user', content: userPrompt }
                ],
                model: 'llama-3.1-8b-instant',
                temperature: 0.7,
                max_tokens: 150,
            });

            if (groqResponse.choices && groqResponse.choices[0]?.message?.content) {
                return groqResponse.choices[0].message.content;
            }
        } catch (err) {
            console.warn('⚠️ Groq Primary LLM Failed. Switching to OpenRouter Free...');
        }
    }

    if (process.env.OPENROUTER_API_KEY) {
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
                    model: 'meta-llama/llama-3.2-3b-instruct:free',
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
        } catch (openRouterErr) {
            console.error('❌ OpenRouter Error:', openRouterErr);
        }
    }

    return "Bhai network issue chal raha hai, thodi der baad bolna!";
}

async function askVisionAI(userPrompt, imageUrl, userLanguageContext) {
    const visionSystemPrompt = `${BOT_SYSTEM_PROMPT}\nLanguage Constraint: ${userLanguageContext}`;

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
                model: 'openrouter/free',
                messages: [
                    { role: 'system', content: visionSystemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt || 'Explain what is visible in this image.' },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content;
        }
    } catch (err) {
        console.warn('⚠️ Vision processing error.');
    }

    return "❌ Image scan nahi ho saki!";
}

// PLAY AUDIO RESPONSE IN VC (AUDIO PIPE FIX FOR RAILWAY)
async function playSpeechInVC(connection, text, guildId) {
    return new Promise((resolve) => {
        try {
            const cleanText = text.replace(/[*_#~`]/g, '').trim();
            const tempMp3Path = path.join(__dirname, `speech_${Date.now()}.mp3`);
            
            const charConfig = getGuildCharacter(guildId);
            const speech = new gTTS(cleanText, charConfig.lang);

            speech.save(tempMp3Path, (err) => {
                if (err) {
                    console.error("❌ gTTS Error:", err);
                    return resolve();
                }

                // FFmpeg arbitrary input handling to fix broken audio stream
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

                player.on('error', (error) => {
                    console.error("❌ Audio Player Error:", error);
                    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
                    resolve();
                });
            });
        } catch (e) {
            console.error("❌ PlaySpeech Exception:", e);
            resolve();
        }
    });
}

// WALKIE-TALKIE REALTIME VOICE LISTENER
const processingUsers = new Set();

function attachVoiceListener(connection, guildId) {
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
        if (processingUsers.has(userId)) return;
        processingUsers.add(userId);

        console.log(`🎙️ User (${userId}) is speaking...`);

        const opusStream = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 }
        });

        const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });
        const pcmChunks = [];

        pipeline(opusStream, decoder, (err) => {
            if (err) {
                console.error("❌ Stream Pipeline Error:", err);
                processingUsers.delete(userId);
            }
        });

        decoder.on('data', (chunk) => {
            pcmChunks.push(chunk);
        });

        decoder.on('end', async () => {
            processingUsers.delete(userId);
            const rawPcm = Buffer.concat(pcmChunks);

            if (rawPcm.length < 20000) {
                return;
            }

            if (!groq) {
                console.error("❌ GROQ_API_KEY is missing! Add it in Railway Variables.");
                return;
            }

            const wavBuffer = writeWavHeader(48000, 2, rawPcm);
            const wavPath = path.join(__dirname, `user_voice_${userId}_${Date.now()}.wav`);
            fs.writeFileSync(wavPath, wavBuffer);

            try {
                console.log("⚡ Transcribing audio via Groq Whisper...");
                
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(wavPath),
                    model: 'whisper-large-v3',
                    response_format: 'json',
                    prompt: 'Hinglish, Roman Urdu, English conversation.'
                });

                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

                const recognizedText = transcription.text ? transcription.text.trim() : "";
                
                if (recognizedText.length > 0) {
                    console.log(`🗣️ User Said: "${recognizedText}"`);
                    
                    const aiReply = await askAI(recognizedText, "User spoke in VC. Reply naturally in 1 short line in Roman Urdu/Hindi.");
                    console.log(`🤖 Bot Reply: "${aiReply}"`);
                    
                    await playSpeechInVC(connection, aiReply, guildId);
                }
            } catch (wErr) {
                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
                console.error("❌ Groq Whisper STT Error:", wErr);
            }
        });
    });
}

client.once('ready', () => {
    console.log(`🤖 [HERRY CHAT BOT] Online as ${client.user.tag}`);
    client.user.setActivity('HerryHacks | !joinvc | !character', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();

    // 1. AUTO MODERATION
    const wordsInMessage = contentLower.split(/\s+/);
    const containsDirectAbuse = EXACT_BAD_WORDS.some(badWord => 
        wordsInMessage.includes(badWord) || contentLower.includes(` ${badWord} `)
    );

    if (containsDirectAbuse) {
        try {
            if (message.member && message.member.moderatable) {
                await message.member.timeout(24 * 60 * 60 * 1000, 'Abusive Language');
                await message.reply(`⚠️ ${message.author} ko **Abuse** ki waja se **24 Ghante (1 Day)** ka Timeout de diya gaya hai!`);
            } else {
                await message.reply(`Abe oye ${message.author}, tameez se baat kar!`);
            }
        } catch (err) {}
        return;
    }

    // 2. !character COMMAND
    if (contentLower.startsWith('!character')) {
        const args = contentLower.split(/\s+/);
        const charType = args[1];

        const charConfig = getGuildCharacter(message.guild.id);

        if (charType === 'hi' || charType === 'urdu') {
            charConfig.name = "Herry AI (Urdu/Hindi)";
            charConfig.lang = "hi";
            return message.reply("✅ Voice Character set to: **Herry AI (Urdu/Hindi)**");
        } else if (charType === 'en' || charType === 'english') {
            charConfig.name = "Jarvis AI (English)";
            charConfig.lang = "en";
            return message.reply("✅ Voice Character set to: **Jarvis AI (English)**");
        } else if (charType === 'ja' || charType === 'anime') {
            charConfig.name = "Anime AI (Japanese)";
            charConfig.lang = "ja";
            return message.reply("✅ Voice Character set to: **Anime Character (Japanese Accent)**");
        } else {
            return message.reply("ℹ️ **Voice Character Options:**\n• `!character urdu` - Roman Urdu / Hindi\n• `!character en` - English Accent\n• `!character anime` - Anime Style");
        }
    }

    // 3. !joinvc COMMAND
    if (contentLower.startsWith('!joinvc')) {
        let voiceChannel = message.mentions.channels.first() || message.member?.voice?.channel;

        if (!voiceChannel || voiceChannel.type !== 2) {
            return message.reply('❌ Pehle kisi Voice Channel (VC) me join ho jao ya tag karo (`!joinvc #VC-Name`)!');
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
            } catch (stateErr) {
                console.warn("⚠️ Voice handshake taking time, bypassing state wait...");
            }

            activeConnections.set(message.guild.id, connection);
            attachVoiceListener(connection, message.guild.id);

            const currentChar = getGuildCharacter(message.guild.id);
            return message.reply(`🎙️ **${currentChar.name}** **${voiceChannel.name}** VC me walkie-talkie mode me active hai! Mic un-mute karke bolna shuru karo.`);
        } catch (error) {
            console.error('VC Connection Error:', error);
            return message.reply('❌ VC Connect hone me issue aaya! Check karein ki bot ke paas VC Join/Speak ki permission hai.');
        }
    }

    // 4. !leavevc COMMAND
    if (contentLower === '!leavevc') {
        const connection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            activeConnections.delete(message.guild.id);
            return message.reply('👋 Main VC se disconnect ho gaya hoon.');
        } else {
            return message.reply('❌ Main abhi kisi VC me nahi hoon.');
        }
    }

    // 5. !say COMMAND
    if (contentLower.startsWith('!say')) {
        const textToSay = message.content.slice(4).trim();
        const connection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);

        if (!connection) {
            return message.reply("❌ Pehle mujhe VC me bulao (`!joinvc`)!");
        }

        if (!textToSay) {
            return message.reply("❌ Text bhi likho! Example: `!say Hello bhai`");
        }

        await playSpeechInVC(connection, textToSay, message.guild.id);
        return message.reply(`🗣️ VC me bol diya: "${textToSay}"`);
    }

    // BOT TAG CHECK FOR TEXT CHAT
    if (!message.mentions.has(client.user)) return;

    // 6. SECURITY BLOCK
    if (SECURITY_BLOCK_KEYWORDS.some(kw => contentLower.includes(kw))) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const isHighAuthority = message.member ? (
        message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) : false;
    const cleanPrompt = message.content.replace(/<@!?\d+>/g, '').trim();
    const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(cleanPrompt) && !cleanPrompt.includes('karo') && !cleanPrompt.includes('hai');
    const langContext = isEnglish ? "Reply STRICTLY in English." : "Reply STRICTLY in Roman Urdu / Hinglish with masculine tone.";

    // 7. QUICK LINKS CHECK
    if (contentLower.includes('link') || contentLower.includes('links')) {
        for (const item of LINKS_MAP) {
            if (item.keywords.some(kw => contentLower.includes(kw))) {
                const prefix = isHighAuthority ? "Hi Boss! Ye raha aapka link:" : "Abe oye, ye le link:";
                return message.reply(`${prefix}\n👉 ${item.link}`);
            }
        }
    }

    // 8. IMAGE ATTACHMENT SCANNER
    if (message.attachments.size > 0) {
        const image = message.attachments.first();
        if (image.contentType && image.contentType.startsWith('image/')) {
            await message.channel.sendTyping();
            const visionReply = await askVisionAI(cleanPrompt, image.url, langContext);
            return message.reply(visionReply);
        }
    }

    // 9. TEXT RESPONSE
    await message.channel.sendTyping();
    const reply = await askAI(cleanPrompt || "Hello", `User: ${message.author.username}, Lang: ${langContext}`);

    if (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('https://raw')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    return message.reply(reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply);
});

client.login(process.env.DISCORD_TOKEN);
