# Chatbot Implementation Documentation

A real-time AI-powered chatbot for a cleaning business website, built with Next.js and OpenAI's GPT-4o-mini model.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              components/chatbot.tsx                  │    │
│  │  - Floating chat UI with toggle button              │    │
│  │  - Message state management                          │    │
│  │  - Real-time streaming text display                  │    │
│  │  - Custom fetch-based streaming implementation       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/chat
                              │ { messages: [...] }
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Next.js API)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              app/api/chat/route.ts                   │    │
│  │  - Receives message history                          │    │
│  │  - Adds system prompt for cleaning business          │    │
│  │  - Streams response from OpenAI                      │    │
│  │  - Transforms to AI SDK data stream format           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ OpenAI API (streaming)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenAI GPT-4o-mini                        │
│  - Processes conversation with system context               │
│  - Streams response tokens in real-time                     │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # API endpoint for chat
│   └── page.tsx              # Main page with chatbot
├── components/
│   └── chatbot.tsx           # Chat UI component
└── docs/
    └── CHATBOT_IMPLEMENTATION.md
```

---

## Frontend Component (`components/chatbot.tsx`)

### Key Features

1. **Floating Toggle Button** - Fixed position button in bottom-right corner
2. **Animated Chat Window** - Smooth open/close transitions
3. **Real-time Streaming** - Messages appear character by character
4. **Loading Indicators** - Animated dots while waiting for response

### State Management

```typescript
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const [isOpen, setIsOpen] = useState(false)        // Chat window visibility
const [input, setInput] = useState("")              // User input field
const [messages, setMessages] = useState<Message[]>([])  // Conversation history
const [isLoading, setIsLoading] = useState(false)  // Loading state
```

### Streaming Implementation

The chatbot uses a custom fetch-based streaming approach:

```typescript
const sendMessage = useCallback(async (userMessage: string) => {
  // 1. Add user message to state
  // 2. Create placeholder for assistant response
  // 3. Fetch from API with streaming
  // 4. Read stream chunks and parse AI SDK format
  // 5. Update assistant message progressively
}, [messages])
```

**Stream Parsing Logic:**
```typescript
// Parse AI SDK data stream format: 0:"content"
if (line.startsWith("0:")) {
  const content = JSON.parse(line.slice(2))
  fullContent += content
  setMessages(prev => prev.map(m => 
    m.id === assistantId ? { ...m, content: fullContent } : m
  ))
}
```

### UI Components Used

| Component | Source | Purpose |
|-----------|--------|---------|
| `Button` | shadcn/ui | Toggle button, send button |
| `Card` | shadcn/ui | Chat window container |
| `Input` | shadcn/ui | Message input field |
| `Avatar` | shadcn/ui | User/assistant avatars |
| `ScrollArea` | shadcn/ui | Scrollable message list |

### Styling

- **Primary Color**: Emerald green (`emerald-600`) for brand consistency
- **Layout**: Fixed positioning with responsive width (380px)
- **Animations**: CSS transitions for open/close, bounce animation for loading dots

---

## Backend API (`app/api/chat/route.ts`)

### Configuration

```typescript
export const maxDuration = 30  // Maximum function execution time (seconds)
```

### System Prompt

The AI is configured as "Sparkle Assistant" with knowledge about:
- Residential and commercial cleaning services
- Service offerings (Standard, Deep, Move-In/Out, Commercial, Specialty)
- Pricing inquiry handling
- Scheduling assistance
- Eco-friendly and pet safety concerns

### Request Flow

1. **Receive Messages**
   ```typescript
   const { messages } = await req.json()
   ```

2. **Normalize Message Format**
   - Handles both `content` string format and `parts` array format
   ```typescript
   const coreMessages = messages.map(msg => ({
     role: msg.role,
     content: msg.content || msg.parts?.filter(p => p.type === "text")
       .map(p => p.text).join("") || ""
   }))
   ```

3. **Add System Context**
   ```typescript
   const messagesWithSystem = [
     { role: "system", content: SYSTEM_PROMPT },
     ...coreMessages
   ]
   ```

4. **Call OpenAI API**
   ```typescript
   const response = await fetch("https://api.openai.com/v1/chat/completions", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
     },
     body: JSON.stringify({
       model: "gpt-4o-mini",
       messages: messagesWithSystem,
       stream: true,
     }),
   })
   ```

5. **Transform Stream**
   - Converts OpenAI's SSE format to AI SDK data stream format
   ```typescript
   // OpenAI format: data: {"choices":[{"delta":{"content":"Hello"}}]}
   // AI SDK format: 0:"Hello"
   ```

### Response Headers

```typescript
{
  "Content-Type": "text/plain; charset=utf-8",
  "X-Vercel-AI-Data-Stream": "v1"
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |

### Setting Up

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to your environment variables (Vercel dashboard or `.env.local`)

---

## Data Flow Diagram

```
User Types Message
        │
        ▼
┌───────────────────┐
│  handleSubmit()   │
│  - Prevent empty  │
│  - Clear input    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  sendMessage()    │
│  - Add user msg   │
│  - Create placeholder
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  fetch("/api/chat")│
│  - POST messages  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  API Route        │
│  - Add system     │
│  - Call OpenAI    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  OpenAI Streaming │
│  - Token by token │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  TransformStream  │
│  - Parse SSE      │
│  - Format output  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Frontend Reader  │
│  - Read chunks    │
│  - Update state   │
└───────────────────┘
        │
        ▼
   Message Displayed
```

---

## Customization Guide

### Changing the AI Personality

Edit the `SYSTEM_PROMPT` in `app/api/chat/route.ts`:

```typescript
const SYSTEM_PROMPT = `You are [Your Assistant Name], a [personality description].

Your responsibilities:
- [Task 1]
- [Task 2]
...`
```

### Changing Colors

Update the Tailwind classes in `components/chatbot.tsx`:

```typescript
// Current: emerald-600
// Change to your brand color, e.g., blue-600
className="bg-blue-600 hover:bg-blue-700"
```

### Changing the Model

Update the model in `app/api/chat/route.ts`:

```typescript
body: JSON.stringify({
  model: "gpt-4o",  // or "gpt-4", "gpt-3.5-turbo"
  messages: messagesWithSystem,
  stream: true,
}),
```

### Adding Message Persistence

To save chat history, integrate with a database:

```typescript
// Example: Save to Supabase
const { data, error } = await supabase
  .from('chat_messages')
  .insert({ user_id, role, content })
```

---

## Error Handling

### Frontend Errors
- Network failures display: "Sorry, I encountered an error. Please try again."
- Invalid JSON chunks are silently skipped

### Backend Errors
- Returns 500 status with JSON error message
- Logs errors to console for debugging

---

## Performance Considerations

1. **Streaming** - Responses appear immediately, improving perceived performance
2. **useCallback** - `sendMessage` is memoized to prevent unnecessary re-renders
3. **maxDuration** - Set to 30 seconds to handle longer responses
4. **Lightweight Model** - GPT-4o-mini balances quality and speed

---

## Security Notes

1. **API Key** - Stored server-side only, never exposed to client
2. **Input Validation** - Empty messages are rejected client-side
3. **Rate Limiting** - Consider adding rate limiting for production use

---

## Future Enhancements

- [ ] Add message persistence with database
- [ ] Implement typing indicators
- [ ] Add file upload support for photos of spaces
- [ ] Integrate booking system
- [ ] Add multi-language support
- [ ] Implement conversation history recall
