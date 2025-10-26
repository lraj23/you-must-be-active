# Secret Signal Service

### Main Purpose

The point of this bot is to run the private channel #you-must-be-active and keep people active in that channel. Every of some given interval, the bot will kick out the least active user in the channel (see below how it's determined). Then everyone's score resets, and it's another struggle to stay more active than everyone else.

### Score Calculation

This is actually pretty simple. Every character in messages sent in the channel counts. Additionally, attached files, like images, count for 10 points each.

### Commands

Since this bot runs a private channel, you can't just *join* the channel. There are also some other commands used for some other purposes.

#### /ymbactive-join-channel
This is the first command anyone'll run to get associated with this channel. This command adds the user to #you-must-be-active if they weren't already in it. If the user was just recently kicked from the channel, this command will tell them such and not allow them to join.

#### /ymbactive-join-testing
Very similar to the previous command, this command adds the user to #ymbactive-bot-testing, which is a channel where I test new features and stuff for this bot. There are no limitations on joining this channel.

#### /ymbactive-start-chain
This command can only be used by me (@lraj23), the creator of this bot. Anyone else running it will get a notice that they can't use it. When this command is run, the bot asks the user for an amount of time (in minutes), and then begins the cycle of removing the least active person with an interval of the inputted amount. The cycle will continue until either /ymbactive-stop-chain is run or the server is stopped.

#### /ymbactive-stop-chain
Just like the previous command, this can only be used by me. This command, as suggested, stops the cycle of removing the least active person. The cycle can be run once again with /ymbactive-start-chain

#### /ymbactive-edit-remind
This command allows the user to change how often they get a notice of their score changing. By default, when someone joins the channel, they get notified on every message they send of their score change. However, using this command, they can change it to never, every thousand, or every hundred. Then, the bot will only give them such a notice when they hit such a milestone (or never).

#### /ymbactive-leaderboard
This command shows the user the leaderboard of score, which is useful to tell who's going to FALL off next. Earn score by sending messages.

#### /ymbactive-help
This command helps you navigate this bot. It basically redirects you to this repository though, so no need to run it after seeing it here.

### Links, Channels, etc.

The dedicated channel for testing this bot is [#ymbactive-bot-testing](https://hackclub.slack.com/archives/C09MT69QZMX), which you can join by running /ymbactive-join-testing. The GitHub repo is literally [right here](https://www.github.com/lraj23/you-must-be-active). My Hackatime project for this bot is called you-must-be-active.

### Explanation of Theme (Fall)

This project doesn't really make it super obvious how the theme is followed. Because of this, I have included this short explanation in the README!

When people join #you-must-be-active, they get a score (which defaults to 37 when joining). Then, every given interval, someone **FALLS** off. (Explanation of this: bro fell off, which applies here because they were popular/active (probably) but aren't anymore.) Also, since they get kicked out of the channel, they are metaphorically **FALL**ing out of the channel. I guess instead of interpreting *fall* the word as autumn, I'm interpreting it as part of the expression *fall off*; and with a metaphorically falling object.