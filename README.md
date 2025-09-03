# Simple Chatbot

This project provides a minimal web based chat client for talking to
models hosted on [OpenRouter](https://openrouter.ai/).  A small Python
proxy is included to work around browser CORS restrictions.

## Running locally

1. Install dependencies:

   ```bash
   pip install requests
   ```

2. Start the local proxy server:

   ```bash
   python run_server.py
   ```

   The application will be available at `http://localhost:8000`.
   You can override the port or API endpoint with environment variables:

   ```bash
   PORT=9000 API_URL=https://example.com/v1/chat python run_server.py
   ```

3. Open `chat.html` in your browser and enter your OpenRouter API key in
   the **Settings** dialog.

## Features

* Conversation history stored in `localStorage`.
* Adjustable model, system prompt, context length, **max tokens**, and
  **temperature** settings.
* `Shift+Enter` inserts a new line while `Enter` sends the message.
* Code blocks can be copied or downloaded directly from the chat.

## License

MIT

