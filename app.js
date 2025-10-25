import app from "./client.js";
import { getYMBActive, saveState } from "./datahandler.js";
const lraj23UserId = "U0947SL6AKB";
const YMBActiveTestingChannelId = "C09MUE0M5GA";
const YMBActiveChannelId = "C09MT69QZMX";

app.message("", async ({ message: { user, channel, text, files } }) => {
	let YMBActive = getYMBActive();
	if (![YMBActiveChannelId, YMBActiveTestingChannelId].includes(channel)) return;
	console.log("message in <#" + channel + ">:", text);
	const numOfFiles = files?.length || 0;
	console.log("message length:", text.length);
	console.log("includes file(s):", numOfFiles);
	let score = YMBActive.score[user];
	if (score === undefined) score = 0;
	let newScore = score + text.length + 10 * numOfFiles;
	console.log(Math.floor(score / YMBActive.updates[user]), Math.floor(newScore / YMBActive.updates[user]));
	if (Math.floor(score / YMBActive.updates[user]) !== Math.floor(newScore / YMBActive.updates[user]))
		try {
			await app.client.chat.postEphemeral({
				channel: channel,
				user: user,
				text: "That message had a length of " + text.length + ", and " + numOfFiles + " file(s). Your activity score increased by " + (newScore - score) + " points from " + score + " to " + (newScore) + ". To change how often you want to get this message, run /ymbactive-edit-remind"
			});
		} catch ({ data }) {
			if (data.error === "user_not_in_channel")
				score = 0;
			else console.error(data, data.error);
		}
	YMBActive.score[user] = newScore;
	saveState(YMBActive);
});

app.command("/ymbactive-join-channel", async ({ ack, body: { user_id }, respond }) => {
	await ack();
	let YMBActive = getYMBActive();
	if ((YMBActive.cyclesSinceKicked[user_id] !== undefined) && (YMBActive.cyclesSinceKicked[user_id] < 2)) {
		return await respond("You were just kicked from <#" + YMBActiveChannelId + "> (you-must-be-active) only " + YMBActive.cyclesSinceKicked[user_id] + " kicks ago! Wait for some time before trying to join.");
	}
	let joined = false;
	try {
		await app.client.conversations.invite({
			channel: YMBActiveChannelId,
			users: user_id
		});
		joined = true;
	} catch (e) {
		console.error(e.data.error);
	}
	if (joined) await app.client.chat.postMessage({
		channel: YMBActiveChannelId,
		text: "<@" + user_id + "> has joined <#" + YMBActiveChannelId + ">! Let's see how long it takes for them to FALL off..."
	});
	YMBActive.score[user_id] = 0;
	YMBActive.cyclesSinceKicked[user_id] = 1000;
	YMBActive.update[user_id] = 1;
	saveState(YMBActive);
});

app.command("/ymbactive-join-testing", async ({ ack, body: { user_id } }) => {
	await ack();
	let joined = false;
	try {
		await app.client.conversations.invite({
			channel: YMBActiveTestingChannelId,
			users: user_id
		});
		joined = true;
	} catch (e) {
		console.error(e.data.error);
	}
	if (joined) await app.client.chat.postMessage({
		channel: YMBActiveTestingChannelId,
		text: "<@" + user_id + "> has joined <#" + YMBActiveTestingChannelId + ">! Hopefully they can help <@" + lraj23UserId + "> test..."
	});
});

let isChainRunning = false;
const scheduleChain = async interval => {
	await new Promise(resolve => setTimeout(async _ => {
		if (isChainRunning) scheduleChain(interval);
		else return await app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			user: lraj23UserId,
			text: "The next interval message was canceled..."
		});
		let YMBActive = getYMBActive();
		const leastScore = Object.entries(YMBActive.score).sort((a, b) => a[1] - b[1])[0];
		console.log(Object.entries(YMBActive.score).sort((a, b) => a[1] - b[1])[0]);
		await app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			user: lraj23UserId,
			text: "The person who FELL off this time is <@" + leastScore[0] + ">, who has a score of a measly " + leastScore[1] + "."
		});
		try {
			await app.client.conversations.kick({
				token: process.env.YMBACTIVE_USER_TOKEN,
				channel: YMBActiveChannelId,
				user: leastScore[0]
			});
		} catch (e) {
			if (e.data.error === "cant_kick_self")
				await app.client.chat.postMessage({
					channel: YMBActiveChannelId,
					user: lraj23UserId,
					text: "Since <@" + lraj23UserId + "> was the least active this time, but since he can't be kicked out (he runs the channel), he's going to get punished differently. Everyone boo him with @ mentions! Spam this channel with being annoyed at him! Ping him repeatedly!"
				});
			else console.error(e.data, e.data.error);
		}
		console.log(leastScore[1], YMBActive.score[leastScore[0]]);
		Object.keys(YMBActive.score).forEach(user => {
			YMBActive.score[user] = 0;
			if (!YMBActive.cyclesSinceKicked[user]) YMBActive.cyclesSinceKicked[user] = 0;
			YMBActive.cyclesSinceKicked[user]++;
		});
		delete YMBActive.score[leastScore[0]];
		YMBActive.cyclesSinceKicked[leastScore[0]] = 0;
		await app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			user: lraj23UserId,
			text: "Everyone's score has been reset to 0. Make sure not to FALL off next!"
		});
		console.log(YMBActive.score);
		saveState(YMBActive);
		resolve(true);
	}, 1000 * 60 * interval));
};

