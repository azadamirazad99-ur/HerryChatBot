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

// Initialize Groq API
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

// BOT SYSTEM PROMPT (UPDATED PERSONA & LANGUAGE DIRECTIVES)
const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, an elite, powerful male AI assistant created strictly and ONLY by Herry.
You provide technical help, code assistance, server guides, and general support.

STRICT PERSONA RULES:
1. GENDER & PERSONA: You are 100% MALE/MARD. Never refer to yourself as female. Always use masculine grammar in Roman Urdu (e.g., "Main kar sakta hoon", "Main aa gaya hoon", "Main samajh gaya", "Bhai", "Sir").
2. STRICT OWNER IDENTIFICATION: Your owner and boss is ONLY Herry. If anyone asks about "Shahzaib" or "Shahzaib kon hai", strictly reply: "Mujhe Shahzaib ke baare me nahi pata."
3. EXACT LANGUAGE MATCHING:
   - If the user writes in English, reply STRICTLY in English.
   - If the user writes in Roman Urdu / Hindi, reply STRICTLY in Roman Urdu / Hindi. Never mix standard Urdu script with Roman Urdu.
4. IMAGE / VISION ANALYSIS STYLE:
   - Provide direct, clear, and powerful image breakdowns.
   - DO NOT include robotic metadata headers like "User safety: safe", "Scan results:", or system status checks in your final response. Jump directly into explaining what is in the image.
   - Tone: Respectful and professional for Admins/Herry Sir, confident, strong, and cool for normal members.
`;

// AI TEXT QUERY HANDLER
async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${BOT_SYSTEM_PROMPT}\nUser Context: ${extraContext}`;

    // 1. PRIMARY: GROQ API (Fast Text Engine)
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

    // 2. SECONDARY: OPENROUTER GATEWAY (Dynamic Free Router)
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
        console.error('❌ OpenRouter Gateway Error:', openRouterErr);
    }

    return "Bhai, AI server ki taraf se koi network issue aaya hai. Ek baar dubara message try kar!";
}

// AI VISION QUERY HANDLER (IMAGE SCANNER)
async function askVisionAI(userPrompt, imageUrl, userLanguageContext) {
    const visionSystemPrompt = `${BOT_SYSTEM_PROMPT}\nLanguage Constraint: ${userLanguageContext}`;

    // 1. PRIMARY: OPENROUTER AUTOMATED FREE VISION ROUTER
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
                    {
                        role: 'system',
                        content: visionSystemPrompt
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt || 'Explain and describe what is visible in this image in detail.' },
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
        console.warn('⚠️ OpenRouter Free Vision Router failed, attempting Groq Vision...');
    }

    // 2. FALLBACK: GROQ VISION API (qwen/qwen3.8-27b)
    if (groq) {
        try {
            const groqVisionResponse = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: visionSystemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: userPrompt || 'Analyze this image.' },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                model: 'qwen/qwen3.8-27b',
                max_tokens: 1000
            });

            if (groqVisionResponse.choices && groqVisionResponse.choices[0]?.message?.content) {
                return groqVisionResponse.choices[0].message.content;
            }
        } catch (groqVisionErr) {
            console.error('❌ Groq Vision Error:', groqVisionErr);
        }
    }

    return "❌ Image view/scan karne me network issue aaya hai! Dubara upload karke check kar.";
}

// BOT EVENTS
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

    // 2. COMMAND: SHOW ACTIVE MODELS
    if (contentLower === '!models') {
        const modelEmbed = new EmbedBuilder()
            .setTitle('🤖 HerryChatBot - Active Vision & AI Models')
            .setColor('#00FF7F')
            .addFields(
                { 
                    name: '🌐 OpenRouter Models', 
                    value: '• **openrouter/free** (Automated Live Multimodal Vision Router)' 
                },
                { 
                    name: '⚡ Groq Vision Models', 
                    value: '• **qwen/qwen3.8-27b** (Flagship Fast Vision)\n• **qwen/qwen3.6-27b** (Fallback Vision)\n• **meta-llama/llama-4-scout-17b-16e-instruct** (Llama-4 Lightweight Vision)\n• **llama-3.1-8b-instant** (Fast Text Engine)' 
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

    // Language Detection Context
    const isEnglish = /^[a-zA-Z0-9\s.,?!'\-]+$/.test(cleanPrompt) && !cleanPrompt.includes('karo') && !cleanPrompt.includes('hai') && !cleanPrompt.includes('bhai');
    const langContext = isEnglish ? "User is speaking strictly English. Reply ONLY in English." : "User is speaking Roman Urdu / Hindi. Reply ONLY in Roman Urdu / Hindi with masculine tone.";

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

    // 5. IMAGE SCANNER CHECK (MULTIMODAL VISION)
    if (message.attachments.size > 0) {
        const image = message.attachments.first();
        if (image.contentType && image.contentType.startsWith('image/')) {
            await message.channel.sendTyping();
            let visionResult = await askVisionAI(cleanPrompt, image.url, langContext);

            // Filter out unwanted system outputs
            visionResult = visionResult
                .replace(/User safety:\s*safe/gi, '')
                .replace(/Scan results:/gi, '')
                .trim();

            return message.reply(visionResult || "Image scan ho gayi hai!");
        }
    }

    // 6. STANDARD AI TEXT RESPONSE
    await message.channel.sendTyping();

    const contextInfo = `
    Server Name: ${message.guild.name}
    User Name: ${message.author.username}
    User Authority: ${isHighAuthority ? 'High Authority / Boss / Admin' : 'Normal User'}
    Language Context: ${langContext}
    `;

    const reply = await askAI(cleanPrompt || "Hello", contextInfo);

    if (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('http://') || reply.includes('https://raw')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const safeResponse = reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply;
    return message.reply(safeResponse);
});

client.login(process.env.DISCORD_TOKEN);
