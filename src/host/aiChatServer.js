// AI Chat API Server
// This server handles AI chat requests and code modifications for C64 BASIC programs

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' })); // Increase limit for RAM dumps

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Read the entire codebase for context
async function getCodebaseContext() {
  const projectRoot = path.resolve(__dirname, '..');
  const context = [];
  
  async function readDirectory(dir, basePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        // Skip node_modules, dist, etc.
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await readDirectory(fullPath, relativePath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name === 'package.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            context.push({
              path: relativePath,
              content: content,
            });
          } catch (err) {
            console.error(`Error reading ${fullPath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${dir}:`, err.message);
    }
  }
  
  await readDirectory(projectRoot);
  return context;
}

// Get a summary of the codebase instead of full content
async function getCodebaseSummary() {
  const projectRoot = path.resolve(__dirname, '..');
  const summary = {
    files: [],
    structure: {},
  };
  
  async function readDirectory(dir, basePath = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        // Skip node_modules, dist, etc.
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await readDirectory(fullPath, relativePath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.md'))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            // Extract just the first comment block or first 10 lines as summary
            const summary_lines = lines.slice(0, Math.min(20, lines.length));
            
            summary.files.push({
              path: relativePath,
              lines: lines.length,
              summary: summary_lines.join('\n'),
            });
          } catch (err) {
            console.error(`Error reading ${fullPath}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${dir}:`, err.message);
    }
  }
  
  await readDirectory(projectRoot);
  return summary;
}

// AI Chat endpoint
app.post('/api/ai-chat', async (req, res) => {
  const { message, history, basicProgram } = req.body;
  
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file' 
    });
  }
  
  try {
    // Build system message with C64 BASIC context
    const systemMessage = `You are an AI assistant helping to write and modify Commodore 64 BASIC programs.

${basicProgram ? `Current BASIC program in the C64:\n\`\`\`basic\n${basicProgram}\n\`\`\`` : 'No BASIC program is currently loaded in the C64.'}

When the user asks you to modify or create a BASIC program:
1. Analyze the current program (if any)
2. Understand what the user wants to change or add
3. Provide a brief explanation of what you're doing
4. IMMEDIATELY provide the complete program in the JSON format below

IMPORTANT: Always provide the program code directly. Do NOT ask the user for confirmation or additional input. The user will confirm via a UI button.

To propose changes to the BASIC program, you MUST include a JSON block in your response:
\`\`\`json
{
  "codeChange": {
    "type": "basic",
    "description": "Brief description of the change",
    "newProgram": "10 PRINT\\"HELLO WORLD\\"\\n20 GOTO 10"
  }
}
\`\`\`

The newProgram should be the complete BASIC program, with each line separated by \\n.
Line numbers should be included.
Use \\" for quotes inside strings.

CRITICAL: Each BASIC statement must have its own line number. Do NOT use colons (:) to put multiple statements on one line.
For example:
GOOD:
10 PRINT "HELLO"
20 GOTO 10

BAD:
10 PRINT "HELLO" : GOTO 10

You can help with:
- Writing new BASIC programs
- Debugging existing programs
- Adding features or fixing bugs
- Explaining how C64 BASIC works
- Converting ideas into BASIC code

C64 BASIC notes:
- Screen is 40x25 characters
- Colors: 0-15 (0=black, 1=white, 2=red, 3=cyan, etc.)
- Use POKE 53280,X for border color
- Use POKE 53281,X for background color
- Use PRINT CHR$(147) to clear screen
- Variables are limited (26 simple variables A-Z, arrays with DIM)

Remember: Provide the code immediately, don't ask for confirmation!`;
    
    // Build messages array
    const messages = [
      { role: 'system', content: systemMessage },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message },
    ];
    
    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Check if AI wants to make a code change
    let codeChange = null;
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.codeChange) {
          codeChange = parsed.codeChange;
        }
      } catch (err) {
        console.error('Error parsing code change JSON:', err);
      }
    }
    
    res.json({
      response: aiResponse,
      codeChange: codeChange,
    });
    
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to communicate with OpenAI' 
    });
  }
});

// Get specific file content endpoint
app.post('/api/get-file-content', async (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ 
      error: 'Missing required field: filePath' 
    });
  }
  
  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    
    // Security check: ensure the path is within the project
    const projectRoot = path.resolve(__dirname, '..');
    if (!fullPath.startsWith(projectRoot)) {
      return res.status(403).json({ 
        error: 'Access denied: path outside project directory' 
      });
    }
    
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ 
      success: true, 
      content: content,
      filePath: filePath,
    });
    
  } catch (error) {
    console.error('Get file content error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to read file' 
    });
  }
});

// Apply code change endpoint
app.post('/api/apply-code-change', async (req, res) => {
  const { filePath, oldCode, newCode } = req.body;
  
  if (!filePath || !newCode) {
    return res.status(400).json({ 
      error: 'Missing required fields: filePath and newCode' 
    });
  }
  
  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    
    // Read current file content
    let currentContent;
    try {
      currentContent = await fs.readFile(fullPath, 'utf-8');
    } catch (err) {
      // File doesn't exist, create new file
      if (err.code === 'ENOENT') {
        await fs.writeFile(fullPath, newCode, 'utf-8');
        return res.json({ success: true, message: 'New file created' });
      }
      throw err;
    }
    
    // If oldCode is provided, replace it
    if (oldCode) {
      if (!currentContent.includes(oldCode)) {
        return res.status(400).json({ 
          error: 'Old code not found in file. The file may have been modified.' 
        });
      }
      const updatedContent = currentContent.replace(oldCode, newCode);
      await fs.writeFile(fullPath, updatedContent, 'utf-8');
    } else {
      // Otherwise, append or overwrite
      await fs.writeFile(fullPath, newCode, 'utf-8');
    }
    
    res.json({ success: true, message: 'Code change applied successfully' });
    
  } catch (error) {
    console.error('Apply code change error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to apply code change' 
    });
  }
});

module.exports = app;
