import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from './openai.js'


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())

bot.command('new', async (ctx) => {
    ctx.session = INITIAL_SESSION
})

bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION

})

bot.on(message('voice'), async (ctx) => {
    if (!ctx.session) {
        INITIAL_SESSION
    }

    try {
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const userId = String(ctx.message.from.id)
        const oggPath = await ogg.create(link.href, userId)
        const mp3Path = await ogg.toMp3(oggPath, userId)

        const text = await openai.transcription(mp3Path)

        ctx.session.messages.push({
            role: openai.roles.USER,
            content: text
        })

        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.content
        })

        await ctx.reply(response.content)
    } catch (e) {
        console.log('ERROR while voice message', e.message)
    }
})

bot.on(message('text'), async (ctx) => {
    if (!ctx.session) {
        INITIAL_SESSION
    }

    try {
        ctx.session.messages.push({
            role: openai.roles.USER,
            content: ctx.message.text
        })

        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.content
        })

        await ctx.reply(response.content)
    } catch (e) {
        console.log('ERROR while text message', e.message)
    }
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))