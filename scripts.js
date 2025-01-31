var speechState, synth, speechBreakpoint, useBreakpoints;
synth = window.speechSynthesis;
function Widget(nodeName, appendTo){
  this.outer = document.createElement(nodeName || 'DIV');
  this.outer.className = 'visualHelper-' + chrome.runtime.id;
  (appendTo || document.body).appendChild(this.outer);
}

Widget.prototype.show = function(){
  this.outer.style.display = 'block';
  return this;
};

Widget.prototype.hide = function(){
  this.outer.style.display = 'none';
  return this;
};

function SpeechState() {
	this.utters = [];
	this.utter = null;
	this.reader = null;
	this.ended = true;
	this.cleanup = function() {
		if ( this.reader ) {
			this.reader.outer.remove();
			this.reader = null;
		}
		if ( !this.ended  ){
			synth.cancel();	
			synth.speak( new SpeechSynthesisUtterance("") );
			synth.resume();
			this.utter = null;
			this.ended = true;
		}
	}
}
function SpeechSegment(index, text) {
	this.index = index;
	this.text = text;
}

function makeSpeechSegments( request ) {
	var text = request.text;
	var point = 0;
	var index = 0;
	var speechBreakpoint = request.settings.wordBreakpoints;
	var segments = [];
	var words = text.split(" ");
	var subset = words.slice( point, point + speechBreakpoint );
	while ( subset.length > 0 ) {
		var segment = new SpeechSegment(
			index,
			subset.join(" "));
		segments.push( segment );
		point += speechBreakpoint;
		index ++;
		subset = words.slice( point, point + speechBreakpoint );
	}
	return segments;
}
	
speechState = new SpeechState;

function doCleanup() {
	function resolver( resolve, reject ) {
		//cancel existing if needed
		speechState.cleanup();
		setTimeout( resolve, 0 );
	}
	return new Promise(resolver);
}
function errorInCleanup() {
	console.error("errorInCleanup ", arguments);
}

function findTargetVoice(targetVoice) {
	function resolver(resolve, reject) {
		var voices =synth.getVoices();
		for ( var index in voices ) {
			var voice = voices[ index ];
			if ( 
			    ( targetVoice && targetVoice === voice.name )
			    ||
			   ( !targetVoice && voice.default )
			 ) {
				resolve(voices[ index ]);
				return;
			}
		}
		reject();
	}
	return new Promise(resolver);
}
function startConverting(request) {
	var segments = [], defaultVoice;
	function onNoVoiceAvailable() {
		console.error("No default voice found");
	}
	function findNextSegment() {
		return segments[ speechState.segment.index + 1 ];
	}
	function findPrevSegment() {
		return segments[ speechState.segment.index - 1 ];
	}

	function onClickNext() {
		var segment = findNextSegment();
		function onCleanup() {
			speakSegment( segment );
		}
		if ( segment ) {
			doCleanup().then(onCleanup, errorInCleanup);
		}
	}
	function onClickPrev() {
		var segment = findPrevSegment();
		function onCleanup() {
			speakSegment( segment );
		}
		if ( segment ) {
			doCleanup().then(onCleanup, errorInCleanup);
		}

	}
	function onUtteranceEnd() {
		function onCleanup() {
			var lastSegment = segments[ segments.length - 1], nextSegment;
			if ( speechState.segment.index !== lastSegment.index ) {

				nextSegment = segments[ speechState.segment.index + 1 ];
				console.log("playback on segment " + nextSegment.index);
				speakSegment( nextSegment );
				return;
			}
		}
		if ( this === speechState.utter  ){ 
			doCleanup().then(onCleanup, errorInCleanup);
		}
	}
	function onClickStop() {
		function onCleanup() {
		}
		doCleanup().then(onCleanup, errorInCleanup);
	}

	function onUtteranceMark() {
		console.log("onUtteranceMark ", arguments);
	}
	function onUtteranceError() {
		console.log("onUtteranceError " , arguments);
		speechState.cleanup();
	}
	function onUtteranceBoundary(event) {
	}
	
	function speakSegment(segment) {
		var utterThis = new SpeechSynthesisUtterance( segment.text ), nextSegment, prevSegment, wordBreakpointsOn;
		
		speechState.segment = segment;
		nextSegment = findNextSegment();
		prevSegment = findPrevSegment();
		wordBreakpointsOn = request.settings.wordBreakpointsOn;
		
		utterThis.voice = defaultVoice;
		utterThis.onend = onUtteranceEnd;
		utterThis.onmark = onUtteranceMark;
		utterThis.onerror = onUtteranceError;
		utterThis.onboundary = onUtteranceBoundary;
		speechState.utters.push( utterThis );
		speechState.utter = utterThis;
		synth.speak( utterThis );
		speechState.ended = false;
		var screenReader = new Widget();
		var screenReaderText = document.createElement("div");
		screenReaderText.setAttribute("id", "text");
		var p = document.createElement("p");
		p.innerHTML = segment.text;
		screenReaderText.appendChild( p );

		screenReader.outer.appendChild( screenReaderText );
		var screenReaderControls = document.createElement("div");
		screenReaderControls.setAttribute("id", "controls");

		var stopBtn = document.createElement("button");
		stopBtn.onclick = onClickStop;
		stopBtn.setAttribute("class", "control-button stop");
		stopBtn.innerHTML = "Stop";
		screenReaderControls.appendChild(stopBtn);
		if ( wordBreakpointsOn && prevSegment ) {
			var prevBtn = document.createElement("button");
			prevBtn.onclick = onClickPrev;
			prevBtn.setAttribute("class", "control-button prev");
			prevBtn.innerHTML = "Previous";
			screenReaderControls.appendChild(prevBtn);
		}
	 	if ( wordBreakpointsOn && nextSegment ) {
			var nextBtn = document.createElement("button");
			nextBtn.setAttribute("class", "control-button next");
			nextBtn.onclick = onClickNext;
			nextBtn.innerHTML = "Next";
			screenReaderControls.appendChild(nextBtn);
		}
		screenReader.outer.appendChild(screenReaderControls);

		speechState.reader=screenReader;
		screenReader.show();

	}
	function onDefaultVoice(voice) {
		defaultVoice = voice;
		if ( request.settings.wordBreakpointsOn ) {
			segments = makeSpeechSegments(request);
			if ( segments.length > 0 ) {
				speakSegment( segments[ 0 ] );
			}
			return;
		}
		var segment = new SpeechSegment( 0, request.text );
		speakSegment( segment );
	}
	findTargetVoice(request.voice).then(onDefaultVoice, onNoVoiceAvailable);

}


function onMessageReceived(request, sender, sendResponse) {
	console.log("Received message ", request);
	doCleanup().then(function() {
		startConverting( request );
		sendResponse(null);
	}, function() {
		console.error("doReaderCleanup error");
	});
}
function onWindowUnload() {
	doCleanup().then(function() {
		console.log("Window unload cleanedup");
	}, function() {
		console.error("Error in cleanup..");
	});
}
function onTabUpdated() {
	doCleanup().then(function() {
		console.log("Tab update cleanedup");
	}, function() {
		console.error("Error in cleanup..");
	});

}
console.log("Loaded visual helper content script");
chrome.runtime.onMessage.addListener(onMessageReceived);
window.addEventListener("unload", onWindowUnload);
chrome.tabs.onUpdated.addListener(onTabUpdated);
