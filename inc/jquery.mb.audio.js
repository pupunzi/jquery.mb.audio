/*
 * ******************************************************************************
 *  jquery.mb.components
 *  file: jquery.mb.audio.js
 *
 *  Copyright (c) 2001-2014. Matteo Bicocchi (Pupunzi);
 *  Open lab srl, Firenze - Italy
 *  email: matbicoc@gmail.com
 *  site: 	http://pupunzi.com
 *  blog:	http://pupunzi.open-lab.com
 * 	http://open-lab.com
 *
 *  Licences: MIT, GPL
 *  http://www.opensource.org/licenses/mit-license.php
 *  http://www.gnu.org/licenses/gpl.html
 *
 *  last modified: 07/01/14 22.50
 *  *****************************************************************************
 */

/*
 *
 * Works on all modern browsers.
 *
 * */

const ua = navigator.userAgent.toLowerCase();
const isAndroid = /android/.test(ua);
const isiOs = /(iphone|ipod|ipad)/.test(ua);
const isStandAlone = window.navigator.standalone;
const isiPad = ua.match(/ipad/);
const isDevice = 'ontouchstart' in window;
const isChrome = "chrome" in window;
const isMoz = "mozAnimationStartTime" in window;


String.prototype.asId = function () {
	return this.replace(/[^a-zA-Z0-9_]+/g, '');
};

function supportType(audioType) {
	const myAudio = document.createElement('audio');
	let isSupp = myAudio.canPlayType && myAudio.canPlayType(audioType);
	if (isSupp == "") {
		isSupp = false;
	} else {
		isSupp = true;
	}
	return isSupp;
}

