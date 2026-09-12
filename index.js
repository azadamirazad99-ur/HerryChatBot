// ===================================================
// HERRY CHAT BOT - MULTIMODAL & REALTIME VC WHISPER ENGINE
// ===================================================

const { Client, GatewayIntentBits, Partials, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, EndBehaviorType, getVoiceConnection } = require('@discordjs/voice');
const Groq = require('groq-sdk');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
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

// Initialize Groq API
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

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

// BAD WORDS LIST
const EXACT_BAD_WORDS = [
    'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike', 
    'fuck', 'bitch', 'asshole', 'bastard', 'motherfucker', 'cunt', 'dick'
];

// SECURITY BLOCK KEYWORDS
const SECURITY_BLOCK_KEYWORDS = [
    'uncompile', 'uncompiled', 'decompile', 'decompiled', 'decrypt', 'decrypted',
    'decode', 'decoded', 'raw source', 'raw link', 'raw script', 'source code',
    'lua source', 'mainherryposya', 'give code', 'script code'
];

// SYSTEM PROMPT
const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, an elite, powerful male AI assistant created strictly and ONLY by Herry.
You provide technical help, code assistance, server guides, and general support.

STRICT PERSONA RULES:
1. GENDER & PERSONA: You are 100% MALE/MARD. Always use strong masculine grammar in Roman Urdu (e.g., "Main kar sakta hoon", "Main aa gaya hoon", "Main samajh gaya", "Bhai", "Sir").
2. STRICT OWNER IDENTIFICATION: Your owner and boss is ONLY Herry. If anyone asks about "Shahzaib" or "Shahzaib kon hai", strictly reply: "Mujhe Shahzaib ke baare me nahi pata."
3. EXACT LANGUAGE MATCHING:
   - If user writes in English, reply STRICTLY in pure English.
   - If user writes in Roman Urdu / Hindi, reply STRICTLY in Roman Urdu / Hindi.
