document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on YouTube
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const isYouTube = currentTab.url && currentTab.url.includes('youtube.com/watch');
    
    document.getElementById('notOnYouTube').classList.toggle('hidden', isYouTube);
    document.getElementById('onYouTube').classList.toggle('hidden', !isYouTube);
    
    // Set up capture button
    document.getElementById('captureBtn').addEventListener('click', function() {
      if (isYouTube) {
        console.log('Capture button clicked, sending message to content script');
        chrome.tabs.sendMessage(currentTab.id, { action: "captureSnapshot" }, function(response) {
          // Handle potential error
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError.message);
          }
          // Close the popup after clicking the button
          window.close();
        });
      }
    });
    
    // Set up view notes button
    document.getElementById('viewNotesBtn').addEventListener('click', function() {
      chrome.tabs.create({ url: 'dashboard.html' });
    });
  });
  
  // Load and display saved notes
  loadSavedNotes();
});

// Function to load saved notes from storage
function loadSavedNotes() {
  chrome.storage.local.get(['snapnotes'], function(result) {
    console.log('Retrieved notes from storage:', result);
    const notes = result.snapnotes || [];
    
    // Try to find the notes container by different possible IDs
    const notesContainer = document.getElementById('recentNotes') || 
                          document.getElementById('myNotes') || 
                          document.querySelector('.notes-section');
    
    if (!notesContainer) {
      console.error('Notes container not found in DOM');
      return; // Exit if container doesn't exist
    }
    
    if (notes.length === 0) {
      console.log('No notes found in storage');
      notesContainer.innerHTML = '<p class="no-notes">No saved notes yet. Take a snapshot to add notes!</p>';
      return;
    }
    
    // Clear container
    notesContainer.innerHTML = '';
    
    // Add the most recent notes (up to 3)
    const recentNotes = notes.slice(-3).reverse();
    recentNotes.forEach(function(note, index) {
      console.log(`Processing note ${index}:`, note);
      const noteElement = createNoteElement(note);
      notesContainer.appendChild(noteElement);
    });
  });
}

// Function to create a note element
function createNoteElement(note) {
  const noteDiv = document.createElement('div');
  noteDiv.className = 'note-item';
  
  // Format the timestamp properly
  const timestamp = note.timestamp ? new Date(note.timestamp) : new Date();
  const formattedDate = formatDate(timestamp);
  
  // Format the video time
  const videoTime = formatVideoTime(note.currentTime);
  
  // Check if screenshot data exists and is valid
  const screenshotSrc = note.screenshotDataUrl && 
                        note.screenshotDataUrl.startsWith('data:image') ? 
                        note.screenshotDataUrl : 
                        'placeholder.png'; // Use a placeholder image if data is invalid
  
  // Ensure we have valid data for all fields
  const videoTitle = note.videoTitle || 'YouTube Video';
  const noteText = note.noteText || 'No note text';
  const videoUrl = note.videoUrl || '#';
  
  noteDiv.innerHTML = `
    <div class="note-screenshot">
      <img src="${screenshotSrc}" alt="Video snapshot" onerror="this.src='placeholder.png';">
    </div>
    <div class="note-content">
      <h3 title="${videoTitle}">${videoTitle}</h3>
      <p class="note-text">${noteText}</p>
      <div class="note-meta">
        <a href="${videoUrl}" target="_blank" class="video-link">Watch at ${videoTime}</a>
        <span class="timestamp">${formattedDate}</span>
      </div>
    </div>
  `;
  
  return noteDiv;
}

// Helper function to format date
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return 'Unknown date';
  }
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Helper function to format video time
function formatVideoTime(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '0:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

// Listen for note added message from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'noteAdded') {
    loadSavedNotes(); // Refresh notes when a new one is added
  }
});