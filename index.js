import dotenv from 'dotenv'
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
dotenv.config()

const AUGURY_CAST_DC = 12;
const RED_WIS_MOD = 2;
const RED_TALENT_BONUS = 1;
const CRIT_FAIL = 1;
const CRIT_SUCCESS = 20;

const SUPPRESS_PINGS = true;


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

    // Check channel, emote, and user
    if (
        // reaction.message.channel.id === process.env.TYCHIAS_AMA_CHANNEL_ID && 
        (reaction.emoji.id === process.env.CAST_AUGURY_EMOTE_ID ||
            reaction.emoji.name === process.env.CAST_AUGURY_EMOTE_ID
        ) &&
        process.env.AUGURY_CASTER_IDS.includes(user.id)
    ) {

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
});


client.login(process.env.DISCORD_TOKEN)
