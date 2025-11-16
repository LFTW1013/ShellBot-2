#!/usr/bin/env node
import { startBot } from "./bot.js";

startBot().catch(err => console.error("Failed to start bot:", err));
