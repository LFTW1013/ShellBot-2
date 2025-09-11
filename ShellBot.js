import Bot from 'yolkbot/bot';
import { SpawnDispatch, ChatDispatch } from 'yolkbot/dispatches';

// --- Bot config ---
const bot = new Bot();
const botName = "BOT_Shellbot01";
const gameCode = "INSERT GAME CODE HERE";

console.log("Bot instance created");
bot.join(botName, gameCode);
console.log(`Joining game as ${botName} in ${gameCode}...`);

// --- Game ready handler ---
bot.on("gameReady", () => {
  console.log("Game ready ✅");

  bot.dispatch(new SpawnDispatch());
  bot.dispatch(new ChatDispatch("ShellBot Activated"));
  console.log("SpawnDispatch & ChatDispatch sent");

  // --- Auto-move & shoot ---
  setInterval(() => {
    if (!bot.player) return;

    const x = Math.random();
    const y = Math.random();
    bot.move({ x, y });
    if (Math.random() > 0.7) bot.shoot();

    console.log(`Moved to (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }, 1000);
});

// --- Handle unknown packets silently ---
bot.on("packet", (pkt) => {
  try {
    bot.processPacket(pkt);
  } catch (e) {}
});
