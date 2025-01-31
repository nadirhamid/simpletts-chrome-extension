
var activeTab;

function sendToActiveTab(msg) { console.log("Sending message to active tab ", msg);
	function onTabQuery( tabs ) {
		if ( !tabs ) {
			console.error("No active tab found");
			return;
		}
		activeTab = tabs[ 0 ];
		chrome.tabs.sendMessage( activeTab.id, msg, onMessageSent);
	}
	function onMessageSent(response) {
		console.log("Sent message to active tab");
	}
	chrome.tabs.query({"active": true}, onTabQuery);
}
function onRightClickMenuOption(info, tab) {
	console.log("Text to speech for " + info.selection);	
	function onStorage(items) {
		voice = items.voice;
		sendToActiveTab({
			text: info.selectionText,
			voice: voice,
			settings: items});
	}
	chrome.storage.sync.get({
		"voice": null,
		"wordBreakpointsOn": false,
		"wordBreakpoints": null
	}, onStorage);
}

console.log("Creating context menu");
chrome.contextMenus.create({
  title: "Simple Text To Speech: %s",
  contexts:["selection"], 
  onclick: onRightClickMenuOption
});
