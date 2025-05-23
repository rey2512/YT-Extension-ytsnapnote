document.addEventListener('DOMContentLoaded', function() {
  loadNotes();
  
  // Set up search functionality
  document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    filterNotes(searchTerm);
  });
  
  // Set up clear all notes button
  document.getElementById('clearAllBtn').addEventListener('click', function() {
    showConfirmDialog();
  });
  
  // Set up dark mode toggle
  const darkModeToggle = document.createElement('button');
  darkModeToggle.id = 'darkModeToggle';
  darkModeToggle.className = 'btn secondary small-toggle';
  darkModeToggle.innerHTML = '⏾';
  darkModeToggle.title = 'Toggle Dark Mode';
  
  // Add the button to the controls section
  const controlsSection = document.querySelector('.controls');
  controlsSection.appendChild(darkModeToggle);
  
  // Check if dark mode was previously enabled
  chrome.storage.local.get(['darkMode'], function(result) {
    if (result.darkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '☀︎';
    }
  });
  
  // Add event listener for dark mode toggle
  darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Update button text
    this.innerHTML = isDarkMode ? '☀︎' : '⏾';
    
    // Save preference
    chrome.storage.local.set({ 'darkMode': isDarkMode });
  });
});

function loadNotes() {
  chrome.storage.local.get(['snapnotes'], function(result) {
    const notes = result.snapnotes || [];
    const notesContainer = document.getElementById('notesContainer');
    
    if (notes.length === 0) {
      notesContainer.innerHTML = `
        <div class="empty-state">
          <h2>No notes yet</h2>
          <p>Take snapshots while watching YouTube videos to add notes here.</p>
        </div>
      `;
      return;
    }
    
    // Clear container
    notesContainer.innerHTML = '';
    
    // Add unique IDs to notes if they don't have one
    notes.forEach((note, i) => {
      if (!note.id) note.id = Date.now() + '-' + i;
    });
    
    // Save notes with IDs back to storage
    chrome.storage.local.set({ 'snapnotes': notes });
    
    // Sort notes by timestamp (newest first)
    notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Add each note to the container
    notes.forEach(function(note) {
      const noteElement = createNoteCard(note);
      notesContainer.appendChild(noteElement);
    });
  });
}

function createNoteCard(note) {
  const noteCard = document.createElement('div');
  noteCard.className = 'note-card';
  noteCard.dataset.id = note.id;
  
  // Format the timestamp properly
  const timestamp = note.timestamp ? new Date(note.timestamp) : new Date();
  const formattedDate = formatDate(timestamp);
  
  // Format the video time
  const videoTime = formatVideoTime(note.currentTime);
  
  // Check if screenshot data exists and is valid
  const screenshotSrc = note.screenshotDataUrl && 
                        note.screenshotDataUrl.startsWith('data:image') ? 
                        note.screenshotDataUrl : 
                        'placeholder.png';
  
  noteCard.innerHTML = `
    <div class="note-card-header">
      <div class="note-title">${note.videoTitle || 'YouTube Video'}</div>
      <button class="delete-note" data-id="${note.id}">&times;</button>
    </div>
    <div class="note-thumbnail">
      <img src="${screenshotSrc}" alt="Video snapshot" onerror="this.src='placeholder.png';">
      <div class="timestamp-badge">${videoTime}</div>
    </div>
    <div class="note-content">
      <p>${note.noteText || 'No note text'}</p>
    </div>
    <div class="note-footer">
      <div class="note-date">${formattedDate}</div>
      <a href="${note.videoUrl || '#'}" target="_blank" class="open-yt btn secondary">Open in YouTube</a>
    </div>
  `;
  
  // Add delete functionality
  const deleteBtn = noteCard.querySelector('.delete-note');
  deleteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const noteId = this.getAttribute('data-id');
    deleteNote(noteId);
  });
  
  // Add fullscreen functionality
  const thumbnail = noteCard.querySelector('.note-thumbnail');
  thumbnail.addEventListener('click', function() {
    showFullscreenImage(note);
  });
  
  return noteCard;
}

