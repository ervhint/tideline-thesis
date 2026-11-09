// Sends one Telegram message (U8, FR-17; T6k, docs/PLAN.md §6i). Without the bot token and the chat it only prints the text and exits 0.
// Usage: node pipeline/telegram.mjs <message file>            to the human's private chat (TELEGRAM_CHAT_ID)
//        node pipeline/telegram.mjs --channel <message file>  to the public channel (TELEGRAM_CHANNEL_ID; the workflows pass it
//                                                             only while the repo variable TELEGRAM_PUBLIC is on)
//        node pipeline/telegram.mjs --failed <job>            a failed run, by name and run link, to the private chat
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { failureMessage } from '../analysis/public_alarm.mjs';

const { values: a, positionals: [file] } = parseArgs({ allowPositionals: true, options: { channel: { type: 'boolean' }, failed: { type: 'string' } } });
const env = process.env;
let text;
if (a.failed) text = failureMessage(a.failed, `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`);
else if (!file || !existsSync(file)) { console.log('telegram: no message file, nothing to send'); process.exit(0); }
else text = readFileSync(file, 'utf8').trim();

const [name, chat] = a.channel ? ['TELEGRAM_CHANNEL_ID', env.TELEGRAM_CHANNEL_ID] : ['TELEGRAM_CHAT_ID', env.TELEGRAM_CHAT_ID];
if (!env.TELEGRAM_BOT_TOKEN || !chat) {
  console.log(`telegram: TELEGRAM_BOT_TOKEN or ${name} is not set, printing instead of sending:\n\n${text}`);
  process.exit(0);
}
const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
});
if (!r.ok) { console.error(`telegram: send failed with status ${r.status}`); process.exit(1); } // never print the response: it can echo the token URL
console.log(`telegram: sent to ${a.channel ? 'the channel' : 'the private chat'}`);
