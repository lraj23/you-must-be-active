import app from "./client.js";
import { getYMBActive, logInteraction, saveState } from "./datahandler.js";
const aiApiUrl = "https://ai.hackclub.com/chat/completions";
const headers = {
	"Content-Type": "application/json"
};
const lraj23BotTestingId = "C09GR27104V";
const lraj23UserId = "U0947SL6AKB";
const iWillBuryYouAliveInADarkAlleyAndLetTheRatsFeastUponYourCorpse = "i-will-bury-you-alive-in-a-dark-alley-and-let-the-rats-feast-upon-your-corpse";
const YMBActiveChannelId = "C09MUE0M5GA";

app.message("", async ({ message }) => { });

app.command("/ymbactive-join-channel", async interaction => {
	await interaction.ack();
	const userId = interaction.body.user_id;
	let joined = false;
	try {
		await app.client.conversations.invite({
			channel: YMBActiveChannelId,
			users: interaction.body.user_id
		});
		joined = true;
	} catch (e) {
		console.error(e.data.error);
	}
	if (joined) await app.client.chat.postMessage({
		channel: YMBActiveChannelId,
		text: "<@" + userId + "> has joined <#" + YMBActiveChannelId + ">! Let's see how long they stay..."
	});
});

app.message(/secret button/i, async ({ message: { channel, user, thread_ts, ts } }) => await app.client.chat.postEphemeral({
	channel, user,
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "<@" + user + "> mentioned the secret button! Here it is:"
			}
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						text: "Secret Button"
					},
					action_id: "button_click"
				}
			]
		}
	],
	text: "<@" + user + "> mentioned the secret button! Here it is:",
	thread_ts: ((thread_ts == ts) ? undefined : thread_ts)
}));

app.action("button_click", async ({ body: { channel: { id: cId }, user: { id: uId }, container: { thread_ts } }, ack }) => [await ack(), await app.client.chat.postEphemeral({
	channel: cId,
	user: uId,
	blocks: [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "You found the secret button. Here it is again."
			}
		},
		{
			type: "actions",
			elements: [
				{
					type: "button",
					text: {
						type: "plain_text",
						text: "Secret Button"
					},
					action_id: "button_click"
				}
			]
		}
	],
	text: "You found the secret button. Here it is again.",
	thread_ts
})]);