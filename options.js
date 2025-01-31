var synth = window.speechSynthesis;
var voicesEl = document.getElementById("voices");
var form = document.forms['options'];
function onStorageSet() {
	alert("Options saved!");
}
function onFormSubmit(evt) { 
	evt.preventDefault();
	var voice =voicesEl.value;
	var wordBreakpointsOn = false;
	var wordBreakpoints = null;
	var wordBreakpointsEl = document.querySelector("#wordBreakpoints");

	var wordBreakpointsNumberEl = document.querySelector("#wordBreakpointsNumber");
	if ( wordBreakpointsEl.checked ) {
		wordBreakpointsOn = true;
	   	wordBreakpoints = parseInt(wordBreakpointsNumberEl.value);
	}
	chrome.storage.sync.set({ 
		"voice": voice,
		wordBreakpointsOn: wordBreakpointsOn,
		wordBreakpoints: wordBreakpoints}, onStorageSet);
}
function populateVoiceList() {
	var voices = synth.getVoices();
	var wrapper = document.querySelector("#wordBreakpointsOn");

	function onChangeWordbreakpoints() {
		if ( this.checked ) { 
			wrapper.style.display =  'block';
			return;
		}
		wrapper.style.display =  'none';
	}
	function onStorage( items ) {
		var targetVoice = items.voice;
		for ( var index in voices ) {
			var opt = document.createElement("option");
			var voice = voices[ index ];
			opt.setAttribute("value", voice.name);
			opt.innerHTML =  voice.name;
			if ( targetVoice && targetVoice === voice.name ){
				opt.setAttribute("selected", "selected");
			}
			voicesEl.appendChild( opt );
		}
		if ( items.wordBreakpointsOn ) {
			wrapper.style.display =  'block';
		}
		var number = document.querySelector("#wordBreakpointsNumber");
		number.value = "2048";
		if ( items.wordBreakpoints ) {
			number.value = items.wordBreakpoints.toString();
		}
		var breakpoints = document.querySelector("#wordBreakpoints");
		if ( items.wordBreakpointsOn ) {
			breakpoints.checked = true;
		}
		breakpoints.onchange = onChangeWordbreakpoints;
	}
	chrome.storage.sync.get({
		"voice": null,
		"wordBreakpointsOn": false,
		"wordBreakpoints": null
	}, onStorage);
}
form.onsubmit = onFormSubmit;
synth.onvoiceschanged =  populateVoiceList;
console.log("Loading options..");
