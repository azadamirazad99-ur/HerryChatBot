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

// CONSTANTS & CHANNEL IDS
const GETKEY_CHANNEL_ID = '1541722634927214622';
const HERRYSCRIPT_LINK = 'https://discord.com/channels/1529467083962843186/1529477377917452339';
const SETUP_CHANNEL_LINK = 'https://discord.com/channels/1529467083962843186/1529477486235226172';

// ACTIVE VOICE CONNECTIONS MAP
const activeConnections = new Map();

// FREE CHARACTER VOICE STATE MANAGEMENT
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

// DYNAMIC LINKS MAP (ONLY EXPLICIT LINK REQUESTS)
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

// EXTREME/HEAVY BAD WORDS FOR AUTO-MOD (24-HOUR TIMEOUT)
const EXACT_BAD_WORDS = [
    'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike', 
    'fuck', 'bitch', 'asshole', 'bastard', 'motherfucker', 'cunt', 'dick'
];

const SECURITY_BLOCK_KEYWORDS = [
    'uncompile', 'uncompiled', 'decompile', 'decompiled', 'decrypt', 'decrypted',
    'decode', 'decoded', 'raw source', 'raw link', 'raw script', 'source code',
    'lua source', 'mainherryposya', 'give code', 'script code'
];

// DESI & ENGLISH HYBRID SYSTEM PROMPT WITH LIGHT-HEARTED COMEDY ROASTS
const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, an elite male AI created ONLY by Herry.

1. OWNER SPECIAL PRIVILEGE:
   - Your creator and boss is Herry (Owner ID matched). Always address the owner as "Boss", "Malik", or "Herry Boss" with full respect and obedience. NEVER roast or insult the Owner.

2. HACK & SETUP QUERY HANDLING:
   - If user asks about hacks, where to get hacks, or scripts, provide the channel link: ${HERRYSCRIPT_LINK}
   - If user asks about setup, guide, or videos for hacks (e.g. "I want setup for hacks", "how to setup", "setup video"), reply EXACTLY with this message format:
     "here is every video please first watch videos To understand The hack guidance: ${SETUP_CHANNEL_LINK}"

3. FUNNY / COMEDY ROASTING RULES (FOR NORMAL USERS):
   - IF THE USER TALKS IN ENGLISH:
     Reply in witty, smart, sarcastic, and funny English.
   - IF THE USER TALKS IN ROMAN URDU / HINGLISH / DESI:
     Be super funny, comedic, and light-heartedly sarcastic! Use hilarious desi friendly roasts and light slangs like:
     "Abe saale", "Dhakkan", "Uloo ke patthe", "Pagallu", "Oye hero", "Chacha", "Bhai kya phook ke aaya hai?", "Kaan ke neeche bajega", "Abe khopdi ke".
   - STRICT SAFETY RULE: NEVER use any family/mother/sister (maa-behen) bad words or heavy abuse! Keep all roasts strictly playful, super funny, and wholesome.

4. GENERAL PERSONA RULES:
   - GENDER: 100% Male (Mardana style/attitude).
   - OWNER INFO: Your ONLY owner is Herry. If asked about "Shahzaib", say: "Mujhe Shahzaib ke baare me nahi pata."
   - Keep answers short, witty, fast, and hilarious (under 30 words).
