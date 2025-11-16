// bot.js
import { Bot } from "yolkbot/bot";
import {
  SpawnDispatch,
  SaveLoadoutDispatch,
  LookAtPosDispatch,
  MovementDispatch,
  FireDispatch
} from "yolkbot/dispatch";

import ReloadDispatch from "yolkbot/dispatches/ReloadDispatch";
import { Movement } from "yolkbot/constants";
import readline from "readline";

// Format game code
function formatGameCode(raw) {
  raw = raw.trim().toLowerCase();
  if (raw.includes("-")) return raw;
  if (raw.length === 12) return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  return raw;
}

// Prompt for game code
function askGameCode() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question("Enter your ShellShockers game code: ", (answer) => {
      rl.close();
      resolve(formatGameCode(answer));
    });
  });
}

// Prompt for gun ID (0-6)
function askGunId() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("Choose your gun by ID (0=eggk,1=scrambler,2=freeranger,3=rpegg,4=whipper,5=crackshot,6=trihard)");
    rl.question("Enter gun ID: ", (answer) => {
      rl.close();
      let gunId = parseInt(answer.trim());
      if (isNaN(gunId) || gunId < 0 || gunId > 6) gunId = 5; // default crackshot
      resolve(gunId);
    });
  });
}

// Check if enemy is visible via raycast
function canSeeEnemy(bot, enemy) {
  if (!bot.rayCast) return true; // fallback if API not ready

  // Use bot.rayCast(startPos, targetPos)
  const startPos = bot.me.position;
  const targetPos = enemy.position;

  const hit = bot.rayCast(startPos, targetPos); 
  // hit should return object with .id of whatever is hit
  return hit && hit.id === enemy.id;
}

export async function startBot(gameCode, gunId) {
  const bot = new Bot();

  if (!gameCode) gameCode = await askGameCode();
  if (gunId === undefined) gunId = await askGunId();

  console.log("Joining game:", gameCode);
  await bot.join("ShellBot-2", gameCode);

  let lastSpawnTime = 0;

  async function tryRespawn(bot) {
    const now = Date.now();
    if (now - lastSpawnTime < 6000) return;

    if (!bot.me.playing) {
      console.log("🔄 Respawning...");
      bot.dispatch(new SpawnDispatch());
      lastSpawnTime = Date.now();

      // Only change gun once after spawning
      setTimeout(() => {
        bot.dispatch(new SaveLoadoutDispatch({ gunId }));
      }, 100);
    }
  }

  bot.on("gameReady", () => {
    console.log("Game is ready!");
    tryRespawn(bot);
    bot.dispatch(new MovementDispatch([Movement.Forward]));

    const loop = () => {
      if (!bot.me.playing) {
        console.log("I died!");
        tryRespawn(bot);
        return;
      }

      const enemies = Object.values(bot.players)
        .filter(p => p.id !== bot.me.id && p.playing && p.team !== bot.me.team);

      if (enemies.length === 0) return;

      const me = bot.me.position;
      let nearest = null;
      let nearestDist = Infinity;

      for (const p of enemies) {
        const dx = p.position.x - me.x;
        const dy = p.position.y - me.y;
        const dz = p.position.z - me.z;
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = p;
        }

        if (p.dead && p.lastHealth && p.lastHealth > 0) {
          console.log(`I killed ${p.name}!`);
        }
        p.lastHealth = p.health;
      }

      if (!nearest) return;

      // Aim at nearest enemy
      bot.dispatch(new LookAtPosDispatch({
        x: nearest.position.x,
        y: nearest.position.y,
        z: nearest.position.z
      }));

      // Only fire if we can see the enemy
      if (canSeeEnemy(bot, nearest)) {
        bot.dispatch(new FireDispatch());
        bot.dispatch(new ReloadDispatch());
      }
    };

    setInterval(loop, 250);
  });

  bot.on("error", (err) => console.error("Bot error:", err));
}

if (process.argv[1].endsWith("bot.js")) {
  startBot().catch(err => console.error("Failed to start bot:", err));
}
