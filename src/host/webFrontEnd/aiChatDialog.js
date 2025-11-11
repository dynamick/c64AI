import { Dialog, closeAllDialogs } from "./dialogs";
import css from "./aiChatDialog.css";
import { extractBasicProgram, basicLinesToText } from "../../tools/basicExtractor";
import { writeBasicProgramToRam } from "../../tools/basicTokenizer";

let c64;
let dialog;
let messagesContainer;
let inputTextarea;
let sendButton;
let confirmationArea;
let errorContainer;

const conversationHistory = [];
let pendingCodeChange = null;
let isWaitingForResponse = false;

// Helper function to fetch file content
async function fetchFileContent(filePath) {
  try {
    const response = await fetch("/api/get-file-content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filePath }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.content;
    } else {
      throw new Error(data.error || "Failed to fetch file content");
    }
  } catch (error) {
    console.error("Error fetching file content:", error);
    return null;
  }
}

export function initAiChatDialog(nascentC64) {
  c64 = nascentC64;
  dialog = new Dialog("aiChatDialog");
  
  messagesContainer = document.getElementById("aiChat-messages");
  inputTextarea = document.getElementById("aiChat-input");
  sendButton = document.getElementById("aiChat-sendButton");
  confirmationArea = document.getElementById("aiChat-confirmationArea");
  errorContainer = document.getElementById("aiChat-error");
  
  sendButton.addEventListener("click", handleSendMessage);
  inputTextarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  document.getElementById("aiChat-confirmButton")?.addEventListener("click", handleConfirmChange);
  document.getElementById("aiChat-rejectButton")?.addEventListener("click", handleRejectChange);
  document.getElementById("aiChat-exportButton")?.addEventListener("click", handleExportCode);
  document.getElementById("aiChat-importButton")?.addEventListener("click", handleImportCode);
  
  // Handle file input change
  const fileInput = document.getElementById("aiChat-importInput");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelected);
  }
  
  // Make dialog draggable
  makeDraggable(dialog.el);
}

export function openAiChatDialog() {
  // Reset position before opening
  if (dialog.el) {
    dialog.el.style.transition = "";
    dialog.el.style.transform = "";
  }
  dialog.open();
  inputTextarea.focus();
}

function addMessage(role, content) {
  conversationHistory.push({ role, content });
  
  const messageEl = document.createElement("div");
  messageEl.className = `aiChat-message ${role}`;
  
  const roleEl = document.createElement("div");
  roleEl.className = "aiChat-message-role";
  roleEl.textContent = role === "user" ? "You" : role === "assistant" ? "AI" : "System";
  
  const contentEl = document.createElement("div");
  contentEl.className = "aiChat-message-content";
  
  // Simple markdown-like formatting for code blocks
  const parts = content.split(/```(\w*)\n([\s\S]*?)```/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Regular text
      if (parts[i].trim()) {
        const textNode = document.createTextNode(parts[i]);
        contentEl.appendChild(textNode);
      }
    } else if (i % 3 === 2) {
      // Code block
      const codeBlock = document.createElement("div");
      codeBlock.className = "aiChat-codeBlock";
      codeBlock.textContent = parts[i];
      contentEl.appendChild(codeBlock);
    }
  }
  
  messageEl.appendChild(roleEl);
  messageEl.appendChild(contentEl);
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = "block";
  setTimeout(() => {
    errorContainer.style.display = "none";
  }, 5000);
}

async function handleSendMessage() {
  if (isWaitingForResponse) return;
  
  const message = inputTextarea.value.trim();
  if (!message) return;
  
  inputTextarea.value = "";
  addMessage("user", message);
  
  isWaitingForResponse = true;
  sendButton.disabled = true;
  
  // Extract current BASIC program from C64 RAM
  let basicProgram = "";
  try {
    const lines = extractBasicProgram(c64);
    basicProgram = basicLinesToText(lines);
  } catch (error) {
    console.error("Error extracting BASIC program:", error);
    basicProgram = "";
  }
  
  // Show loading indicator
  const loadingEl = document.createElement("div");
  loadingEl.className = "aiChat-loading";
  loadingEl.textContent = "AI is thinking...";
  messagesContainer.appendChild(loadingEl);
  
  try {
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: conversationHistory,
        basicProgram: basicProgram,
      }),
    });
    
    // Safely remove loading indicator
    if (loadingEl.parentNode === messagesContainer) {
      messagesContainer.removeChild(loadingEl);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      showError(data.error);
      addMessage("system", `Error: ${data.error}`);
    } else {
      addMessage("assistant", data.response);
      
      // Check if AI wants to modify code
      if (data.codeChange) {
        pendingCodeChange = data.codeChange;
        showConfirmationDialog(data.codeChange);
      }
    }
  } catch (error) {
    // Safely remove loading indicator
    if (loadingEl.parentNode === messagesContainer) {
      messagesContainer.removeChild(loadingEl);
    }
    showError(`Failed to communicate with AI: ${error.message}`);
    addMessage("system", `Error: ${error.message}`);
  } finally {
    isWaitingForResponse = false;
    sendButton.disabled = false;
    inputTextarea.focus();
  }
}

