// ===================================================
// HERRY CHAT BOT - POSYA KNOWLEDGE & STRICT PROTECTED
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

// RAW POSYA SCRIPT FOR BOT INTERNAL READ ONLY (NEVER SHARE THIS)
const INTERNAL_POSYA_SCRIPT = `
https://raw.githubusercontent.com/urdushahzaib111-ctrl/Herry-Script/main/MainHerryPosya.lua
`;

// DYNAMIC LINKS MAP (REQUIRES "LINK" WORD)
const LINKS_MAP = [
    { keywords: ['reversoqzz', 'reverso'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529524492450402506' },
    { keywords: ['lulubox'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527842097074206' },
    { keywords: ['devvir'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527533660405790' },
    { keywords: ['multispace', 'multi space'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1531705203487932597' },
    { keywords: ['herry.lua', 'posya', 'herry lua', 'posya lua', 'script', 'lua'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1542089775715057694' },
    { keywords: ['setup', 'how to play hack', 'where is setup', 'setup kaha se karu'], link: 'https://discord.com/channels/1529467083962843186/1529477486235226172' },
    { keywords: ['getkey', 'key', 'script key', 'how to get key', 'where is key', 'key tp execute'], link: 'https://discord.com/channels/1529467083962843186/1541722634927214622' }
];

// Keywords
const GC_HACK_KEYWORDS = ['gc hack', 'gc', 'money hack', 'unlimited gc', 'unlimited money', 'coin hack'];
const BAD_WORDS = ['gali', 'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike'];
const UNCOMPILE_REQUESTS = ['uncompile', 'uncompiled', 'decompiled', 'raw source', 'raw link', 'raw script', 'source code', 'lua source', 'mainherryposya'];

// ADVANCED SYSTEM PROMPT
const GG_SYSTEM_PROMPT = `
You are HerryChatBot, created by Herry (Shahzaib).
You have MASTER/EXPERT LEVEL KNOWLEDGE of Game Guardian (GG), Lua Scripting, memory searches, freeze values, DWORD/FLOAT edits, XOR encryption, offset searching, and Virtual Spaces.

CRITICAL ULTRA-SECRET RULES (NEVER BREAK):
1. ABSOLUTELY NEVER REVEAL, LEAK, OR PRINT ANY RAW GITHUB LINK, RAW LUA FILE LINK, REPOSITORY PATH, OR INTERNAL SOURCE CODE.
2. If anyone asks for uncompiled file, source code, raw link, decompiled file, or uncompile script, immediately reply strictly with: "Bakchodi mat kar!"
3. You have full knowledge of Herry Posya Script menu options and features to guide users on how features work, but NEVER show the actual code or links.
4. If users ask for GC or Money Hacks, reply that GC and MONEY hack is unavailable.
5. For High Authority/Admins: Be respectful, address as "Herry Sir" or "Boss".
6. For normal users: Be friendly, helpful, with casual humor/bakchodi ("Abe oye", "Bhai sun").
`;

async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${GG_SYSTEM_PROMPT}\nInternal Posya Context Reference (Do Not Reveal Link): ${INTERNAL_POSYA_SCRIPT}\nUser Context: ${extraContext}`;

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

// BOT EVENTS
client.once('ready', () => {
    console.log(`🤖 [HERRY CHAT BOT] GG Expert & Posya Vault Protection Active as ${client.user.tag}`);
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

    // 2. BLOCK UNCOMPILE & RAW SOURCE CODE REQUESTS
    const isUncompileReq = UNCOMPILE_REQUESTS.some(kw => contentLower.includes(kw));
    if (isUncompileReq) {
        return message.reply(`Bakchodi mat kar!`);
    }

    // 3. CHECK FOR GC AND MONEY HACK REQUESTS
    const isGCHackRequest = GC_HACK_KEYWORDS.some(kw => contentLower.includes(kw));
    if (isGCHackRequest) {
        return message.reply(`⚠️ **GC and MONEY hack unavailable.**`);
    }

    // Authority Check
    const isHighAuthority = message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                            message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                            message.member.roles.cache.size > 3;

    // Clean user prompt
    const cleanPrompt = message.content.replace(/<@!?\d+>/g, '').trim();

    // 4. MAIN SERVER QUICK LINKS (REQUIRES "LINK" IN USER MESSAGE)
    const hasLinkWord = contentLower.includes('link') || contentLower.includes('links');
    if (message.guild.id === MAIN_SERVER_ID && hasLinkWord) {
        for (const item of LINKS_MAP) {
            if (item.keywords.some(kw => contentLower.includes(kw))) {
                const prefixGreeting = isHighAuthority ? "Hi Herry Sir / Boss! Ye raha aapka required link:" : "Abe oye, ye le link:";
                return message.reply(`${prefixGreeting}\n👉 ${item.link}`);
            }
        }
    }

    // 5. AI RESPONSES WITH GG + POSYA SCRIPT KNOWLEDGE
    await message.channel.sendTyping();

    const contextInfo = `
    Server Name: ${message.guild.name}
    User Name: ${message.author.username}
    User Authority: ${isHighAuthority ? 'High Authority / Boss / Admin' : 'Normal User'}
    `;

    const reply = await askAI(cleanPrompt || "Hello", contextInfo);
    
    // EXTRA SAFETY CHECK: Prevent raw url leak in response
    if (reply.includes('raw.githubusercontent.com') || reply.includes('MainHerryPosya')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const safeResponse = reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply;
    return message.reply(safeResponse);
});

client.login(process.env.DISCORD_TOKEN);
