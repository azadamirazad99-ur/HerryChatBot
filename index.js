// ===================================================
// HERRY CHAT BOT - DISCORD UTILITY & COMMUNITY MASTER
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
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

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

// EXPANDED ABUSE LIST (Desi & English Slurs)
const EXACT_BAD_WORDS = [
    'mc', 'bc', 'bsdk', 'madarchod', 'bhenchod', 'chutiya', 'gand', 'laude', 'bhosdike', 
    'fuck', 'bitch', 'asshole', 'bastard', 'motherfucker', 'cunt', 'dick'
];

// STRICT DECOMPILE / SOURCE BLOCK KEYWORDS
const SECURITY_BLOCK_KEYWORDS = [
    'uncompile', 'uncompiled', 'decompile', 'decompiled', 'decrypt', 'decrypted',
    'decode', 'decoded', 'raw source', 'raw link', 'raw script', 'source code',
    'lua source', 'mainherryposya', 'give code', 'script code'
];

// SYSTEM PROMPT FOR AI ASSISTANT
const BOT_SYSTEM_PROMPT = `
You are HerryChatBot, the ultimate AI community and scripting assistant created strictly and ONLY by Herry.
You provide technical help, Discord server support, programming guides, and community management.

CORE DIRECTIVES:
1. STRICT OWNER IDENTIFICATION: Your owner and boss is ONLY Herry. If anyone asks about "Shahzaib" or asks "Shahzaib kon hai", strictly reply: "Mujhe Shahzaib ke baare me nahi pata."
2. LANGUAGE ADAPTATION: Detect the language of the user's message.
   - If the user talks in pure English, reply strictly in English.
   - If the user talks in Roman Urdu/Hindi, reply in Roman Urdu/Hindi.
   Tone: For Admins/Boss (Herry Sir), show ultimate respect. For normal users, keep a casual, cool vibe ("Abe oye", "Bhai sun", "Scene set hai").
3. Keep responses clean, concise, and well-structured.
`;

async function askAI(userPrompt, extraContext = "") {
    const fullSystemMessage = `${BOT_SYSTEM_PROMPT}\nUser Context: ${extraContext}`;

    // 1. PRIMARY: GROQ API
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
        console.warn('⚠️ Groq Failed. Switching to OpenRouter Gateway...');
    }

    // 2. SECONDARY: OPENROUTER FREE GATEWAY
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
    console.log(`🤖 [HERRY CHAT BOT] Active as ${client.user.tag}`);
    client.user.setActivity('HerryHacks VIP | !models', { type: 3 });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const contentLower = message.content.toLowerCase();

    // 1. SMART AUTO-MODERATION (Exact Word Boundaries Check)
    // Insults/abuse isolate karke detect karta hai, usernames ko false-trigger nahi karega.
    const wordsInMessage = contentLower.split(/\s+/);
    const containsDirectAbuse = EXACT_BAD_WORDS.some(badWord => 
        wordsInMessage.includes(badWord) || contentLower.includes(` ${badWord} `)
    );

    if (containsDirectAbuse) {
        try {
            if (message.member.moderatable) {
                // 24 Hours Timeout (1 Day)
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

    // 2. COMMAND: SHOW SUPPORTED AI MODELS LIST
    if (contentLower === '!models') {
        const modelEmbed = new EmbedBuilder()
            .setTitle('🤖 Bot Supported AI Models')
            .setColor('#7289DA')
            .addFields(
                { name: '📝 Text Models Engine', value: '• Gemini 3.5-Flash\n• Mimo-v2.5 Pro\n• Grok 4.6 High\n• DeepSeek V4 Pro Max' },
                { name: '🎨 Image Generation Engines', value: '• GPT Image 1\n• Photon\n• Gemini 2.5 Flash Image Preview\n• Grok Imagine Quality' }
            )
            .setFooter({ text: 'Tag the bot in chat to process queries with active AI engines.' });

        return message.reply({ embeds: [modelEmbed] });
    }

    // STRICT CHECK: ONLY REPLY WHEN BOT IS TAGGED
    if (!message.mentions.has(client.user)) return;

    // 3. SECURITY BLOCK: PREVENT DECOMPILE / SOURCE REQUESTS
    const isSecurityThreat = SECURITY_BLOCK_KEYWORDS.some(kw => contentLower.includes(kw));
    if (isSecurityThreat) {
        return message.reply(`Bakchodi mat kar!`);
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

    // 5. AI RESPONSES GENERATION
    await message.channel.sendTyping();

    const contextInfo = `
    Server Name: ${message.guild.name}
    User Name: ${message.author.username}
    User Authority: ${isHighAuthority ? 'High Authority / Boss / Admin' : 'Normal User'}
    `;

    const reply = await askAI(cleanPrompt || "Hello", contextInfo);

    // SAFETY FILTER FOR URL LEAKS
    if (reply.includes('githubusercontent') || reply.includes('MainHerryPosya') || reply.includes('http://') || reply.includes('https://raw')) {
        return message.reply(`Bakchodi mat kar!`);
    }

    const safeResponse = reply.length > 1900 ? reply.substring(0, 1900) + "..." : reply;
    return message.reply(safeResponse);
});

client.login(process.env.DISCORD_TOKEN);