function showConfirmationDialog(codeChange) {
  const { type, description, newProgram } = codeChange;
  
  const descEl = document.getElementById("aiChat-changeDescription");
  descEl.textContent = description || "Modify BASIC program";
  
  const detailsEl = document.getElementById("aiChat-changeDetails");
  
  if (type === "basic") {
    detailsEl.innerHTML = `
      <div><strong>New BASIC Program:</strong></div>
      <div class="aiChat-codeBlock">${escapeHtml(newProgram)}</div>
    `;
  } else {
    // Legacy file system change (shouldn't happen now)
    const { filePath, oldCode, newCode } = codeChange;
    detailsEl.innerHTML = `
      <div><strong>File:</strong> ${filePath}</div>
      <div style="margin-top: 10px;"><strong>Changes:</strong></div>
      ${oldCode ? `<div class="aiChat-codeBlock">${escapeHtml(oldCode)}</div>` : ''}
      <div style="text-align: center; margin: 5px 0;">↓</div>
      <div class="aiChat-codeBlock">${escapeHtml(newCode)}</div>
    `;
  }
  
  confirmationArea.style.display = "block";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function handleConfirmChange() {
  if (!pendingCodeChange) return;
  
  confirmationArea.style.display = "none";
  
  if (pendingCodeChange.type === "basic") {
    // Apply BASIC program change directly to C64 RAM
    try {
      const { newProgram } = pendingCodeChange;
      
      // Write the program directly to RAM using tokenizer
      writeBasicProgramToRam(c64, newProgram);
      
      addMessage("system", "BASIC program loaded into memory - type LIST to see it");
    } catch (error) {
      showError(`Failed to apply BASIC program: ${error.message}`);
      addMessage("system", `Error applying program: ${error.message}`);
    }
  } else {
    // Legacy file system change (shouldn't be used anymore)
    try {
      const response = await fetch("/api/apply-code-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pendingCodeChange),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addMessage("system", `Code change applied successfully`);
      } else {
        showError(data.error || "Failed to apply code change");
        addMessage("system", `Failed to apply change: ${data.error}`);
      }
    } catch (error) {
      showError(`Failed to apply code change: ${error.message}`);
      addMessage("system", `Error applying change: ${error.message}`);
    }
  }
  
  pendingCodeChange = null;
}

function handleRejectChange() {
  confirmationArea.style.display = "none";
  addMessage("system", "Code change rejected by user");
  pendingCodeChange = null;
}

function handleExportCode() {
  try {
    // Extract current BASIC program from C64 RAM
    const lines = extractBasicProgram(c64);
    const basicProgram = basicLinesToText(lines);
    
    if (!basicProgram || basicProgram.trim() === "") {
      showError("No BASIC program to export");
      return;
    }
    
    // Create a blob with the BASIC program
    const blob = new Blob([basicProgram], { type: "text/plain;charset=utf-8" });
    
    // Create a temporary download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    link.download = `c64-basic-${timestamp}.txt`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addMessage("system", `BASIC program exported to ${link.download}`);
  } catch (error) {
    console.error("Error exporting BASIC program:", error);
    showError(`Failed to export code: ${error.message}`);
  }
}

function handleImportCode() {
  const fileInput = document.getElementById("aiChat-importInput");
  if (fileInput) {
    fileInput.click();
  }
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      
      // Validate that it looks like BASIC code
      if (!content || content.trim() === "") {
        showError("File is empty");
        return;
      }
      
      // Write the program to C64 RAM
      writeBasicProgramToRam(c64, content);
      
      addMessage("system", `Imported BASIC program from ${file.name} - type LIST to see it`);
      
      // Close the dialog after successful import
      dialog.close();
      
      // Clear the file input so the same file can be imported again
      event.target.value = "";
    } catch (error) {
      console.error("Error importing BASIC program:", error);
      showError(`Failed to import code: ${error.message}`);
    }
  };
  
  reader.onerror = function() {
    showError("Failed to read file");
  };
  
  reader.readAsText(file);
}

// Make dialog draggable by clicking and dragging on the title area
function makeDraggable(dialogElement) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  // Get the title element (h1) to use as drag handle
  const dragHandle = dialogElement.querySelector("h1");
  if (!dragHandle) return;

  // Add visual cursor feedback
  dragHandle.style.cursor = "move";
  dragHandle.style.userSelect = "none";

  dragHandle.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

  // Reset position when dialog is closed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        if (dialogElement.classList.contains("undisplayed")) {
          // Reset offsets when dialog is closed
          xOffset = 0;
          yOffset = 0;
          currentX = 0;
          currentY = 0;
          initialX = 0;
          initialY = 0;
        }
      }
    });
  });

  observer.observe(dialogElement, { attributes: true });

  function dragStart(e) {
    // Only drag on left click
    if (e.button !== 0) return;
    
    // Don't drag if clicking on close button
    if (e.target.classList.contains("close")) return;

    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    isDragging = true;
    dialogElement.style.transition = "none";
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();

    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    xOffset = currentX;
    yOffset = currentY;

    setTranslate(currentX, currentY, dialogElement);
  }

  function dragEnd(e) {
    if (!isDragging) return;

    initialX = currentX;
    initialY = currentY;

    isDragging = false;
    
    // Restore transitions after drag
    setTimeout(() => {
      if (!isDragging) {
        dialogElement.style.transition = "";
      }
    }, 50);
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }
}

