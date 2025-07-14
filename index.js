import dotenv from 'dotenv'
import { Client, Events, SlashCommandBuilder } from 'discord.js';
dotenv.config()



const client = new Client({
    intents: []
});

client.once(Events.ClientReady, c => {
    console.log(`Tychias is Listening...`)
})

client.login(process.env.DISCORD_TOKEN)
