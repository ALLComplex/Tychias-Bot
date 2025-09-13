import dotenv from 'dotenv'
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { google } from 'googleapis';
dotenv.config()

const AUGURY_CAST_DC = 12;
const RED_WIS_MOD = 2;
const RED_TALENT_BONUS = 1;
const CRIT_FAIL = 1;
const CRIT_SUCCESS = 20;

const SUPPRESS_PINGS = true;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.SHEETS_CLIENT_EMAIL,
    private_key: process.env.SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  projectId: process.env.SHEETS_PROJECT_ID,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
    ],
});

client.once(Events.ClientReady, c => {
    console.log(`Tychias is Listening...`)
})

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    // Ignore bot reactions
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();       // ensure reaction is complete
    if (reaction.message.partial) await reaction.message.fetch(); // ensure message is complete

    // Cast Augury Handler
    if (
        // reaction.message.channel.id === process.env.TYCHIAS_AMA_CHANNEL_ID && 
        (reaction.emoji.id === process.env.CAST_AUGURY_EMOTE_ID ||
            reaction.emoji.name === process.env.CAST_AUGURY_EMOTE_ID
        ) &&
        process.env.AUGURY_CASTER_IDS.includes(user.id)
    ) {
        await handleAuguryCast(reaction, user);
    }

    // Write Response to Google Sheets
    if (
        process.env.MOD_PING_ID === user.id &&
        (reaction.emoji.name === process.env.AUGURY_WEAL_EMOJI_ID ||
            reaction.emoji.name === process.env.AUGURY_WOE_EMOJI_ID
        ) &&
        reaction.message.author?.id === process.env.ARDEN_VUL_BOT_ID &&
        (
            reaction.message.content.includes(`They cast Augury successfully!`) ||
            reaction.message.content.includes(`They crit succeeded!!`)
        )
    ) {
        await handleAuguryResponse(reaction, user);
    }
});

const handleAuguryCast = async (reaction, user) => {
    let castAttempt = Math.floor(Math.random() * 20) + 1;
    let content = `${user.username} cast Augury and rolled a ${castAttempt} + ${RED_WIS_MOD} + ${RED_TALENT_BONUS}!\n`;
    if (castAttempt === CRIT_FAIL) {
        content += `They crit failed and lost Augury!`
    } else if (castAttempt === CRIT_SUCCESS) {
        content += `They crit succeeded!! Ask a second question for FREE! ${!SUPPRESS_PINGS ? `<@${process.env.MOD_PING_ID}>` : ''}`
    } else if (castAttempt + RED_WIS_MOD + RED_TALENT_BONUS >= AUGURY_CAST_DC) {
        content += `They cast Augury successfully! Awaiting Tychias' response... ${!SUPPRESS_PINGS ? `<@${process.env.MOD_PING_ID}>` : ''}`
    } else {
        content += `They failed to cast Augury! They will stop reading the bones today...`
    }
    
    await reaction.message.channel.send({
        content: content,
        reply: {
            messageReference: reaction.message.id
        }
    });
}

const handleAuguryResponse = async (reaction, user) => {
    try {
        let augury_question = "";
        let augury_asker = ""
        let tychias_response = reaction.emoji.name === process.env.AUGURY_WEAL_EMOJI_ID ? "WEAL" : "WOE";
        let original_message_id = ""

        //Fetch original augury question
        if (reaction.message.reference) {
            try {
                const repliedMessage = await reaction.message.fetchReference();
                original_message_id = repliedMessage.id;
                augury_question = repliedMessage.content || "[No text content]";
                augury_asker = repliedMessage.author
                ? repliedMessage.author.username
                : "Unknown";
            } catch (err) {
                console.error("Could not fetch original reply message:", err);
            }
        }

        await reaction.message.channel.send({
            content: `Tychias responded with: ${tychias_response}`,
            reply: {
                messageReference: original_message_id
            }
        });

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.ARDEN_VUL_SHEET_ID,
            range: "Augury Log!A:D",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    [
                        new Date().toLocaleDateString(),
                        augury_asker,
                        augury_question,
                        tychias_response
                    ]
                ]
            }
        })
        console.log(`Logged augury response - ${augury_question} by ${augury_asker}. Response: ${tychias_response}`);
    } catch (err) {
        console.log("Error writing to augury log: ", err);
    }
}


client.login(process.env.DISCORD_TOKEN)
