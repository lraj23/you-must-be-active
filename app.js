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
	YMBActive.updates[user_id] = 1;
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
			text: "The next interval message was canceled..."
		});
		let YMBActive = getYMBActive();
		const leastScore = Object.entries(YMBActive.score).sort((a, b) => a[1] - b[1])[0];
		console.log(Object.entries(YMBActive.score).sort((a, b) => a[1] - b[1])[0]);
		await app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			text: "The person who FELL off this time is <@" + leastScore[0] + ">, who has a score of a measly " + leastScore[1] + "."
		});
		if (leastScore[0] === lraj23UserId) await app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			text: "Since <@" + lraj23UserId + "> was the least active this time, but he can't be kicked out (he's the owner), he's going to get punished differently. Everyone boo him with @ mentions! Spam this channel with being annoyed at him! Ping him repeatedly!"
		});
		else if (YMBActive.admins.includes(leastScore[0])) await app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			text: "Since <@" + leastScore[0] + "> was the least active this time, but they can't be kicked out (they're an admin), they're going to get punished differently. Everyone boo them with @ mentions! Spam this channel with being annoyed at them! Ping them repeatedly!"
		});
		else await app.client.conversations.kick({
			token: process.env.YMBACTIVE_USER_TOKEN,
			channel: YMBActiveChannelId,
			user: leastScore[0]
		});
		await app.client.chat.postMessage({
			channel: leastScore[0],
			text: "You were the least active person this time, with a score of only " + leastScore[1] + ". You'll have to wait for until someone else gets kicked out to rejoin. After that, you can rejoin anytime with /ymbactive-join-channel. Hopefully, you won't FALL off next time!"
		});
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
			text: "Everyone's score has been reset to 0. Make sure not to FALL off next!"
		});
		console.log(YMBActive.score);
		saveState(YMBActive);
		resolve(true);
	}, 1000 * 60 * interval));
};

app.action("start-chain", async ({ ack, respond }) => [await ack(), await respond({
	text: "Enter the chain interval (min)",
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
	]
})]);

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

app.action("stop-chain", async ({ ack, respond }) => [await ack(), isChainRunning = false, await respond("The chain has stopped!")]);

app.command("/ymbactive-admin", async ({ ack, body: { user_id }, respond }) => {
	await ack();
	let YMBActive = getYMBActive();
	if (!YMBActive.admins.includes(user_id)) return await respond("You aren't an admin (" + YMBActive.admins.map(admin => "<@" + admin + ">").join(", ") + "), so you can't access this command.");
	await respond({
		text: "Admin panel:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Admin Panel:"
				}
			},
			{
				type: "actions",
				elements: [
					{
						type: "button",
						text: {
							type: "plain_text",
							text: (isChainRunning ? ":chains: Stop Chain" : ":chains: Start Chain")
						},
						action_id: (isChainRunning ? "stop-chain" : "start-chain")
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":heavy_plus_sign: Add admin"
						},
						action_id: "add-admin"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":adminabooz: Remove admin"
						},
						action_id: "remove-admin"
					},
					{
						type: "button",
						text: {
							type: "plain_text",
							text: ":x: Cancel"
						},
						action_id: "cancel"
					}
				]
			}
		]
	});
});

app.action("add-admin", async ({ ack, respond }) => {
	await ack();
	await respond({
		text: "Choose someone to make admin:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Choose someone to make admin:"
				},
				accessory: {
					type: "users_select",
					placeholder: {
						type: "plain_text",
						text: "Choose someone",
						emoji: true
					},
					action_id: "ignore-add-admin"
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
						action_id: "confirm-add-admin"
					}
				]
			}
		]
	});
});

app.action("confirm-add-admin", async ({ ack, body: { user: { id }, state: { values } }, respond }) => {
	await ack();
	let YMBActive = getYMBActive();
	console.log(values);
	const added = values[Object.keys(values)[0]]["ignore-add-admin"].selected_user;
	const warn = msg => app.client.chat.postEphemeral({
		channel: YMBActiveChannelId,
		user: id,
		text: msg,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: msg
				},
				accessory: {
					type: "button",
					text: {
						type: "plain_text",
						text: "Close"
					},
					action_id: "cancel"
				}
			}
		],
	});

	if (added === null) return await warn("Choose someone to make admin!");
	if (YMBActive.admins.includes(added)) return await warn("<@" + added + "> is already an admin!");

	YMBActive.admins.push(added);
	await respond("You have made <@" + added + "> an admin.");
	await app.client.chat.postMessage({
		channel: YMBActiveChannelId,
		text: "<@" + added + "> was made an admin by <@" + id + ">"
	});
	saveState(YMBActive);
});

app.action("remove-admin", async ({ ack, respond }) => {
	await ack();
	await respond({
		text: "Choose someone to remove from admin:",
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: "Choose someone to remove from admin:"
				},
				accessory: {
					type: "users_select",
					placeholder: {
						type: "plain_text",
						text: "Choose someone",
						emoji: true
					},
					action_id: "ignore-remove-admin"
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
						action_id: "confirm-remove-admin"
					}
				]
			}
		]
	});
});

