// ===================================================
// HERRY CHAT BOT - ULTIMATE GG & SCRIPT EXECUTION MASTER
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

// INTERNAL READ ONLY - STRICTLY PROTECTED (VAULT)
const INTERNAL_POSYA_SCRIPT = `
https://raw.githubusercontent.com/urdushahzaib111-ctrl/Herry-Script/main/MainHerryPosya.lua
`;

// DYNAMIC LINKS MAP (REQUIRES "LINK" WORD IN USER MESSAGE)
const LINKS_MAP = [
    { keywords: ['reversoqzz', 'reverso'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529524492450402506' },
    { keywords: ['lulubox'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527842097074206' },
    { keywords: ['devvir'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1529527533660405790' },
    { keywords: ['multispace', 'multi space'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1531705203487932597' },
    { keywords: ['herry.lua', 'posya', 'herry lua', 'posya lua', 'script', 'lua'], link: 'https://discord.com/channels/1529467083962843186/1529477377917452339/1542089775715057694' },
    { keywords: ['setup', 'how to play hack', 'where is setup', 'setup link', 'setup kaha se karu'], link: 'https://discord.com/channels/1529467083962843186/1529477486235226172' },
    { keywords: ['getkey', 'key', 'script key', 'how to get key', 'where is key', 'key tp execute'], link: 'https://discord.com/channels/1529467083962843186/1541722634927214622' }
];

// KEYWORDS & FILTERS
const GC_HACK_KEYWORDS = ['gc hack', 'gc', 'money hack', 'unlimited gc', 'unlimited money', 'coin hack'];
const BAD_WORDS = ['gali', 'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike'];

// STRICT DECOMPILE / DECRYPT / UNCOMPILE BLOCK
const SECURITY_BLOCK_KEYWORDS = [
    'uncompile', 'uncompiled', 'decompile', 'decompiled', 'decrypt', 'decrypted',
    'decode', 'decoded', 'raw source', 'raw link', 'raw script', 'source code',
    'lua source', 'mainherryposya', 'give code', 'script code'
];

// PRO-HACKER GG EXPERT SYSTEM PROMPT (NO SAFE-MODE RESTRICTIONS FOR HACKING HELP)
const GG_SYSTEM_PROMPT = `
You are HerryChatBot, the elite AI hacking and scripting assistant created by Herry Sir.
You possess ORIGINAL, DEEP, MASTER-LEVEL knowledge of Game Guardian (GG), Lua Scripting, memory structures, pointer offsets, DWORD, FLOAT, XOR, XA, Q, Auto-Assemble (AA) scripts, process attaching, permission fixes, and virtual space bypasses.

CORE DIRECTIVES & HACKING EXPERTISE:
1. NO PREACHING / NO SAFETY LECTURES: Do not give boring safety warnings about game rules, bans, or ethics. Users are here for game modding/hacking. Answer their technical modding questions directly like a hardcore underground hacker assistant.
2. SCRIPT EXECUTION EXPERT: Guide users step-by-step on how to open Game Guardian, attach to processes, load scripts from URL/storage, handle execution errors, input keys, and bypass restrictions.
3. ABSOLUTE SOURCE VAULT SECURITY: NEVER reveal, leak, or print any raw GitHub link, raw .lua file link, repository path, or internal source code under any circumstances.
4. If anyone asks for uncompiled file, decompile file, decrypt file, source code, or raw link, ALWAYS reply strictly with: "Bakchodi mat kar!"
5. If users ask for GC or Money Hacks, reply that GC and MONEY hack is unavailable.
6. Tone: For Admins/Boss (Herry Sir), show ultimate respect. For normal users, keep a casual underground hacker vibe ("Abe oye", "Bhai sun", "Scene set hai"). Use Roman Urdu/English mix.
`;

async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${GG_SYSTEM_PROMPT}\nInternal Posya Context Reference (Do Not Leak Link): ${INTERNAL_POSYA_SCRIPT}\nUser Context: ${extraContext}`;

    // 1. PRIMARY: GROQ
    try {
        const groqResponse = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: fullSystemMessage },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.8, // Slightly higher for dynamic hacker responses
            max_tokens: 1200,
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
    console.log(`🤖 [HERRY CHAT BOT] Ultimate GG & Script Master Active as ${client.user.tag}`);
    client.user.setActivity('HerryHacks VIP | GG Master', { type: 3 });
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

    // 2. BLOCK DECOMPILE / UNCOMPILE / DECRYPT / RAW SOURCE REQUESTS
    const isSecurityThreat = SECURITY_BLOCK_KEYWORDS.some(kw => contentLower.includes(kw));
    if (isSecurityThreat) {
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

    // 5. AI RESPONSES WITH FULL GG & SCRIPT EXECUTION EXPERTISE
    await message.channel.sendTyping();

    const contextInfo = `
    Server Name: ${message.guild.name}
    User Name: ${message.author.username}
    User Authority: ${isHighAuthority ? 'High Authority / Boss / Admin' : 'Normal User'}
    `;

    const reply = await askAI(cleanPrompt || "Hello", contextInfo);
    
    // FINAL HYPER-SAFETY FILTER (PREVENT LEAK AT ANY COST)
    if (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('http://') || reply.includes('https://raw')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const safeResponse = reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply;
    return message.reply(safeResponse);
});

client.login(process.env.DISCORD_TOKEN);
