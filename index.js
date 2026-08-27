// ===================================================
// HERRY CHAT BOT - SECURE SCRIPT PROTECTED
// ===================================================

const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
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

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const MAIN_SERVER_ID = process.env.MAIN_SERVER_ID || '1529467083962843186';

// ---------------------------------------------------
// DYNAMIC LINKS & KNOWLEDGE MAP
// ---------------------------------------------------
const LINKS_MAP = [
    { keywords: ['reversoqzz', 'reverso'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529524492450402506' },
    { keywords: ['lulubox'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527842097074206' },
    { keywords: ['devvir'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527533660405790' },
    { keywords: ['multispace', 'multi space'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1531705203487932597' },
    { keywords: ['herry.lua', 'posya', 'herry lua', 'posya lua', 'script link', 'script'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1542089775715057694' },
    { keywords: ['setup', 'how to play hack', 'where is setup', 'setup link', 'setup kaha se karu'], link: 'https://discord.com/channels/1529467083962843186/1529477486235226172' },
    { keywords: ['getkey', 'key', 'script key', 'how to get key', 'where is key', 'key tp execute'], link: 'https://discord.com/channels/1529467083962843186/1541722634927214622' }
];

// Abusive Words Filter for Auto-Mod Timeout
const BAD_WORDS = ['gali', 'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike'];

// PROTECTED SYSTEM PROMPT (NO RAW LINKS ALLOWED)
const GG_SYSTEM_PROMPT = `
You are HerryChatBot, the official smart AI assistant created by Herry.
You possess complete knowledge of Game Guardian (GG), Virtual spaces (Multispace/Reversoqzz/Lulubox), Lua Scripting, and execution steps.

STRICT SECURITY RULES:
1. NEVER output or share any raw GitHub URLs, raw .lua file links, or repository paths under any circumstances.
2. If users ask for script links, Posya loader, or execute keys, tell them to check the official Discord channels (#get-key or #script-links).
3. For High Authority/Admins: Be extremely respectful. Address them as "Herry Sir" or "Boss".
4. For normal users: Be friendly, casual, slight humor/bakchodi ("Abe oye", "Bhai sun"), but do NOT use explicit insults.
5. Provide simple step-by-step guidance in Roman Urdu/English mix.
`;

// ---------------------------------------------------
// HYPER-RELIABLE AI ENGINE
// ---------------------------------------------------
async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${GG_SYSTEM_PROMPT}\nUser Context: ${extraContext}`;

    // 1. PRIMARY: GROQ
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
    } catch (groqErr) {
        console.warn('⚠️ Groq Failed. Switching to OpenRouter Free Gateway...');
    }

    // 2. SECONDARY: OPENROUTER FREE ROUTER
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

    return "Abe bhai/sir, network issue aa raha hai AI server se. Ek baar dubara message try karo!";
}

// ---------------------------------------------------
// BOT EVENTS & LOGIC
// ---------------------------------------------------
client.once('ready', () => {
    console.log(`🤖 [HERRY CHAT BOT] Fully Online & Secure as ${client.user.tag}`);
    client.user.setActivity('HerryHacks VIP | Mention Me!', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();

    // 1. AUTO-MODERATION (ABUSE DETECTION)
    const containsAbuse = BAD_WORDS.some(word => contentLower.includes(word));
    if (containsAbuse) {
        try {
            if (message.member.moderatable) {
                const duration = 2 * 24 * 60 * 60 * 1000;
                await message.member.timeout(duration, 'Abuse / Gali Detection');
                await message.reply(`⚠️ ${message.author} ko **Abuse** ki wajah se **2 Din** ka Timeout de diya gaya hai!`);
            } else {
                await message.reply(`Abe oye ${message.author}, tameez se baat kar! (Admin status enabled, cannot timeout).`);
            }
        } catch (err) {
            console.error("Timeout Error:", err);
        }
        return;
    }

    // STRICT CHECK: ONLY REPLY WHEN BOT IS TAGGED
    if (!message.mentions.has(client.user)) return;

    // Authority Check
    const isHighAuthority = message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                            message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                            message.member.roles.cache.size > 3;

    // Clean user prompt
    const cleanPrompt = message.content.replace(/<@!?\d+>/g, '').trim();

    // 2. MAIN SERVER QUICK LINKS
    if (message.guild.id === MAIN_SERVER_ID) {
        for (const item of LINKS_MAP) {
            if (item.keywords.some(kw => contentLower.includes(kw))) {
                const prefixGreeting = isHighAuthority ? "Hi Herry Sir / Boss! Ye raha aapka required link:" : "Abe oye, ye le link:";
                return message.reply(`${prefixGreeting}\n👉 ${item.link}`);
            }
        }
    }

    // 3. AI RESPONSES
    await message.channel.sendTyping();

    const contextInfo = `
    Server Name: ${message.guild.name}
    User Name: ${message.author.username}
    User Authority: ${isHighAuthority ? 'High Authority / Boss / Admin' : 'Normal User'}
    `;

    const reply = await askAI(cleanPrompt || "Hello", contextInfo);
    const safeResponse = reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply;
    return message.reply(safeResponse);
});

// ---------------------------------------------------
// BOT LOGIN
// ---------------------------------------------------
client.login(process.env.DISCORD_TOKEN);