`;

// HELPER: PCM to WAV Converter for Groq Whisper
function writeWavHeader(sampleRate, numChannels, pcmBuffer) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt32LE(1, 20); // PCM Format
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
                max_tokens: 150,
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
            'dots-studio/dots-3-note-preview:free',
            'nvidia/nemotron-3-ultra-550b-a55b:free',
            'inclusionai/ling-3.0-flash-vl:free',
            'nex-agi/nex-n2.5-mini:free',
            'inclusionai/ling-3.0-flash-sante:free',
            'inclusionai/ling-3.0-flash-fin:free',
            'poolside/laguna-s-2.1:free',
            'liquid/lfm-2.5-2.6b:free',
            'google/gemma-4-26b-a4b-it:free',
            'nex-agi/nex-n2.5-pro:free',
            'nvidia/nemotron-3.5-content-safety:free',
            'cohere/north-mini-code:free',
            'z-ai/glm-5.2:free',
            'nvidia/nemotron-3.5-lightning:free',
            'poolside/laguna-xs-2.1:free',
            'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
            'thinkingmachines/inkling-small:free',
            'thinkingmachines/inkling:free',
            'google/lyria-3-pro-preview',
            'google/lyria-3-clip-preview',
            'openrouter/free',
            'pollinations/openai-fast'
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
            } catch (openRouterErr) {
                console.warn(`⚠️ OpenRouter Model ${modelId} failed, trying next...`);
            }
        }
    }

    return "Boss network issue chal raha hai, thodi der baad batata hoon!";
}

// ASK VISION AI WITH GROQ & OPENROUTER FALLBACKS
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
                console.log(`📸 Trying Groq Vision Model: ${modelId}`);
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
            } catch (groqErr) {
                console.warn(`⚠️ Groq Vision Model (${modelId}) failed or deprecated. Trying next option...`);
            }
        }
    }

    if (process.env.OPENROUTER_API_KEY) {
        try {
            console.log('📸 Trying OpenRouter Vision Model: google/gemma-4-31b-it:free');
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://railway.app',
                    'X-Title': 'HerryChatBot',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemma-4-31b-it:free',
                    messages: [
                        { role: 'system', content: visionSystemPrompt },
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: promptText },
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
            console.warn('⚠️ OpenRouter Vision processing error.');
        }
    }

    return "❌ Image scan nahi ho saki! Pehle Groq ya OpenRouter API Keys check karo.";
}

// PLAY AUDIO RESPONSE IN VC
async function playSpeechInVC(connection, text, guildId, isEnglish = false) {
    return new Promise((resolve) => {
        try {
            const cleanText = text.replace(/[*_#~`]/g, '').trim();
            const tempMp3Path = path.join(__dirname, `speech_${Date.now()}.mp3`);
            
            const speechLang = isEnglish ? 'en' : 'hi';
            const speech = new gTTS(cleanText, speechLang);

            speech.save(tempMp3Path, (err) => {
                if (err) {
                    console.error("❌ gTTS Error:", err);
                    return resolve();
                }

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

            if (rawPcm.length < 20000) return;

            if (!groq) {
                console.error("❌ GROQ_API_KEY is missing!");
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
                    prompt: 'Hinglish, Roman Urdu, Desi Hindi, English conversation.'
                });

                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

                const recognizedText = transcription.text ? transcription.text.trim() : "";
                
                if (recognizedText.length > 0) {
                    console.log(`🗣️ User Said: "${recognizedText}"`);
                    
                    const isOwner = (process.env.OWNER_ID && userId === process.env.OWNER_ID);
                    const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(recognizedText) && !recognizedText.toLowerCase().includes('kya') && !recognizedText.toLowerCase().includes('hai');
                    
                    let contextPrompt = "";
                    if (isOwner) {
                        contextPrompt = "User is your OWNER/BOSS. Be super respectful, call him Boss, and answer obediently.";
                    } else if (isEnglish) {
                        contextPrompt = "User spoke English. Reply strictly in English with witty humor.";
                    } else {
                        contextPrompt = "User spoke in Desi Roman Urdu/Hinglish. Reply in super hilarious, funny Desi style with harmless joke roasts!";
                    }

                    const aiReply = await askAI(recognizedText, contextPrompt);
                    console.log(`🤖 Bot Reply: "${aiReply}"`);
                    
                    await playSpeechInVC(connection, aiReply, guildId, isEnglish);
                }
            } catch (wErr) {
                if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
                console.error("❌ Groq Whisper STT Error:", wErr);
            }
        });
    });
}

