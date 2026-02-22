export default () => ({
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    allowedChatIds: (process.env.ALLOWED_CHAT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  },
  claude: {
    defaultProjectPath: process.env.DEFAULT_PROJECT_PATH || '/Users/kimbab/Desktop',
  },
});
