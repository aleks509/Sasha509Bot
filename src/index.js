// src/index.js
require("dotenv").config();
const { Telegraf } = require("telegraf");
const { Configuration, OpenAIApi } = require("openai");
const axios = require("axios");

// Инициализация
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// Команда /start
bot.start((ctx) =>
  ctx.reply("Привет! Отправь мне текст или фото с кодом, я отвечу.")
);

// Обработка текста
bot.on("text", async (ctx) => {
  const userText = ctx.message.text;
  await ctx.replyWithChatAction("typing");
  const resp = await openai.createChatCompletion({
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    messages: [{ role: "user", content: userText }],
    max_tokens: 1500,
    temperature: 0.7,
  });
  ctx.reply(resp.data.choices[0].message.content.trim());
});

// Обработка фото
bot.on("photo", async (ctx) => {
  await ctx.replyWithChatAction("upload_photo");
  // Получаем ссылку на файл
  const fileId = ctx.message.photo.slice(-1)[0].file_id;
  const link = await ctx.telegram.getFileLink(fileId);
  // Скачиваем и кодируем в base64
  const imgResp = await axios.get(link.href, { responseType: "arraybuffer" });
  const b64 = Buffer.from(imgResp.data).toString("base64");
  // Формируем сообщение для GPT-4
  const blocks = [
    {
      type: "text",
      text: ctx.message.caption || "Пожалуйста, проанализируй этот код.",
    },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
  ];
  const resp = await openai.createChatCompletion({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [{ role: "user", content: blocks }],
    max_tokens: 1500,
    temperature: 0.2,
  });
  ctx.reply(resp.data.choices[0].message.content.trim());
});

// Обработчик ошибок
bot.catch((err) => console.error("Ошибка бота:", err));

// Запуск
bot.launch().then(() => console.log("Bot started"));