// Add this new function for fullscreen view
function showFullscreenImage(note) {
  // Create fullscreen overlay
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-overlay';
  
  // Check if screenshot data exists and is valid
  const screenshotSrc = note.screenshotDataUrl && 
                      note.screenshotDataUrl.startsWith('data:image') ? 
                      note.screenshotDataUrl : 
                      'placeholder.png';
  
  // Format the video time
  const videoTime = formatVideoTime(note.currentTime);
  
  overlay.innerHTML = `
    <div class="fullscreen-content">
      <img src="${screenshotSrc}" alt="Video snapshot" class="fullscreen-image" id="zoomableImage">
      <div class="fullscreen-note">
        <h2>${note.videoTitle || 'YouTube Video'}</h2>
        <p>${note.noteText || 'No note text'}</p>
        <div>Timestamp: ${videoTime}</div>
      </div>
      <div class="fullscreen-controls">
        <button class="zoom-btn" id="zoomIn">Zoom In (+)</button>
        <button class="zoom-btn" id="zoomOut">Zoom Out (-)</button>
        <button class="zoom-btn" id="resetZoom">Reset</button>
      </div>
    </div>
    <button class="fullscreen-close">&times;</button>
  `;
  
  document.body.appendChild(overlay);
  
  // Add close functionality
  const closeBtn = overlay.querySelector('.fullscreen-close');
  closeBtn.addEventListener('click', function() {
    document.body.removeChild(overlay);
  });
  
  // Add escape key to close
  document.addEventListener('keydown', function escapeHandler(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  
  // Add zoom functionality
  let zoomLevel = 1;
  const image = document.getElementById('zoomableImage');
  
  document.getElementById('zoomIn').addEventListener('click', function() {
    zoomLevel += 0.2;
    updateZoom();
  });
  
  document.getElementById('zoomOut').addEventListener('click', function() {
    zoomLevel = Math.max(0.5, zoomLevel - 0.2);
    updateZoom();
  });
  
  document.getElementById('resetZoom').addEventListener('click', function() {
    zoomLevel = 1;
    updateZoom();
  });
  
  function updateZoom() {
    image.style.transform = `scale(${zoomLevel})`;
    image.style.transformOrigin = 'center center';
    image.style.transition = 'transform 0.2s ease';
  }
}

function deleteNote(noteId) {
  chrome.storage.local.get(['snapnotes'], function(result) {
    let notes = result.snapnotes || [];
    
    // Find the note by ID
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
      // Remove the note with the matching ID
      notes.splice(noteIndex, 1);
      
      // Save back to storage
      chrome.storage.local.set({ 'snapnotes': notes }, function() {
        console.log('Note deleted with ID:', noteId);
        // Refresh the notes list
        loadNotes();
      });
    } else {
      console.error('Note not found with ID:', noteId);
    }
  });
}

function filterNotes(searchTerm) {
  const noteCards = document.querySelectorAll('.note-card');
  
  noteCards.forEach(function(card) {
    const title = card.querySelector('.note-title').textContent.toLowerCase();
    const content = card.querySelector('.note-content p').textContent.toLowerCase();
    
    if (title.includes(searchTerm) || content.includes(searchTerm)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function showConfirmDialog() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Clear All Notes</h2>
      <p>Are you sure you want to delete all your notes? This action cannot be undone.</p>
      <div class="modal-actions">
        <button id="cancelClear" class="btn secondary">Cancel</button>
        <button id="confirmClear" class="btn danger">Delete All</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('cancelClear').addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  
  document.getElementById('confirmClear').addEventListener('click', function() {
    // Clear all notes by setting an empty array
    chrome.storage.local.set({ 'snapnotes': [] }, function() {
      console.log('All notes cleared');
      // Refresh the notes list
      loadNotes();
      document.body.removeChild(modal);
    });
  });
}

// Helper function to format date
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return 'Unknown date';
  }
  
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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