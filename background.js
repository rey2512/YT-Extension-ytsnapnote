chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'takeScreenshot') {
    // Capture the visible tab
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
      // Save the screenshot and note data
      saveNote({
        screenshot: dataUrl,
        note: request.data.noteText,
        videoUrl: request.data.videoUrl,
        timestamp: request.data.timestamp,
        videoTime: request.data.currentTime,
        videoTitle: request.data.videoTitle
      });
      
      // Notify the user
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'notificationSuccess',
        message: 'Note saved successfully!'
      });
    });
  }
});

// Function to save note to chrome.storage.local
function saveNote(noteData) {
  chrome.storage.local.get('snapnotes', function(data) {
    const notes = data.snapnotes || [];
    notes.unshift(noteData); // Add new note at the beginning
    chrome.storage.local.set({ 'snapnotes': notes });
  });
}