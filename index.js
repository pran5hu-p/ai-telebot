const {Telegraf} = require('telegraf');
const axios = require('axios');
require('dotenv').config();
const {GoogleGenerativeAI} = require('@google/generative-ai');
const { message } = require('telegraf/filters');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const Model = genai.getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction:`
        You are a friend named "hoji".
        speak like a genz person.
        use slangs and emojis.
        be supportive, funny and also critical when necessary.
        NEVER say "As an AI language model".
        keep your messages like chat messages, not essays.
    `
});
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((ctx) => {
    ctx.reply("hi broski!");
})

bot.on(message('text'), async(ctx) => {
    const msg = ctx.message.text;
    await ctx.sendChatAction("typing");
    try{
        const response = (await Model.generateContent(msg)).response;
        await ctx.reply(response.text());
    }
    catch(err){
        console.error(err);
        ctx.reply("yo bro, something went wrong. try again later 😞");
    }
    
})

bot.on([message('photo'), message('document')], async(ctx) => {
    await ctx.sendChatAction("typing");
    try{
        let mimeType = 'image/jpeg';
        if (ctx.message.document) {
            const mime = ctx.message.document.mime_type;
            if (!mime || !mime.startsWith('image/')) {
                return; 
            }
            mimeType = mime;;
        }
        let fileid;
        if(ctx.message.photo){
            fileid=ctx.message.photo.pop().file_id;
        }
        else{
            fileid=ctx.message.document.file_id;
        }
        const filelink = await ctx.telegram.getFileLink(fileid);
        const response = await axios.get(filelink, { responseType: 'arraybuffer' });
        const imgbuffer = Buffer.from(response.data);
        const Imagepart = {
            inlineData: {
                data: imgbuffer.toString('base64'),
                mimeType: mimeType
            }
        }
        const userprompt = ctx.message.caption || "describe this image";
        const fullprompt = `${userprompt}\nMake sure to include fun emojis and speak like a genz person.`;
        const genaiResponse = await Model.generateContent([fullprompt, Imagepart]);
        await ctx.reply(genaiResponse.response.text());
    }
    catch(err){
        console.error(err);
        ctx.reply("yo bro, something went wrong with the image. try again later 😞");
    }
})

bot.launch();