app.action("confirm-remove-admin", async ({ ack, body: { user: { id }, state: { values } }, respond }) => {
	await ack();
	let YMBActive = getYMBActive();
	console.log(values);
	const removed = values[Object.keys(values)[0]]["ignore-remove-admin"].selected_user;
	const warn = msg => app.client.chat.postEphemeral({
		channel: YMBActiveChannelId,
		user: id,
		text: msg,
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: msg
				},
				accessory: {
					type: "button",
					text: {
						type: "plain_text",
						text: "Close"
					},
					action_id: "cancel"
				}
			}
		],
	});

	if (removed === null) return await warn("Choose someone to remove from admin!");
	if (!YMBActive.admins.includes(removed)) return await warn("<@" + removed + "> isn't an admin!");
	if (removed === lraj23UserId) {
		if (id !== lraj23UserId) YMBActive.admins.splice(YMBActive.admins.indexOf(id), 1);
		warn("You can't remove <@" + lraj23UserId + "> from admin! Shame on you! For that, you lose your admin!");
		app.client.chat.postMessage({
			channel: YMBActiveChannelId,
			text: "<@" + id + ">, an admin, tried to remove <@" + lraj23UserId + "> from admin! Shame on them!"
		});
		return saveState(YMBActive);
	}

	YMBActive.admins.splice(YMBActive.admins.indexOf(removed), 1);
	await respond("You have removed <@" + removed + "> from admin.");
	await app.client.chat.postMessage({
		channel: YMBActiveChannelId,
		text: "<@" + removed + "> was removed from admin by <@" + id + ">"
	});
	saveState(YMBActive);
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

app.action("confirm-edit-remind", async ({ ack, body: { user: { id }, state: { values } }, respond }) => {
	await ack();
	let YMBActive = getYMBActive();
	console.log(values);
	let remind = values[Object.keys(values)[0]]["ignore-remind-interval"].selected_option.value || "never";
	console.log(remind);

	switch (remind) {
		case "none":
			await respond("<@" + id + "> set their updates to never. The bot will no longer update you with your score. If you want to check your score, run /ymbactive-leaderboard to make sure you aren't about to FALL off.");
			YMBActive.updates[id] = 0;
			break;
		case "thousand":
			await respond("<@" + id + "> set their updates to every thousand. Every time you send a message that brings your score into a different thousand, you will get a notice. I'd still suggest running /ymbactive-leaderboard to make sure you don't FALL off next!");
			YMBActive.updates[id] = 1000;
			break;
		case "hundred":
			await respond("<@" + id + "> set their updates to every hundred. Every time you send a message that brings your score into a different hundred, you will get a notice. I'd still suggest running /ymbactive-leaderboard to make sure you don't FALL off next!");
			YMBActive.updates[id] = 100;
			break;
		case "always":
			await respond("<@" + id + "> set their updates to every message. Every _single_ time you send a message (in this channel), the bot will give you a notice of your score change. Run /ymbactive-leaderboard sometimes, though, just to ensure you aren't FALLing off next.");
			YMBActive.updates[id] = 1;
			break;
	}

	saveState(YMBActive);
});

app.command("/ymbactive-leaderboard", async ({ ack, respond }) => [await ack(), await respond("This is the <#" + YMBActiveChannelId + "> Leaderboard!\n\n" + Object.entries(getYMBActive().score).sort((a, b) => b[1] - a[1]).map(user => "<@" + user[0] + "> has " + user[1] + " score!").join("\n"))]);

app.command("/ymbactive-help", async ({ ack, respond, payload: { user_id } }) => [await ack(), await respond("This is the You-must-be-active Channel Manager! The point of this is to run the channel <#" + YMBActiveChannelId + "> (you-must-be-active), primarily to kick out inactive people periodically. Gain score by sending messages to avoid getting kicked out. Since this runs in a private channel, you can't just join it like that. In order to join, run /ymbactive-join-channel. You will also get more information from <@" + lraj23UserId + "> once you join.\nFor more information, check out the readme at https://github.com/lraj23/you-must-be-active"), user_id === lraj23UserId ? await respond("Test but only for <@" + lraj23UserId + ">. If you aren't him and you see this message, DM him IMMEDIATELY about this!") : null]);

app.message(/secret button/i, async ({ message: { channel, user, thread_ts, ts } }) => await app.client.chat.postEphemeral({
	channel, user,
	text: "<@" + user + "> mentioned the secret button! Here it is:",
	thread_ts: ((thread_ts == ts) ? undefined : thread_ts),
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
	]
}));

app.action("button_click", async ({ body: { channel: { id: cId }, user: { id: uId }, container: { thread_ts } }, ack }) => [await ack(), await app.client.chat.postEphemeral({
	channel: cId,
	user: uId,
	text: "You found the secret button. Here it is again.",
	thread_ts,
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
	]
})]);