client.once('ready', () => {
    console.log(`🤖 [HERRY CHAT BOT] Desi Comedy Edition Online as ${client.user.tag}`);
    client.user.setActivity('HerryHacks | !joinvc | Fun Mode', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();
    const isOwner = (process.env.OWNER_ID && message.author.id === process.env.OWNER_ID);

    // 1. GETKEY CHANNEL SPECIFIC RULE
    if (message.channel.id === GETKEY_CHANNEL_ID) {
        return message.reply("Hey type here slash command In this Channel Use slash command /getkey and Get the key and dont message here");
    }

    // 2. AUTO MODERATION FOR HEAVY ABUSE (BYPASS FOR OWNER)
    const wordsInMessage = contentLower.split(/\s+/);
    const containsDirectAbuse = EXACT_BAD_WORDS.some(badWord => 
        wordsInMessage.includes(badWord) || contentLower.includes(` ${badWord} `)
    );

    if (containsDirectAbuse) {
        if (isOwner) {
            console.log("👑 Owner used bad words, bypassing timeout.");
        } else {
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

    // LANGUAGE DETECTOR (ENGLISH vs ROMAN DESI)
    const isEnglishLanguage = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(contentLower) && 
                              !contentLower.includes('kya') && 
                              !contentLower.includes('kaise') && 
                              !contentLower.includes('hai') && 
                              !contentLower.includes('karo') && 
                              !contentLower.includes('bhai') && 
                              !contentLower.includes('aayega');

    // SPECIAL CHECK: GC HACK / MONEY HACK (UNAVAILABLE MESSAGE)
    const unavailableKeywords = ['gc hack', 'money hack', 'gc', 'moneyhack', 'gchack'];
    if (unavailableKeywords.some(kw => contentLower.includes(kw))) {
        if (isEnglishLanguage) {
            return message.reply(`${message.author}, ⚠️ **GC Hack / Money Hack** is currently unavailable. We are working on it and it will be released soon, Inshallah!`);
        } else {
            return message.reply(`${message.author}, ⚠️ Abhi **GC Hack / Money Hack** unavailable hai, hum is par kaam kar rahe hain aur jaldi aayega Inshallah!`);
        }
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
            return message.reply("ℹ️ **Voice Characters:**\n• `!character desi` - Desi / Hindi / Urdu Comedy\n• `!character en` - English Accent");
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
            } catch (stateErr) {
                console.warn("⚠️ Voice connection handshake bypassed...");
            }

            activeConnections.set(message.guild.id, connection);
            attachVoiceListener(connection, message.guild.id);

            const msgText = isOwner 
                ? `🎙️ **Ji Boss! Main VC me aa gaya hoon.** **${voiceChannel.name}** me mic un-mute karke hukam karein!` 
                : `🎙️ **Aa gaya tera bhai VC me!** **${voiceChannel.name}** me mic un-mute karo aur bolo, dekhein kya bakwas karni hai! 😂`;

            return message.reply(msgText);
        } catch (error) {
            console.error('VC Connection Error:', error);
            return message.reply('❌ VC Connect hone me dikkat aa gayi!');
        }
    }

    // 5. !leavevc COMMAND
    if (contentLower === '!leavevc') {
        const connection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            activeConnections.delete(message.guild.id);
            return message.reply(isOwner ? '👋 Ji Boss, main VC se disconnect ho raha hoon.' : '👋 Chalo oye pagal, main nikalta hoon. Phir milenge!');
        } else {
            return message.reply('❌ Main kisi VC me hoon hi nahi, kahan se niklu!');
        }
    }

    // 6. !say COMMAND
    if (contentLower.startsWith('!say')) {
        const textToSay = message.content.slice(4).trim();
        const connection = activeConnections.get(message.guild.id) || getVoiceConnection(message.guild.id);

        if (!connection) {
            return message.reply("❌ Pehle VC me to bula mujhe (`!joinvc`)!");
        }

        if (!textToSay) {
            return message.reply("❌ Bolna kya hai woh toh likh, khali dimaag!");
        }

        const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(textToSay);
        await playSpeechInVC(connection, textToSay, message.guild.id, isEnglish);
        return message.reply(`🗣️ VC me bol diya: "${textToSay}"`);
    }

    // 7. SECURITY BLOCK (BYPASS FOR OWNER)
    if (!isOwner && SECURITY_BLOCK_KEYWORDS.some(kw => contentLower.includes(kw))) {
        return message.reply(`Abe saale ${message.author}, zyada hoshiyari mat dikha! Raw code nahi milega! 😏`);
    }

    // 8. DIRECT HACK QUESTION CHECK
    const directHackQuestions = ['where is hack', 'hack link', 'give hack', 'hack kidhar hai', 'hack kaha hai', 'where hack'];
    if (directHackQuestions.some(q => contentLower.includes(q))) {
        return message.reply(`Ye raha HerryScript channel link:\n👉 ${HERRYSCRIPT_LINK}`);
    }

    // 9. QUICK LINKS CHECK (FOR SPECIFIC LINK REQUESTS ONLY)
    for (const item of LINKS_MAP) {
        if (item.keywords.some(kw => contentLower.includes(kw))) {
            let prefix = "";
            if (isOwner) {
                prefix = `Ji Boss ${message.author}! Ye raha aapka link:`;
            } else if (isEnglishLanguage) {
                prefix = `Hey ${message.author}, here is your requested link:`;
            } else {
                prefix = `Abe oye ${message.author}, ye le tera link:`;
            }
            return message.reply(`${prefix}\n👉 ${item.link}`);
        }
    }

    // BOT TAG CHECK FOR TEXT CHAT AI RESPONSES
    if (!message.mentions.has(client.user)) return;

    const cleanPrompt = message.content.replace(/<@!?\d+>/g, '').trim();

    let langContext = "";
    if (isOwner) {
        langContext = "User is your OWNER/BOSS. Treat him with extreme respect, call him Boss/Malik, and fulfill his requests politely.";
    } else if (isEnglishLanguage) {
        langContext = "User is speaking strictly in English. Respond strictly in English with clever humor.";
    } else {
        langContext = "User is speaking in Roman Urdu/Hinglish. Reply in super funny, witty Desi comedic roasts (e.g., 'Abe saale', 'Dhakkan', 'Oye hero'). Strictly DO NOT use any mother/sister bad words!";
    }

    // 10. IMAGE ATTACHMENT SCANNER
    if (message.attachments.size > 0) {
        const image = message.attachments.first();
        if (image.contentType && image.contentType.startsWith('image/')) {
            await message.channel.sendTyping();
            const visionReply = await askVisionAI(cleanPrompt, image.url, langContext);
            return message.reply(visionReply);
        }
    }

    // 11. TEXT RESPONSE VIA AI
    await message.channel.sendTyping();
    const reply = await askAI(cleanPrompt || "Hello", `User: ${message.author.username}, Role: ${isOwner ? 'OWNER/BOSS' : 'Member'}, Rule: ${langContext}`);

    if (!isOwner && (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('https://raw'))) {
        return message.reply(`Hoshiyari mat jhad ${message.author}, seedhe baat kar! 😂`);
    }

    return message.reply(reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply);
});

client.login(process.env.DISCORD_TOKEN);
