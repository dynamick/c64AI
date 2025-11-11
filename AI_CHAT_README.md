# AI Chat Assistant per Programmi BASIC del C64

## Setup

1. **Get your OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key or use an existing one

2. **Configure the API Key**
   - Open the `.env` file in the project root
   - Replace `your_openai_api_key_here` with your actual OpenAI API key:
     ```
     OPENAI_API_KEY=sk-your-actual-key-here
     ```

3. **Start the Development Server**
   ```bash
   npm run start
   ```

## Usage

1. Open the web emulator at http://localhost:8081
2. Optionally, type a BASIC program in the C64 (or load one)
3. Click the AI chat icon (💬) in the lower tray (next to the joystick and keyboard buttons)
4. Type your request in the chat input
5. The AI will analyze the current BASIC program and respond
6. If the AI proposes changes to the BASIC program, you'll see a confirmation dialog with:
   - Description of the change
   - The new BASIC program
   - "Apply Changes" and "Reject" buttons
7. Click "Apply Changes" to have the program automatically typed into the C64, or "Reject" to dismiss it

## Features

- **BASIC Program Context**: The AI has access to the current BASIC program in the C64's memory
- **Interactive Modifications**: The AI can propose specific changes or write new programs
- **Automatic Entry**: Approved programs are automatically typed into the C64
- **User Confirmation**: All code changes require explicit user approval
- **Conversation History**: The chat maintains context across multiple messages

## How It Works

1. When you send a message, the frontend extracts the current BASIC program from C64 RAM (starting at $0801)
2. The program is detokenized (converted from internal format to readable text)
3. The detokenized program is sent to OpenAI along with your message
4. OpenAI (GPT-4) analyzes your request and responds
5. If the AI wants to modify or create a program, it includes a special JSON block in its response
6. The frontend displays a confirmation dialog showing the new program
7. If you approve, the program is automatically typed into the C64:
   - Types `NEW` to clear memory
   - Types each line of the program with RETURN
   - Ready to RUN!

## Example Requests

- "Write a program that draws a rainbow"
- "Add sound effects to this program"
- "Fix the bug on line 40"
- "Make this program faster"
- "Add a high score system"
- "Convert this to use sprites"
- "Explain what this program does"

## Security Notes

- **Never commit your `.env` file** - it's already in `.gitignore`
- Keep your OpenAI API key secret
- The AI can modify BASIC programs in the C64 when you approve changes
- Always review proposed changes before applying them

## Troubleshooting

**"OpenAI API key not configured"**
- Make sure you've created a `.env` file with a valid API key

**"Failed to communicate with AI"**
- Check your internet connection
- Verify your API key is valid and has sufficient credits
- Check the browser console for detailed error messages

**Changes not being applied**
- Check the browser console for error messages
- Make sure the C64 emulator is running
- Try typing the program manually to test

**Program doesn't extract correctly**
- Make sure you have a BASIC program loaded
- Try typing `LIST` in the C64 to verify the program exists
- The extractor reads from memory address $0801

## Cost Considerations

Using the OpenAI API incurs costs based on:
- The amount of text sent (including your BASIC program as context)
- The model used (GPT-4)
- The number of requests made

Monitor your usage at: https://platform.openai.com/usage

Note: BASIC programs are very small compared to the emulator codebase, so costs should be minimal!