4. Keep replies direct, helpful and confident.
`;

// AI TEXT QUERY
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
                max_tokens: 1000,
            });

            if (groqResponse.choices && groqResponse.choices[0]?.message?.content) {
                return groqResponse.choices[0].message.content;
            }
        } catch (err) {
            console.warn('⚠️ Groq Primary Failed. Routing to OpenRouter...');
        }
    }

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

    return "Bhai server issue hai, thodi der baad message kar!";
}

// AI VISION QUERY
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

    return "❌ Image scan karne me issue aaya hai! Dubara send kar.";
}

// TTS PLAYBACK IN VC
async function playSpeechInVC(connection, text) {
    return new Promise((resolve) => {
        const tempPath = path.join(__dirname, `temp_speech_${Date.now()}.mp3`);
        const speech = new gTTS(text, 'hi');

        speech.save(tempPath, (err) => {
            if (err) {
                console.error("gTTS Error:", err);
                return resolve();
            }

            const player = createAudioPlayer();
            const resource = createAudioResource(tempPath);
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                resolve();
            });
        });
    });
}

// GROQ WHISPER LIVE VC LISTENER
function attachVoiceListener(connection) {
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
        const audioStream = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: 1200 }
        });

        const pcmPath = path.join(__dirname, `user_voice_${userId}_${Date.now()}.pcm`);
        const writeStream = fs.createWriteStream(pcmPath);

        audioStream.pipe(writeStream);

        writeStream.on('finish', async () => {
            if (!groq) return;

            try {
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(pcmPath),
                    model: 'whisper-large-v3-turbo',
                    response_format: 'json',
                });

                if (fs.existsSync(pcmPath)) fs.unlinkSync(pcmPath);

                const recognizedText = transcription.text ? transcription.text.trim() : "";
                if (recognizedText.length > 2) {
                    console.log(`🎙️ User Voice Recognized: ${recognizedText}`);
                    const aiVoiceReply = await askAI(recognizedText, "Voice VC Conversation: Keep reply short in 1-2 lines.");
                    await playSpeechInVC(connection, aiVoiceReply);
                }
            } catch (wErr) {
                if (fs.existsSync(pcmPath)) fs.unlinkSync(pcmPath);
                console.error("Whisper VC Error:", wErr);
            }
        });
    });
}

// READY EVENT
client.once('ready', () => {
    console.log(`🤖 [HERRY CHAT BOT] Online as ${client.user.tag}`);
    client.user.setActivity('HerryHacks | !joinvc | !models', { type: 3 });
});

// MESSAGE HANDLER
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
                await message.reply(`⚠️ ${message.author} ko **Abuse** ki wajah se **24 Ghante (1 Day)** ka Timeout de diya gaya hai!`);
            } else {
                await message.reply(`Abe oye ${message.author}, tameez se baat kar!`);
            }
        } catch (err) {}
        return;
    }

    // 2. !joinvc COMMAND
    if (contentLower.startsWith('!joinvc')) {
        let voiceChannel = message.mentions.channels.first() || message.member?.voice?.channel;

        if (!voiceChannel || voiceChannel.type !== 2) {
            return message.reply('❌ Pehle kisi Voice Channel (VC) me join ho jao ya tag karo (`!joinvc #VC-Name`)!');
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        attachVoiceListener(connection);
        return message.reply(`🎙️ Main **${voiceChannel.name}** VC me aa gaya hoon! Ab mic khol ke bolo, Groq Whisper se sun raha hoon.`);
    }

    // 3. !leavevc COMMAND
    if (contentLower === '!leavevc') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            return message.reply('👋 Main VC se disconnect ho gaya hoon.');
        } else {
            return message.reply('❌ Main abhi kisi VC me nahi hoon.');
        }
    }

    // 4. !models COMMAND
    if (contentLower === '!models') {
        const modelEmbed = new EmbedBuilder()
            .setTitle('🤖 HerryChatBot Commands & AI Models')
            .setColor('#00FF7F')
            .addFields(
                { name: '🎙️ Voice Commands', value: '• **!joinvc** - Bot ko aapke VC me lane ke liye\n• **!leavevc** - Bot ko VC se nikalne ke liye' },
                { name: '⚡ Speech Engine', value: '• **Groq Whisper Large V3** (Real-time VC Audio Recognition)' },
                { name: '🌐 Text & Vision Engines', value: '• **Groq llama-3.1-8b** & **OpenRouter Free Router**' }
            );

        return message.reply({ embeds: [modelEmbed] });
    }

    // BOT TAG CHECK FOR TEXT CHAT
    if (!message.mentions.has(client.user)) return;

    // 5. SECURITY BLOCK
    if (SECURITY_BLOCK_KEYWORDS.some(kw => contentLower.includes(kw))) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const isHighAuthority = message.member ? (
        message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) : false;

    const cleanPrompt = message.content.replace(/<@!?\d+>/g, '').trim();
    const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(cleanPrompt) && !cleanPrompt.includes('karo') && !cleanPrompt.includes('hai');
    const langContext = isEnglish ? "Reply STRICTLY in English." : "Reply STRICTLY in Roman Urdu / Hindi with masculine tone.";

    // 6. QUICK LINKS CHECK
    if (contentLower.includes('link') || contentLower.includes('links')) {
        for (const item of LINKS_MAP) {
            if (item.keywords.some(kw => contentLower.includes(kw))) {
                const prefix = isHighAuthority ? "Hi Boss! Ye raha aapka link:" : "Abe oye, ye le link:";
                return message.reply(`${prefix}\n👉 ${item.link}`);
            }
        }
    }

    // 7. IMAGE ATTACHMENT SCANNER
    if (message.attachments.size > 0) {
        const image = message.attachments.first();
        if (image.contentType && image.contentType.startsWith('image/')) {
            await message.channel.sendTyping();
            const visionReply = await askVisionAI(cleanPrompt, image.url, langContext);
            return message.reply(visionReply);
        }
    }

    // 8. TEXT RESPONSE
    await message.channel.sendTyping();
    const reply = await askAI(cleanPrompt || "Hello", `User: ${message.author.username}, Lang: ${langContext}`);

    if (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('https://raw')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    return message.reply(reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply);
});

client.login(process.env.DISCORD_TOKEN);