(function ($) {
	
	$.mbAudio = {
		name             : "mb.audio",
		author           : "Matteo Bicocchi",
		version          : "1.5",
		defaults         : {
			id    : "",
			ogg   : "",
			mp3   : "",
			loop  : false,
			volume: 10
		},
		sounds           : {},
		players          : {},
		loaded           : {},
		playing          : [],
		ch               : [],
		soundsMutedByHand: false,
		
		build: function (sound) {
			
			if (!$.mbAudio.isInit) {
				$(window).on("blur", function () {
					
					$.mbAudio.soundsMutedByHand = true;
					$.mbAudio.muteAllSounds();
				}).on("focus", function () {
					
					$.mbAudio.soundsMutedByHand = false;
					$.mbAudio.unMuteAllSounds();
				});
				
				$.mbAudio.isInit = true;
				
			}
			
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			
			if ($.mbAudio.loaded[sID] != 1) {
				const url = supportType("audio/mpeg") ? soundEl.mp3 : soundEl.ogg;
				
				$.mbAudio.players[sID] = new Audio(url);
				$.mbAudio.players[sID].load();
				$.mbAudio.players[sID].pause();
				
				$.mbAudio.loaded[sID] = 1;
			}
		},
		
		getPlayer: function (ID) {
			const el = document.getElementById("mbAudio_" + ID);
			if ($(el).length == 0 || !$.mbAudio.players[ID]) {
				const soundEl = typeof ID == "string" ? $.mbAudio.sounds[ID] : ID;
				const sID = soundEl.id ? soundEl.id : (typeof soundEl == "string" ? soundEl : soundEl.mp3.split(".")[0].asId());
				ID = sID;
			}
			
			return $.mbAudio.players[ID];
		},
		
		preload: function () {
			for (let sID in $.mbAudio.sounds) {
				$.mbAudio.build(sID);
			}
			
			$(document).trigger("soundsLoaded");
		},
		
		play: function (sound, sprite, callback) {
			
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			
			if (!soundEl)
				return;
			
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			const loop = soundEl.loop ? soundEl.loop : $.mbAudio.defaults.loop;
			let volume = typeof soundEl.volume == "number" ? soundEl.volume : $.mbAudio.defaults.volume;
			volume = volume > 10 ? 10 : volume;
			
			//if ($.mbAudio.loaded[sID] != 1)
			$.mbAudio.build(sound);
			
			const player = $.mbAudio.getPlayer(sID);
			player.vol = volume;
			
			if (!$.mbAudio.allMuted)
				player.volume = player.vol / 10;
			else
				player.volume = 0;
			
			$(player).off("ended." + sID + ",paused." + sID);
			
			if (typeof sprite == "undefined")
				sprite = true;
			
			/*Manage sprite*/
			
			if (sprite && (typeof sprite == "string" || typeof sprite == "object")) {
				
				sprite = typeof sprite == "string" ? soundEl.sprite[sprite] : sprite;
				
				clearTimeout(player.timeOut);
				
				if (!isAndroid && player.seekable.length == 0) {
					
					const getSeekable = setInterval(function () {
						
						if (player.seekable.length > 0 && player.seekable.end(0) >= sprite.end - 1) {
							
							clearInterval(getSeekable);
							$.mbAudio.manageSprite(player, sID, sound, sprite, callback);
						}
					}, 1)
					
				} else {
					$.mbAudio.manageSprite(player, sID, sound, sprite, callback);
				}
				return;
			}
			
			if (loop) {
				
				$(player).one("ended." + sID + ",paused." + sID, function () {
					this.currentTime = 0;
					
					if (typeof loop == "number") {
						if (typeof player.counter == "undefined")
							player.counter = 0;
						
						player.counter++;
						
						if (player.counter === loop) {
							delete player.counter;
							$.mbAudio.playing.splice(sID, 1);
							delete player.isPlaying;
							if (typeof callback == "function")
								callback(player);
							return;
						}
					}
					
					$.mbAudio.play(sound, sprite, callback);
				});
				
			} else {
				
				$(player).on("ended." + sID + ",paused." + sID, function () {
					
					$.mbAudio.playing.splice(sID, 1);
					delete player.isPlaying;
					
					if (typeof callback == "function")
						callback(player);
					
				});
			}
			
			//player.pause();
			if (player.currentTime && sprite)
				player.currentTime = 0;
			
			player.play();
			
			const idx = jQuery.inArray(sID, $.mbAudio.playing);
			$.mbAudio.playing.splice(idx, 1);
			$.mbAudio.playing.push(sID);
			player.isPlaying = true;
		},
		
		manageSprite: function (player, sID, sound, sprite, callback) {
			
			//player.pause();
			
			function checkStart(player, sID, sound, sprite, callback) {
				player.currentTime = sprite.start;
				
				if (Math.round(player.currentTime) != Math.round(sprite.start)) {
					setTimeout(function () {
						checkStart(player, sID, sound, sprite, callback);
					}, 5);
				} else {
					playerPlay(player, sID, sound, sprite, callback);
				}
			}
			
			checkStart(player, sID, sound, sprite, callback);
			
			function playerPlay(player, sID, sound, sprite, callback) {
				const delay = ((sprite.end - sprite.start) * 1000) + 100;
				let canFireCallback = true;
				player.play();
				player.isPlaying = true;
				player.timeOut = setTimeout(function () {
					if (sprite.loop) {
						canFireCallback = false;
						sprite.loop = sprite.loop == true ? 9999 : sprite.loop;
						if (!player.counter)
							player.counter = 1;
						if (player.counter != sprite.loop && player.isPlaying) {
							player.counter++;
							player.currentTime = sprite.start || 0;
							$.mbAudio.play(sound, sprite, callback);
						} else {
							player.counter = 0;
							canFireCallback = true;
							player.pause();
							delete player.isPlaying;
						}
					} else {
						//player.pause();
						delete player.isPlaying;
					}
					if (canFireCallback && typeof callback == "function")
						callback(player);
					var idx = jQuery.inArray(sID, $.mbAudio.playing);
					$.mbAudio.playing.splice(idx, 1);
				}, delay);
				$.mbAudio.playing.push(sID);
				player.isPlaying = true;
			}
		},
		
		stop: function (sound, callback) {
			
			if (!sound)
				return;
			
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			
			if (!soundEl)
				return;
			
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			
			const player = $.mbAudio.getPlayer(sID);
			
			if ($.mbAudio.loaded[sID] != 1)
				$.mbAudio.build(sound);
			
			//player.pause();
			if (player.currentTime)
				player.currentTime = 0;
			
			$(player).off('ended.' + sID);
			
			if (typeof callback == "function")
				callback(player);
			
			const idx = jQuery.inArray(sID, $.mbAudio.playing);
			$.mbAudio.playing.splice(idx, 1);
			delete player.isPlaying;
			delete player.counter;
			
		},
		
		pause: function (sound, callback) {
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			
			if ($.mbAudio.loaded[sID] != 1) {
				$.mbAudio.build(sound);
			}
			
			const player = $.mbAudio.getPlayer(sID);
			player.pause();
			
			$(player).off('ended.' + sID);
			
			const idx = jQuery.inArray(sID, $.mbAudio.playing);
			if (idx > -1)
				$.mbAudio.playing.splice(idx, 1);
			
			delete player.isPlaying;
			delete player.counter;
			
			clearTimeout(player.timeOut);
			
			if (typeof callback == "function")
				callback();
			
		},
		
		destroy: function (sound) {
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			$.mbAudio.loaded[sID] = 0;
			const idx = jQuery.inArray(sID, $.mbAudio.playing);
			$.mbAudio.playing.splice(idx, 1);
			
			const player = $.mbAudio.getPlayer(sID);
			
			if (!player)
				return;
			
			$(player).remove();
			
		},
		
		muteAllSounds: function () {
			const sounds = $.mbAudio.loaded;
			if (!sounds)
				return;
			
			for (let sID in sounds) {
				const player = $.mbAudio.getPlayer(sID);
				player.vol = player.volume * 10;
				player.volume = 0;
			}
			$.mbAudio.allMuted = true;
		},
		
		unMuteAllSounds: function () {
			const sounds = $.mbAudio.loaded;
			if (!sounds)
				return;
			
			for (let sID in sounds) {
				const player = $.mbAudio.getPlayer(sID);
				player.volume = player.vol / 10;
			}
			$.mbAudio.allMuted = false;
		},
		
		stopAllSounds: function () {
			const sounds = $.mbAudio.loaded;
			if (!sounds)
				return;
			
			
			for (let i in sounds) {
				$.mbAudio.destroy(i);
			}
			$.mbAudio.allMuted = true;
		},
		
		setVolume: function (sound, vol) {
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			
			if ($.mbAudio.loaded[sID] != 1)
				$.mbAudio.build(sound);
			
			const player = $.mbAudio.getPlayer(sID);
			vol = vol > 10 ? 10 : vol;
			player.vol = vol;
			
			player.volume = player.vol;
			
		},
		
		fadeIn: function (sound, sprite, duration, callback) {
			
			if (!duration)
				duration = 3000;
			
			duration = duration / 4;
			
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			
			if ($.mbAudio.loaded[sID] != 1)
				$.mbAudio.build(sound);
			
			const player = $.mbAudio.getPlayer(sID);
			let volume = typeof soundEl.volume == "number" ? soundEl.volume : $.mbAudio.defaults.volume;
			volume = volume > 10 ? 10 : volume;
			
			const step = (volume / 10) / duration;
			
			clearInterval(player.fade);
			
			player.play();
			if (player.currentTime)
				player.currentTime = 0;
			
			player.volume = 0;
			
			if (!$.mbAudio.allMuted) {
				let v = 0;
				player.fade = setInterval(function () {
					
					if (v >= volume / 10) {
						clearInterval(player.fade);
						if (typeof (callback) == "function")
							callback(player);
						return;
					}
					
					player.volume = v;
					v += step;
					
				}, 0);
			}
			
			$.mbAudio.playing.push(sID);
			player.isPlaying = true;
			
		},
		
		fadeOut: function (sound, duration, callback) {
			
			if (!duration)
				duration = 3000;
			
			duration = duration / 4;
			
			const soundEl = typeof sound == "string" ? $.mbAudio.sounds[sound] : sound;
			const sID = soundEl.id ? soundEl.id : (typeof sound == "string" ? sound : sound.mp3.split(".")[0].asId());
			
			if ($.mbAudio.loaded[sID] != 1)
				$.mbAudio.build(sound);
			
			const player = $.mbAudio.getPlayer(sID);
			let volume = player.volume ? player.volume * 10 : (typeof soundEl.volume == "number" ? soundEl.volume : $.mbAudio.defaults.volume);
			volume = volume > 10 ? 10 : volume;
			
			const step = (volume / 10) / duration;
			
			clearInterval(player.fade);
			
			player.volume = volume / 10;
			player.play();
			
			let v = player.volume;
			
			player.fade = setInterval(function () {
				
				if (v <= 0) {
					v = 0;
					clearInterval(player.fade);
					
					player.volume = 0
					player.isPlaying = false;
					const idx = jQuery.inArray(sID, $.mbAudio.playing);
					$.mbAudio.playing.splice(idx, 1);
					
					player.pause();
					
					if (typeof (callback) == "function")
						callback(player);
					
					return;
				}
				
				player.volume = v;
				v -= step;
				
			}, 0);
		},
		
		queue: {
			isStarted: false,
			
			add: function (soundID, sprite, callback, hasPriority) {
				
				const channelName = typeof soundID == "string" ? soundID : soundID.mp3.split(".")[0].asId();
				let c = $.mbAudio.queue.get(channelName);
				if (c == null)
					c = new Channel(soundID);
				
				const soundEl = typeof soundID == "string" ? $.mbAudio.sounds[soundID] : soundID;
				
				if (!soundEl.started) {
					$.mbAudio.pause(soundID);
					soundEl.started = true;
				}
				
				sprite = typeof sprite == "string" ? soundEl.sprite[sprite] : sprite;
				
				const sEL = {};
				
				sEL.soundID = soundID;
				sEL.sprite = sprite;
				sEL.channel = c;
				sEL.hasPriority = hasPriority;
				sEL.callback = callback;
				
				if (!$.mbAudio.queue.isStarted)
					$.mbAudio.queue.startEngine();
				
				if (!$.mbAudio.soundsMutedByHand) {
					if (sEL.hasPriority) {
						sEL.channel.playingSounds.splice(0, 1);
						sEL.channel.soundInPlay = null;
						c.playingSounds.unshift(sEL);
					} else {
						c.playingSounds.push(sEL);
					}
				}
			},
			
			get: function (name) {
				for (let i in $.mbAudio.ch) {
					if ($.mbAudio.ch[i].name == name)
						return $.mbAudio.ch[i];
				}
			},
			
			manage: function () {
				
				function manageQueue(channel) {
					
					if (channel.soundInPlay == null && channel.playingSounds && channel.playingSounds.length > 0 && !$.mbAudio.soundsMutedByHand && !channel.isMuted) {
						channel.soundInPlay = channel.playingSounds[0];
						
						function callback() {
							if (typeof channel.soundInPlay.callback == "function")
								channel.soundInPlay.callback();
							
							channel.playingSounds.splice(0, 1);
							channel.soundInPlay = null;
							
							
						}
						
						$.mbAudio.play(channel.soundInPlay.soundID, channel.soundInPlay.sprite, callback);
						
					} else if (channel.soundInPlay != null && channel.soundInPlay.soundID && ($.mbAudio.soundsMutedByHand || channel.isMuted)) {
						$.mbAudio.pause(channel.soundInPlay.soundID);
						channel.playingSounds = [];
						channel.playingSounds.unshift(channel.soundInPlay);
						channel.soundInPlay = null;
					}
				}
				
				for (let ci in $.mbAudio.ch) {
					const channel = $.mbAudio.ch[ci];
					manageQueue(channel);
				}
				
			},
			
			mute: function (channel) {
				if (!channel)
					$.mbAudio.soundsMutedByHand = true;
				else {
					const ch = $.mbAudio.queue.get(channel);
					if (ch)
						ch.isMuted = true;
					$.mbAudio.pause(channel)
					
				}
				
			},
			
			unMute: function (channel) {
				if (!channel)
					$.mbAudio.soundsMutedByHand = false;
				else {
					const ch = $.mbAudio.queue.get(channel);
					if (ch)
						ch.isMuted = false;
				}
			},
			
			clear: function (name) {
				const channel = $.mbAudio.queue.get(name);
				if (channel) {
					if (channel.soundInPlay != null)
						$.mbAudio.pause(channel.soundInPlay.soundID);
					channel.soundInPlay = null;
					channel.playingSounds = [];
				}
			},
			
			startEngine: function () {
				$.mbAudio.channelsEngine = setInterval($.mbAudio.queue.manage, 1);
				$.mbAudio.queue.isStarted = true;
			},
			
			stopEngine: function () {
				clearInterval($.mbAudio.channelsEngine);
				$.mbAudio.queue.isStarted = false;
			}
		}
	};
	
	function Channel(soundID) {
		this.name = typeof soundID == "string" ? soundID : soundID.mp3.split(".")[0].asId();
		this.soundInPlay = null;
		this.playingSounds = [];
		this.isMuted = false;
		$.mbAudio.ch.push(this);
	}
	
	
})(jQuery);
