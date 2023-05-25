import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import config from 'config';
import { ogg } from './ogg.js';
import { openai } from './openai.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function createUserSession() {
    return {
        session: {
            messages: [],
        },
        context: {},
    };
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.use(session());

bot.command('new', async (ctx) => {
    const { session, context } = createUserSession();
    ctx.session = session;
    ctx.context = context;

    // Сообщение о перезапуске бота
    const restartMessage = 'Бот перезапущен.';
    const donationText = 'Это не обязательно, но если вы хотите, можете поддержать развитие бота, а именно, помочь с арендой сервера и оплатой API GPT 3.5.\nTinkoff Bank: 2200 7007 2880 3668\nQiwi: +79624236480\n\nЖду ваше сообщение..'
    await ctx.reply(restartMessage);

    setTimeout(async () => {
        await ctx.reply(donationText);
    }, 4000)
});

bot.command('start', async (ctx) => {
    const { session, context } = createUserSession();
    ctx.session = session;
    ctx.context = context;

    // Приветственное сообщение
    const welcomeMessage = `Привет! Я первый голосовой чат GPT с искуственным интеллектом. Напиши свой вопрос или задание для меня в виде голосового сообщения или текстом!`;
    const donationText = 'Это не обязательно, но если вы хотите, можете поддержать развитие бота, а именно, помочь с арендой сервера и оплатой API GPT 3.5.\nTinkoff Bank: 2200 7007 2880 3668\nQiwi: +79624236480\n\nЖду ваше сообщение..'
    await ctx.reply(welcomeMessage);

    setTimeout(async () => {
        await ctx.reply(donationText);
    }, 4000)
});

bot.on(message('voice'), async (ctx) => {
    if (!ctx.session) {
        const { session, context } = createUserSession();
        ctx.session = session;
        ctx.context = context;
    }

    try {
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = String(ctx.message.from.id);
        const oggPath = await ogg.create(link.href, userId);
        const mp3Path = await ogg.toMp3(oggPath, userId);

        const text = await openai.transcription(mp3Path);
        await ctx.reply(`Ваш запрос: ${text}.`);

        ctx.session.messages.push({
            role: openai.roles.USER,
            content: text,
        });

       // await ctx.reply('Работаю над вашим вопросом...');

        const response = await openai.chat(ctx.session.messages, ctx.context);

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.content,
        });

        ctx.context = response.context;

        await ctx.reply(response.content);
    } catch (e) {
        console.log('ERROR while voice message', e.message);
        await ctx.reply('Бот приуныл, нажмите /new чтобы он вернулся к вам с новыми силами!');
    }
});

bot.on(message('text'), async (ctx) => {
    if (!ctx.session) {
        const { session, context } = createUserSession();
        ctx.session = session;
        ctx.context = context;
    }

    try {
        ctx.session.messages.push({
            role: openai.roles.USER,
            content: ctx.message.text,
        });

        await ctx.reply('Работаю над вашим вопросом...');

        const response = await openai.chat(ctx.session.messages, ctx.context);

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT,
            content: response.content,
        });

        ctx.context = response.context;

        await ctx.reply(response.content);
    } catch (e) {
        console.log('ERROR while text message', e.message);
        await ctx.reply('Бот приуныл, нажмите /new чтобы он вернулся к вам с новыми силами!');
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));