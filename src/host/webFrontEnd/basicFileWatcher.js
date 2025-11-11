/*
   BASIC File Watcher
   Monitors a file called "current.basic" and auto-loads it when modified
*/

import { writeBasicProgramToRam, autoRunBasicProgram } from "../../tools/basicTokenizer";

let c64;
let isWatching = false;
let lastModified = null;
let checkInterval = null;

const WATCH_INTERVAL = 1000; // Check every second
const FILE_PATH = '/current.basic'; // Relative to the web root

export function initBasicFileWatcher(nascentC64) {
  c64 = nascentC64;
  console.log('BASIC File Watcher initialized');
}

export function startWatching() {
  if (isWatching) return;
  
  isWatching = true;
  console.log('Starting to watch for current.basic changes...');
  
  // Try to load the file immediately on start
  setTimeout(() => {
    loadBasicFile().catch(err => {
      console.log('No current.basic file found on startup (this is ok)');
    });
  }, 1000); // Wait 1 second for C64 to be fully initialized
  
  checkInterval = setInterval(async () => {
    try {
      const response = await fetch(FILE_PATH, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const modified = response.headers.get('Last-Modified');
        
        if (lastModified && modified !== lastModified) {
          console.log('Detected change in current.basic, reloading...');
          await loadBasicFile();
        }
        
        lastModified = modified;
      }
    } catch (error) {
      // File doesn't exist or network error - that's ok
      if (lastModified !== null) {
        console.log('current.basic no longer accessible');
        lastModified = null;
      }
    }
  }, WATCH_INTERVAL);
}

export function stopWatching() {
  if (!isWatching) return;
  
  isWatching = false;
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  console.log('Stopped watching current.basic');
}

async function loadBasicFile() {
  try {
    const response = await fetch(FILE_PATH, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.warn('Failed to load current.basic:', response.status);
      return;
    }
    
    const content = await response.text();
    
    if (!content || content.trim() === "") {
      console.warn('current.basic is empty');
      return;
    }
    
    console.log('Loading BASIC program:', content.substring(0, 100) + '...');
    
    // Write the program to C64 RAM
    writeBasicProgramToRam(c64, content);
    
    // Auto-run the program
    setTimeout(() => {
      autoRunBasicProgram(c64);
    }, 100); // Small delay to ensure the program is fully loaded
    
    console.log('✓ Auto-loaded BASIC program from current.basic');
    console.log('Program will auto-run in a moment...');
    
    // Show notification to user
    showNotification('Program reloaded and running...');
  } catch (error) {
    console.error('Error loading current.basic:', error);
    showNotification('Error loading program: ' + error.message);
  }
}

function showNotification(message) {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  notification.style.color = '#0f0';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '10000';
  notification.style.fontFamily = 'monospace';
  notification.style.fontSize = '14px';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}
