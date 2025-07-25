// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "captureSnapshot") {
    captureYouTubeSnapshot();
  }
});

// Function to capture the YouTube video frame
function captureYouTubeVideo() {
  const video = document.querySelector('video');
  if (!video) {
    console.error('No video element found');
    return null;
  }

  // Create a canvas element to capture the video frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Draw the current video frame to the canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert canvas to data URL
  return canvas.toDataURL('image/png');
}

function captureYouTubeSnapshot() {
  // Get current video timestamp
  const video = document.querySelector('video');
  if (!video) return;
  
  const currentTime = video.currentTime;
  const videoId = new URLSearchParams(window.location.search).get('v');
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(currentTime)}`;
  const videoTitle = document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim() || 'YouTube Video';
  
  // First capture the video frame
  const screenshotDataUrl = captureYouTubeVideo();
  
  if (!screenshotDataUrl) {
    alert('Failed to capture video. Please try again.');
    return;
  }
  
  // Create note input overlay
  const overlay = document.createElement('div');
  overlay.className = 'snapnote-overlay';
  overlay.innerHTML = `
    <div class="snapnote-modal">
      <h2>Add a note to this snapshot</h2>
      <div class="snapnote-screenshot-container">
        <img src="${screenshotDataUrl}" class="snapnote-screenshot" alt="Video snapshot">
      </div>
      <textarea id="snapnote-input" placeholder="What's important about this moment?" autofocus></textarea>
      <div class="snapnote-actions">
        <button id="snapnote-cancel" class="snapnote-btn secondary">Cancel</button>
        <button id="snapnote-save" class="snapnote-btn primary">Save Note</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Focus the textarea
  setTimeout(() => document.getElementById('snapnote-input').focus(), 100);
  
  // Handle cancel
  document.getElementById('snapnote-cancel').addEventListener('click', function() {
    document.body.removeChild(overlay);
  });
  
  // Handle save
  document.getElementById('snapnote-save').addEventListener('click', function() {
    const noteText = document.getElementById('snapnote-input').value.trim();
    if (!noteText) {
      alert('Please enter a note');
      return;
    }
    
    // Request screenshot from background script
    chrome.runtime.sendMessage({
      action: 'takeScreenshot',
      data: {
        noteText,
        videoUrl,
        currentTime,
        videoTitle,
        timestamp: Date.now(),
        screenshotDataUrl // Pass the already captured screenshot
      }
    });
    
    document.body.removeChild(overlay);
  });
}

// Add styles for overlay
const style = document.createElement('style');
style.textContent = `
  .snapnote-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-family: 'Roboto', Arial, sans-serif;
  }
  
  .snapnote-modal {
    background: #282828;
    border-radius: 8px;
    padding: 20px;
    width: 500px;
    max-width: 90%;
  }
  
  .snapnote-modal h2 {
    margin-top: 0;
    font-size: 18px;
  }
  
  .snapnote-screenshot-container {
    margin: 10px 0;
    text-align: center;
  }
  
  .snapnote-screenshot {
    max-width: 100%;
    max-height: 200px;
    border: 1px solid #555;
    border-radius: 4px;
  }
  
  #snapnote-input {
    width: 100%;
    height: 100px;
    margin: 10px 0;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #555;
    background: #333;
    color: #fff;
    font-family: inherit;
    resize: none;
  }
  
  .snapnote-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  }
  
  .snapnote-btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-weight: bold;
  }
  
  .snapnote-btn.primary {
    background: #FF0000;
    color: white;
  }
  
  .snapnote-btn.secondary {
    background: #333;
    color: white;
    border: 1px solid #555;
  }
`;
document.head.appendChild(style);

// Add keyboard shortcut listener for 'S' key
document.addEventListener('keydown', function(event) {
  // Check if the key pressed is 'S' or 's' (key code 83)
  if ((event.key === 's' || event.key === 'S' || event.keyCode === 83) && 
      !event.ctrlKey && !event.altKey && !event.metaKey) {
    
    // Check if the active element is an input or textarea to avoid triggering while typing
    const activeElement = document.activeElement;
    const isInputField = activeElement.tagName === 'INPUT' || 
                         activeElement.tagName === 'TEXTAREA' || 
                         activeElement.contentEditable === 'true' ||
                         activeElement.isContentEditable;
    
    // Only proceed if not typing in an input field
    if (!isInputField) {
      // Prevent default behavior for this key
      event.preventDefault();
      
      console.log('Snapshot shortcut triggered'); // Debug log
      
      // Trigger the snapshot capture
      captureYouTubeSnapshot();
    }
  }
});

// Make sure the listener is added after the page is fully loaded
window.addEventListener('load', function() {
  console.log('SnapNote keyboard shortcuts initialized'); // Debug log
});