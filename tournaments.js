/*
 * tournaments.js
 *
 * Contains code for pokemon online server scripted tournaments.
 */
if (typeof Config == "undefined")
    Config = {}
if (!Config.tourneybot) Config.tourneybot = '±TourneyBot';

function Tournament(channel, globalObject)
{
	var self = this;

	self.channel = channel;
	self.running = false;
	self.main = false;
	self.count = 0;
	self.tier = "";
	self.phase = "";
	self.starter = "";
	self.round = 0;
	var battlesStarted = [];
	var battlesLost = [];

	var entrants = {};
	var members = [];
	var battlers = [];

	var border = "»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»:";

	function sendPM(id,message) {
		sys.sendMessage(id, Config.tourneybot + ": " + message, self.channel);
	}

	function broadcast(message, bot) {
		var bot = arguments.length == 1 ? false : bot;

		if (bot) {
			sys.sendAll(Config.tourneybot + ": " + message, self.channel);
		} else {
			sys.sendAll(message, self.channel);
		}
	}

	function wall(message) {
		sys.sendAll(message, self.channel);
		if (self.main) {
			sys.sendAll(message, 0);
		}
	}

        // Command start
	function start(source, data) {
		if (self.running) {
			sendPM(source, "A tournament is already running!");
			return;
		}

		if (data.indexOf(':') == -1)
			var commandpart = data.split(' ');
		else
			var commandpart = data.split(':');

		self.count = parseInt(commandpart[1]);

		if (isNaN(self.count) || count <= 2){
			sendPM(source, "You must specify a tournament size of 3 or more.");
			return;
		}

		var tiers = sys.getTierList();
		var found = false;
		for (var i = 0; < tiers.length; ++i) {
			if (tiers[i].toLowerCase() == commandpart[0].toLowerCase())) {
				self.tier = tiers[i];
				found = true;
				break;
			}
		}
		if (!found) {
			sendPM(source, "Sorry, the server does not recognise the " + commandpart[0] + " tier.");
			return;
		}

		wall(border);
		wall("*** A Tournament was started by " + sys.name(source) + "! ***");
		wall("PLAYERS: " + self.count);
		wall("TYPE: Single Elimination");
		wall("TIER: " + self.tier);
		wall("");
		wall("*** Go in the #" + sys.channel(self.channel) + " channel and type /join or !join to enter the tournament! ***");
		wall(border);

		self.running = true;
		self.phase = "entry";
		self.starter = sys.name(source);
		self.round = 0;

		entrants = {};
		members = [];
	}

	function isInTour(name) {
		return name.toLowerCase() in entrants;
	}

	function remainingEntrants() {
		return self.count - members.count;
	}

	/* Precondition: isInTour(name) is false */
	function addEntrant(name) {
		entrants[name.toLowerCase()] = name;
		members.push(name.toLowerCase());
	}

	function removeEntrant(name) {
		delete entrants[name.toLowerCase()];
		members.splice(members.indexOf(name.toLowerCase()), 1);
	}

        // Command join
	function join(source) {
		if (self.phase != "entry") {
			sendPM(source, "The tournament is not in signup phase at the moment");
			return;
		}

		var name = sys.name(source);

		if (isInTour(name)) {
			sendPM(source, "You already joined the tournament!");
			return;
		}

		addEntrant(name);
		broadcast("~~Server~~: " + name + " joined the tournament! " + remainingEntrants()  + "more spot(s) left!");

		if (remainingEntrants() == 0) {
			startTournament();
		}
	}

	// Command unjoin
	function unjoin(source) {
		if (!self.running) {
			sendPM(source, "Wait till the tournament has started.");
			return;
		}

		var name = sys.name(source);

		if (isInTour(name)) {
			if (self.phase == "entry") {
				removeEntrant(name);
				broadcast("~~Server~~: " + name + " left the tournament!");
			} else if (self.phase == "playing" || self.phase == "finals") {
				setBattleStarted(name);
				broadcast("~~Server~~: " + name + " left the tournament!");
				// end battle?
				endBattle(tourOpponent(name), name);
			}
		}
	}

	/* Command viewround */
	function viewround(source) {
		if (self.phase != "playing" || self.phase != "finals") {
			sendPM(source, "Sorry, you are unable to view the round because a tournament is not currently running or is in signing up phase.");
			return;
		}
		
		sendPM(source, "");
		sendPM(source, border);
		sendPM(source, "");
		sendPM(source, "*** ROUND " + self.round + " OF " + self.tier.toUpperCase() + " TOURNAMENT ***");

		if (battlesLost.length > 0) {
			sendPM(source, "");
			sendPM(source, "*** Battles finished ***");
			sendPM(source, "");
			for (var i = 0; i < battlesLost.length; i+= 2) {
				sendPM(source, battlesLost[i] + " won against " battlesLost[i+1]);
			}
			sendPM(source, "");
		}

		if (battlers.length > 0) {
			if (battlesStarted.indexOf(true) != -1) {
				sendPM(source, "");
				sendPM(source, "*** Ongoing battles ***");
				sendPM(source, "");
				for (var i = 0; i < battlers.length; i+=2) {
					if (battlesStarted[i/2]) {
						sendPM(source, padd(entrants[battlers[i]]) + " VS " + entrants[battlers[i+1]]);
					}
				}
				sendPM(source, "");
			}
			if (battlesStarted.indexOf(false) != -1) {
				sendPM(source, "");
				sendPM(source, "*** Yet to start battles ***");
				sendPM(source, "");
				for (var i = 0; i < battlers.length; i+=2) {
					if (!battlesStarted[i/2]) {
						sendPM(source, padd(entrants[battlers[i]]) + " VS " + entrants[battlers[i+1]]);
					}
				}
				sendPM(source, "");
			}
		}
		if (members.length > 0) {
			sendPM(source, "");
			sendPM(source, "*** Members to the next round ***");
			sendPM(source, "");
			var s = [];
			for (var i = 0; i < members.length; ++i) {
				s.push(entrants[members[i]]);
			}
			sendPM(source, s.join(", "));
			sendPM(source, "");
		}

		sendPM(source, border);
		sendPM(source, "");
	}

	// Command dq (disqualify)
	function dq(source, name) {
		if (!self.running) {
			sendPM(source, "Wait till the tournament has started.");
		}

		var authority = sys.name(source);

		if (isInTour(name)) {
			if (self.phase == "entry") {
				removeEntrant(name);
				broadcast("~~Server~~: " + name + " was removed from the tournament by " + authority + "!");
			} else if (self.phase == "playing" || self.phase == "finals") {
				setBattleStarted(name);
				broadcast("~~Server~~: " + name + " was removed from the tournament by " + authority + "!");
				// end battle?
				endBattle(tourOpponent(name), name);
			}
		}
	}

	// Command push
	function push(source, name) {
		if (!self.running) {
			sendPM(source, "Wait till the tournament has started.");
			return;
		}

		var authority = sys.name(source);

		if (isInTour(name)) {
			sendPM(source, name + " is already in the tournament.");
		}

		addEntrant(name);
		if (self.phase == "playing") {
			broadcast(name + "was added to the tournament by " + sys.name(source) + ".",);
		} else if (self.phase == "entry") {
			broadcast(name + "was added to the tournament by " + sys.name(source) + ". " + remainingEntrants() + " more spot(s) left!",);

			if (remainingEntrants() == 0) {
				startTournament();
			}
		}
	}

	// command cancelBattle
	function cancelBattle(source, name) {
		if (self.phase != "playing" || self.phase != "finals") {
			sendPM(source, "Wait until a tournament starts!");
			return;
		}

		if (isBattling(name)) {
			sendPM(source, name + " can forfeit their battle and rematch now.")
			setBattleStarted(name, false);
		}
	}

	// Command sub
	function sub(source, data) {
		if (self.phase != "playing" || self.phase != "finals") {
			sendPM(source, "Wait until a tournament starts!");
			return;
		}

		var players = data.split(":");
		if (!isInTour(players[0]) && !isIntour(players[1])) {
			sendPM(source, "Neither are in the tournament.");
		}

		broadcast(player[0] + " and " + player[1] + " were exchanged places in the ongoing tournament by "  + sys.name(source));

		var p1 = players[0].toLowerCase();
		var p2 = players[1].toLowerCase();

		for (var i = 0; i < members.length; ++i) {
			if (members[i] == p1) {
				setBattleStarted(members[i], false);
				members[i] = player[0];
			} else if (members[i] == p2) {
				setBattleStarted(members[i], false);
				members[i] = player[1];
			}
		}

		if (!isInTour(players[0])) {
			entrants[p1] = players[0];
			delete entrants[p2];
		} else if (!isInTour(players[1])) {
			entrants[p2] = players[1];
			delete entrants[p1];
		}
	}

	// Command changeCount
	function changeCount(source, data) {
		if (self.phase != "entry") {
			sendPM(source, "Can only change count during signups.");
			return;
		}

		var count = parseInt(commandpart[1]);

		if (isNaN(self.count) || count <= 2){
			sendPM(source, "You must specify a tournament size of 3 or more.");
			return;
		}

		if (count > memberCount()) {
			sendPM(source, "There are more than that people registered");
			return;
		}

		self.count = count;

		broadcast("");
		broadcast(border);
		broadcast("~~Server~~: " + sys.name(source) + " changed the number of entrants to " + count + "!");

		if (remainingEntrants() == 0) {
			startTournament();
		}
	}

	function endTour(source, data) {
		if (self.running) {
			broadcast("");
			broadcast(border);
			broadcast("~~Server~~: The tournament was cancelled by " + sys.name(source) + "!");
			broadcast(border);
			broadcast("");
			
		} else {
			sendPM(source, "Sorry, you are unable to end a tournament because one is not currently running.");
		}
	}

	function startTournament() {
		self.phase = "playing";

		roundPairing();
	}

	function firstPlayer() {
		return members[0];
	}

	function memberCount() {
		return members.length;
	}

	function casedName(name) {
		return entrants[name];
	}

        function padd(name) {
		var ret = name;
		while (ret.length < 20) ret = ' ' + ret;
		return ret;
	}

	function cmp(s1, s2) {
		return s1.toLowerCase() == s2.toLowerCase();
	}

	function setBattleStarted(name, started) {
		if (started === undefined) started = true;
		battlesStarted[Math.floor(battlers.indexOf(name.toLowerCase())/2)] = started;
	}

	function removeBattle(name) {
		battlesStarted.splice(Math.floor(battlers.indexOf(name.toLowerCase())/2), 1);
	}

	function isBattling(name) {
		var indx = battlers.indexOf(name.toLowerCase());
		if (indx == -1) return false;
		return battlesStarted(Math.floor(indx/2));
	}

	function areOpponents(name1, name2) {
		var indx1 = battlers.indexOf(name2.toLowerCase()),
		    indx2 = battlers.indexOf(name2.toLowerCase());
		return indx1 >= 0 && Math.floor(indx1) == Math.floor(indx2);
	}

	function roundPairing() {
		self.round += 1;

		battlesStarted = [];
		battlers = [];
		battlesLost = [];

		if (memberCount() == 1) {
			wall("");
			wall(border);
			wall("");
			wall("THE WINNER OF THE " + self.tier.toUpperCase() + " TOURNAMENT IS : " + firstPlayer());
			wall("");
			wall("*** Congratulations, " + firstPlayer() + ", on your success! ***");
			wall("");
			wall(border);
			wall("");

			self.running = false;

			// tier, time, number of participants, winner
			if (self.main) {
				var tier = self.tier;
				var time = sys.time();
				var winner = firstPlayer();
				var num = self.count;
				var noPoints = cmp(winner,self.starter) && sys.auth(sys.id(winner)) == 0;
				globalObject.updateTourStats(tier, time, winner, num, noPoints);
			}

			return;
		}

		var finals = memberCount() == 2;

		if (finals) {
			self.phase = "finals";
		}

		if (!finals) {
			broadcast("");
			broadcast(border);
			broadcast("*** Round " + self.round + " of " + self.tier + " tournament ***");
			broadcast("");
		}
		else {
			wall("");
			wall(border);
			wall("*** FINALS OF " + self.tier.toUpperCase() + " TOURNAMENT ***");
			wall("");
		}

		var i = 0;
		while (members.length >= 2) {
			i += 1;
			var x1 = sys.rand(0, members.length);
			battlers.push(members[x1]);
			var name1 = casedName(members[x1]);
			members.splice(x1,1);


			x1 = sys.rand(0, members.length);
			battlers.push(members[x1]);
			var name2 = casedName(members[x1]);
			members.splice(x1,1);

			if (!finals)
				broadcast(i + "." + padd(name1) + " VS " + name2);
			else {
				wall ("  " + padd(name1) + " VS " + name2);
			}
		}

		if (members.length > 0) {
			broadcast("");
			broadcast("*** " + casedName(members[0]) + " is randomly selected to go to next round!");
		}

		var f = finals ? wall : broadcast;

		f(border);
		f("");
	}

	// event battleStart
	function battleStart(source, dest) {
		if (areOpponents(sys.name(source), sys.name(dest))) {
			setBattleStarted(sys.name(source));
		}
	}

	// event battleEnd
	function battleEnd(source, dest, desc) {
		var winner = sys.name(source), loser = sys.name(dest);
		if (!areOpponents(winner, loser)) {
			return;
		}
		battlesLost.push(winner);
		battlesLost.push(loser);
		
		removeBattle(winner);
		battlers.splice(battlers.indexOf(winner.toLowerCase(), 1);
		battlers.splice(battlers.indexOf(loser.toLowerCase(), 1);
		members.push(winner.toLowerCase();
		delete entrants[loser.toLowerCase()];	

		if (battlers.length != 0 || members.length > 1) {
			broadcast("");
			broadcast(border);
			broadcast("~~Server~~: " + winner + " advances to the next round.");
			broadcast("~~Server~~: " + loser + " is out of the tournament.");
		}
		if (battlers.length > 0) {
			broadcast("*** " + battlers.length/2 + " battle(s) remaining.");
			broadcast(border);
			broadcast("");
			return;
		}

		roundPairing();
	}

	// event beforeChallenge
	function beforeChallenge(source, dest, clauses) {
		if (self.phase != "finals" && self.phase != "playing")
			return;
		var name1 = sys.name(source),
		    name2 = sys.name(dest);
		if (isInTour(name1)) {
			if (!areOpponents(name1, name2)) {
				sendPM(source, "This guy isn't your opponent in the tourney.");
				return true;
			}
			if (sys.tier(source) != sys.tier(dest) || !cmp(sys.tier(source), self.tier)) {
				sendPM(source, "You must be both in the tier " + tourtier + " to battle in the tourney.");
				return true;
			}
			if (self.phase == "finals" && clauses % 4 >= 4) {
				sendPM(source, "You must not use \"disallow specs\" in finals.");
				return true;
			}
		} else if (isInTour(name2)) {
			sendPM(source, "This guy isn't your opponent in the tourney.");
			return true;
		}
	}

	function battleMatchup(source, dest, clauses, rated) {
		if (self.phase == "running" || self.phase == "finals")
			return isInTour(sys.name(source)) || isInTour(sys.name(dest));
		}
	}

	this.commands = {
		join: join,
		unjoin: unjoin,
		viewround: viewround
	}
	this.authCommands = {
		tour: start,
		dq: dq,
		push: push,
		cancelbattle: cancelBattle,
		sub: sub,
		changecount: changeCount,
		endtour: endTour
	}

	this.events = {
		afterBattleStarted, battleStart,
		afterBattleEnded: battleEnd,
		beforeChallengeIssued: beforeChallenge,
		beforeBattleMatchup: battleMatchup
	}
}

module.tournaments = {}

module.exports = {
	init: function() {
		var tourchannel, channelname = "Tournaments";
		if (sys.channelExist(channelname) {
			tourchannel = sys.channelId(channelname);
		} else {
			tourchannel = sys.createChannel(channelname);
		}
		var tournament = Tournament(tourchannel, script);
		tournament.main = true;
		module.tournaments[tourchannel] = tournament;
	},

	handleCommand: function(source, message, channel) {
		if (module.tournaments[channel] !== undefined) {
        		var command;
        		var commandData = "";
        		var pos = message.indexOf(' ');
			if (pos != -1) {
				command = message.substring(0, pos).toLowerCase();
				commandData = message.substr(pos+1);
			} else {
				command = message.substr(0).toLowerCase();
			}

			if (command in module.tournaments[channel].commands) {
				module.tournaments[channel].commands[command](source, commandData);
			} else if (command in module.tournaments[channel].authCommands) {
				if (sys.auth(source) == 0 && !SESSION.users(source).megauser) {
					sys.sendMessage(source, "Sorry, you do not have access to this command.");
					return;
				}
				module.tournaments[channel].authCommands[command](source, commandData);
			}
			return true;
		}
		return false;
	},

	afterBattleStarted : function(source, dest, clauses, rated, mode, bid) {
		for (channel in module.tournaments) {
			module.tournaments[channel].events.afterBattleStarted(source, dest, clauses, rated, mode, bid);
		}
	},

	afterBattleEnded : function(source, dest, desc) {
		if (desc == "tie")
			return;
		for (channel in module.tournaments) {
			module.tournaments[channel].events.afterBattleEnded(source, dest, desc);
		}
	},

	beforeChallengeIssued : function(source, dest, clauses, rated, mode) {
		var ret = false;
		for (channel in module.tournaments) {
			ret |= module.tournaments[channel].events.beforeChallengeIssued(source, dest, clauses, rated, mode);
		}
		return ret;
	},

	beforeBattleMatchup : function(source, dest, clauses, rated) {
		var ret = false;
		for (channel in module.tournaments) {
			ret |= module.tournaments[channel].events.beforeBattleMatchup(source, dest, clauses, rated);
		}
		return ret;
	}

}