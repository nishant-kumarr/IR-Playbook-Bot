require("dotenv").config();
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
});

app.message(async ({ message, say }) => {
  console.log("Slack user id is:", message.user);

  let commandText = (message.text || "").trim();
  if (!commandText) return;

  commandText = commandText.replace(/^<@[^>]+>\s*/, "").trim();
  console.log(`Received command (normalized): ${commandText}`);

  try {
    const response = await fetch("http://localhost:3000/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: commandText,
        userId: message.user,
      }),
    });

    const result = await response.json();

    if (result.ok) {
      await say(
        `IR action completed.\nAction : \`${result.action}\`\nHost : \`${result.host}\`\nStatus : \`Success\`\n\n\`\`\`\n${result.output}\n\`\`\``
      );
    } else {
      await say(
        `IR action failed.\nAction : \`${result.action || "n/a"}\`\nHost : \`${result.host || "n/a"}\`\nStatus : \`Error\`\n\n\`\`\`\n${result.error || "No error details"}\n\`\`\``
      );
    }
  } catch (err) {
    console.error("Slack bot error:", err);
    await say(
      `IR-Bot internal error.\n\`\`\`\n${String(
        err
      )}\n\`\`\``
    );
  }
});

(async () => {
  await app.start(process.env.PORT || 3001);
  console.log("⚡ IR-Bot Slack app running on port", process.env.PORT || 3001);
})();
