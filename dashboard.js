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
    
    // Sort notes by timestamp (newest first)
    notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Add each note to the container
    notes.forEach(function(note, index) {
      const noteElement = createNoteCard(note, index);
      notesContainer.appendChild(noteElement);
    });
  });
}

function createNoteCard(note, index) {
  const noteCard = document.createElement('div');
  noteCard.className = 'note-card';
  noteCard.dataset.index = index;
  
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
      <button class="delete-note" data-index="${index}">&times;</button>
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
  noteCard.querySelector('.delete-note').addEventListener('click', function(e) {
    e.stopPropagation();
    deleteNote(index);
  });
  
  return noteCard;
}

function deleteNote(index) {
  chrome.storage.local.get(['snapnotes'], function(result) {
    let notes = result.snapnotes || [];
    
    // Remove the note at the specified index
    notes.splice(index, 1);
    
    // Save back to storage
    chrome.storage.local.set({ 'snapnotes': notes }, function() {
      console.log('Note deleted');
      loadNotes(); // Refresh the notes list
    });
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
    chrome.storage.local.set({ 'snapnotes': [] }, function() {
      console.log('All notes cleared');
      loadNotes(); // Refresh the notes list
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