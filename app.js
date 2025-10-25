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

app.message("", async ({ message }) => {
	let YMBActive = getYMBActive();
	const userId = message.user;
	if (message.channel !== YMBActiveChannelId) return;
	console.log("message in #ymbactive-bot-testing:", message.text);
	const length = message.text.length;
	const files = message.files?.length || 0;
	console.log("message length:", length);
	console.log("includes file(s):", files);
	if (YMBActive.score[userId] === undefined) YMBActive.score[userId] = 0;
	try {
		await app.client.chat.postEphemeral({
			channel: YMBActiveChannelId,
			user: userId,
			text: "That message had a length of " + length + ", and " + files + " file(s). Your activity score increased by " + (length + 10 * files) + " points from " + YMBActive.score[userId] + " to " + (YMBActive.score[userId] += length + 10 * files)
		});
	} catch (e) {
		if (e.data.error === "user_not_in_channel")
			YMBActive.score[userId] = 0;
		else console.error(e.data, e.data.error);
	}
	saveState(YMBActive);
});

app.command("/ymbactive-join-channel", async interaction => {
	await interaction.ack();
	let YMBActive = getYMBActive();
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
	YMBActive.score[userId] = 0;
	saveState(YMBActive);
});

let isChainRunning = false;
const scheduleChain = async _ => {
	await new Promise(resolve => setTimeout(async _ => {
		if (isChainRunning) scheduleChain();
		else return await app.client.chat.postEphemeral({
			channel: YMBActiveChannelId,
			user: lraj23UserId,
			text: "The next interval message was canceled..."
		});
		let YMBActive = getYMBActive();
		const leastScore = Object.entries(YMBActive.score).sort((a, b) => a[1] - b[1])[0];
		console.log(Object.entries(YMBActive.score).sort((a, b) => a[1] - b[1])[0]);
		await app.client.chat.postEphemeral({
			channel: YMBActiveChannelId,
			user: lraj23UserId,
			text: "The person who fell off this time is <@" + leastScore[0] + ">, who has a score of a measly " + leastScore[1] + "."
		});
		await app.client.conversations.kick({
			token: process.env.YMBACTIVE_USER_TOKEN,
			channel: YMBActiveChannelId,
			user: leastScore[0]
		});
		console.log(leastScore[1], YMBActive.score[leastScore[0]]);
		delete YMBActive.score[leastScore[0]];
		Object.keys(YMBActive.score).forEach(user => YMBActive.score[user] = 0);
		await app.client.chat.postEphemeral({
			channel: YMBActiveChannelId,
			user: lraj23UserId,
			text: "Reset everyone's score to 0. Make sure not to fall off!"
		})
		console.log(YMBActive.score);
		saveState(YMBActive);
		resolve(true);
	}, 1000 * 20));
};

app.command("/ymbactive-start-chain", async interaction => {
	await interaction.ack();
	const userId = interaction.body.user_id;
	if (userId !== lraj23UserId) return await interaction.respond("You aren't permitted to start the chain. Only <@" + lraj23UserId + "> can!");
	if (isChainRunning) return await interaction.respond("The chain is already running!");
	isChainRunning = true;
	scheduleChain();
	await interaction.respond("The chain has started!");
});

app.command("/ymbactive-stop-chain", async interaction => {
	await interaction.ack();
	const userId = interaction.body.user_id;
	if (userId !== lraj23UserId) return await interaction.respond("You aren't permitted to stop the chain. Only <@" + lraj23UserId + "> can!");
	if (!isChainRunning) return await interaction.respond("The chain isn't running!");
	isChainRunning = false;
	await interaction.respond("The chain has stopped!");
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