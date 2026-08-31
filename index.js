// ===================================================
// HERRY CHAT BOT - DISCORD UTILITY & MULTIMODAL MASTER
// ===================================================

const { Client, GatewayIntentBits, Partials, PermissionsBitField, EmbedBuilder } = require('discord.js');
const Groq = require('groq-sdk');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// Initialize Groq API safely
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID || '1529467083962843186';

// DYNAMIC LINKS MAP (REQUIRES "LINK" WORD IN USER MESSAGE)
const LINKS_MAP = [
    { keywords: ['reversoqzz', 'reverso'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529524492450402506' },
    { keywords: ['lulubox'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527842097074206' },
    { keywords: ['devvir'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527533660405790' },
    { keywords: ['multispace', 'multi space'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1531705203487932597' },
    { keywords: ['herry.lua', 'posya', 'herry lua', 'posya lua', 'script', 'lua'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1542089775715057694' },
    { keywords: ['setup', 'where is setup', 'setup link', 'setup kaha se karu'], link: 'https://discord.com/channels/1529467083962843186/1529477486235226172' },
    { keywords: ['getkey', 'key', 'how to get key', 'where is key'], link: 'https://discord.com/channels/1529467083962843186/1541722634927214622' }
];

// EXPANDED ABUSE LIST (Exact Word Matching)
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

// BOT SYSTEM PROMPT
const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, the elite AI assistant created strictly and ONLY by Herry.
You provide technical help, code assistance, server guides, and general support.

CORE DIRECTIVES:
1. STRICT OWNER IDENTIFICATION: Your owner and boss is ONLY Herry. If anyone asks about "Shahzaib" or "Shahzaib kon hai", strictly reply: "Mujhe Shahzaib ke baare me nahi pata."
2. LANGUAGE ADAPTATION: Detect user's language (English or Roman Urdu/Hindi).
   - Reply in pure English if the user talks in English.
   - Reply in Roman Urdu/Hindi if the user talks in Roman Urdu/Hindi.
   Tone: Respectful for Admins/Herry Sir, casual and friendly for normal members.
3. IMAGE & VISION PROCESSING: You have active vision capabilities to view, read, and analyze images/documents provided by users.
`;

// AI TEXT QUERY HANDLER
async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${BOT_SYSTEM_PROMPT}\nUser Context: ${extraContext}`;

    // 1. PRIMARY: GROQ API
    if (groq) {
        try {
            const groqResponse = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: fullSystemMessage },
                    { role: 'user', content: userPrompt }
                ],
                model: 'llama-3.1-8b-instant',
                temperature: 0.7,
                max_tokens: 1200,
            });

            if (groqResponse.choices && groqResponse.choices[0]?.message?.content) {
                return groqResponse.choices[0].message.content;
            }
        } catch (groqErr) {
            console.warn('⚠️ Groq Primary Failed. Routing to OpenRouter Gateway...');
        }
    }

    // 2. SECONDARY: OPENROUTER GATEWAY (x-ai/grok-4-fast:free)
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
                model: 'x-ai/grok-4-fast:free',
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
        console.error('❌ OpenRouter Gateway Error:', openRouterErr);
    }

    return "Abe bhai/sir, network issue aa raha hai AI server se. Ek baar dubara message try karo!";
}

// AI VISION QUERY HANDLER (IMAGE SCANNER)
async function askVisionAI(userPrompt, imageUrl) {
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
                model: 'x-ai/grok-4-fast:free',
                messages: [
                    {
                        role: 'system',
                        content: BOT_SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt || 'Analyze and describe this image in detail.' },
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
        console.error('Vision API Error:', err);
    }
    return "❌ Image view/scan karne me network error aaya! Phir se send kar.";
}

// BOT EVENTS (UPDATED TO CLIENTREADY TO FIX WARNING)
client.once('clientReady', () => {
    console.log(`🤖 [HERRY CHAT BOT] Multimodal Master Active as ${client.user.tag}`);
    client.user.setActivity('HerryHacks Community | !models', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();

    // 1. SMART AUTO-MODERATION (Exact Bad Word Isolation Check)
    const wordsInMessage = contentLower.split(/\s+/);
    const containsDirectAbuse = EXACT_BAD_WORDS.some(badWord => 
        wordsInMessage.includes(badWord) || contentLower.includes(` ${badWord} `)
    );

    if (containsDirectAbuse) {
        try {
            if (message.member.moderatable) {
                const duration = 24 * 60 * 60 * 1000;
                await message.member.timeout(duration, 'Abusive Language / Slurs Detected');
                await message.reply(`⚠️ ${message.author} ko **Abuse** ki wajah se **24 Ghante (1 Day)** ka Timeout de diya gaya hai!`);
            } else {
                await message.reply(`Abe oye ${message.author}, tameez se baat kar! (Admin status enabled, cannot timeout).`);
            }
        } catch (err) {
            console.error("Timeout Execution Error:", err);
        }
        return;
    }

    // 2. COMMAND: SHOW ALL ACTIVE & NEW MODELS
    if (contentLower === '!models') {
        const modelEmbed = new EmbedBuilder()
            .setTitle('🤖 HerryChatBot - Active AI Engines & Vision Models')
            .setColor('#00FF7F')
            .addFields(
                { 
                    name: '🌐 OpenRouter Models (Vision & High Context)', 
                    value: '• **openrouter/free** (Auto Vision Router)\n• **google/gemma-4-31b-it:free** (262K Vision Context)\n• **minimax/minimax-m3:free** (1.0M Token Vision Window)\n• **x-ai/grok-4-fast:free** (Primary Multimodal Fast Engine)\n• **qwen/qwen2.5-vl-72b-instruct:free** (High OCR & Document Parser)' 
                },
                { 
                    name: '⚡ Groq LPU Models (Ultra Fast Speed)', 
                    value: '• **qwen/qwen3.8-27b** (Instant Vision - 3 Images/req)\n• **qwen/qwen3.6-27b** (Structural Analysis - 5 Images/req)\n• **meta-llama/llama-4-scout-17b-16e-instruct** (Fast Image Scan)\n• **llama-3.1-8b-instant** (Primary Ultra-Fast Text Engine)\n• **groq/compound** (Multi-step Reasoning Agent)' 
                }
            )
            .setFooter({ text: 'Tag the bot with a prompt or upload an image to use Vision AI.' });

        return message.reply({ embeds: [modelEmbed] });
    }

    // STRICT CHECK: ONLY REPLY WHEN BOT IS TAGGED
    if (!message.mentions.has(client.user)) return;

    // 3. SECURITY BLOCK
    const isSecurityThreat = SECURITY_BLOCK_KEYWORDS.some(kw => contentLower.includes(kw));
    if (isSecurityThreat) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const isHighAuthority = message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                            message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                            message.member.roles.cache.size > 3;

    const cleanPrompt = message.content.replace(/<@!?\d+>/g, '').trim();

    // 4. QUICK LINKS
    const hasLinkWord = contentLower.includes('link') || contentLower.includes('links');
    if (message.guild.id === MAIN_SERVER_ID && hasLinkWord) {
        for (const item of LINKS_MAP) {
            if (item.keywords.some(kw => contentLower.includes(kw))) {
                const prefixGreeting = isHighAuthority ? "Hi Herry Sir / Boss! Ye raha aapka required link:" : "Abe oye, ye le link:";
                return message.reply(`${prefixGreeting}\n👉 ${item.link}`);
            }
        }
    }

    // 5. IMAGE SCANNER CHECK
    if (message.attachments.size > 0) {
        const image = message.attachments.first();
        if (image.contentType && image.contentType.startsWith('image/')) {
            await message.channel.sendTyping();
            const visionResult = await askVisionAI(cleanPrompt, image.url);
            return message.reply(`🖼️ **Image Scan Result:**\n${visionResult}`);
        }
    }

    // 6. STANDARD AI TEXT RESPONSE
    await message.channel.sendTyping();

    const contextInfo = `
    Server Name: ${message.guild.name}
    User Name: ${message.author.username}
    User Authority: ${isHighAuthority ? 'High Authority / Boss / Admin' : 'Normal User'}
    `;

    const reply = await askAI(cleanPrompt || "Hello", contextInfo);

    if (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('http://') || reply.includes('https://raw')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const safeResponse = reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply;
    return message.reply(safeResponse);
});

client.login(process.env.DISCORD_TOKEN);