app.command("/ymbactive-start-chain", async ({ ack, body: { user_id }, respond }) => {
	await ack();
	if (user_id !== lraj23UserId) return await respond("You aren't permitted to start the chain. Only <@" + lraj23UserId + "> can!");
	if (isChainRunning) return await respond("The chain is already running!");
	await respond({
		blocks: [
			{
				type: "input",
				element: {
					type: "plain_text_input",
					action_id: "ignore-interval-length",
					placeholder: {
						type: "plain_text",
						text: "In minutes"
					}
				},
				label: {
					type: "plain_text",
					text: "Interval (in minutes)",
					emoji: true
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel",
							emoji: true
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":white_check_mark: Go!",
							emoji: true
						},
						value: "confirm",
						action_id: "confirm"
					}
				]
			}
		],
		text: "Enter the chain interval (min)"
	});
});

app.action(/^ignore-.+$/, async ({ ack }) => await ack());

app.action("cancel", async ({ ack, respond }) => [await ack(), await respond({ delete_original: true })]);

app.action("confirm", async ({ ack, respond, body: { state: { values } } }) => {
	await ack();
	console.log(values);
	const interval = parseFloat(values[Object.keys(values)[0]]["ignore-interval-length"].value);
	isChainRunning = true;
	scheduleChain(interval);
	await respond("The chain has started!");
});

app.command("/ymbactive-stop-chain", async ({ ack, body: { user_id }, respond }) => {
	await ack();
	if (user_id !== lraj23UserId) return await respond("You aren't permitted to stop the chain. Only <@" + lraj23UserId + "> can!");
	if (!isChainRunning) return await respond("The chain isn't running!");
	isChainRunning = false;
	await respond("The chain has stopped!");
});

app.command("/ymbactive-edit-remind", async ({ ack, payload: { user_id }, respond }) => {
	await ack();
	let YMBActive = getYMBActive();
	const optInLevels = Object.entries({
		none: "Never",
		thousand: "Every 1000",
		hundred: "Every 100",
		always: "Every message!"
	});
	const currentRemind = { "0": "none", "1000": "thousand", "100": "hundred", "1": "always" }[YMBActive.updates[user_id]];
	await respond({
		text: "Choose how often you want to get info on your score update",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Choose how often you want to get info on your score update"
				},
				accessory: {
					type: "static_select",
					placeholder: {
						type: "plain_text",
						text: "Required",
						emoji: true
					},
					options: optInLevels.map(level => ({
						text: {
							type: "plain_text",
							text: level[1],
							emoji: true
						},
						value: level[0]
					})),
					initial_option: {
						text: {
							type: "plain_text",
							text: Object.fromEntries(optInLevels)[currentRemind],
							emoji: true
						},
						value: currentRemind
					},
					action_id: "ignore-remind-interval"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel",
							emoji: true
						},
						value: "cancel",
						action_id: "cancel"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":white_check_mark: Go!",
							emoji: true
						},
						value: "confirm",
						action_id: "confirm-edit-remind"
					}
				]
			}
		]
	});
});

app.action("confirm-edit-remind", async interaction => {
	await interaction.ack();
	let YMBActive = getYMBActive();
	const userId = interaction.body.user.id;
	console.log(interaction.body.state.values);
	let remind = interaction.body.state.values[Object.keys(interaction.body.state.values)[0]]["ignore-remind-interval"].selected_option.value || "never";
	console.log(remind);

	switch (remind) {
		case "none":
			await interaction.respond("<@" + userId + "> set their updates to never. The bot will no longer update you with your score. If you want to check your score, run /ymbactive-leaderboard to make sure you aren't about to FALL off.");
			YMBActive.updates[userId] = 0;
			break;
		case "thousand":
			await interaction.respond("<@" + userId + "> set their updates to every thousand. Every time you send a message that brings your score into a different thousand, you will get a notice. I'd still suggest running /ymbactive-leaderboard to make sure you don't FALL off next!");
			YMBActive.updates[userId] = 1000;
			break;
		case "hundred":
			await interaction.respond("<@" + userId + "> set their updates to every hundred. Every time you send a message that brings your score into a different hundred, you will get a notice. I'd still suggest running /ymbactive-leaderboard to make sure you don't FALL off next!");
			YMBActive.updates[userId] = 100;
			break;
		case "always":
			await interaction.respond("<@" + userId + "> set their updates to every message. Every _single_ time you send a message (in this channel), the bot will give you a notice of your score change. Run /ymbactive-leaderboard sometimes, though, just to ensure you aren't FALLing off next.");
			YMBActive.updates[userId] = 1;
			break;
	}

	saveState(YMBActive);
});

app.command("/ymbactive-leaderboard", async ({ ack, respond }) => [await ack(), await respond("This is the <#" + YMBActiveChannelId + "> Leaderboard!\n\n" + Object.entries(getYMBActive().score).sort((a, b) => b[1] - a[1]).map(user => "<@" + user[0] + "> has " + user[1] + " score!").join("\n"))]);

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