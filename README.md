# DeskAI

Client for OpenAI's GPT APIs (currently only the chat version of `gpt-3.5-turbo`).

## Running the Application

Environment variable `OPENAI_KEY` needs to be set to the OpenAI API key (can be put into a `.env` file).

### Install Dependencies

```bash
npm install
```

### Prod Version

```bash
npm start
```

### Dev Version

```bash
npm run dev
```

## To Do

* [x] stream response
* [x] Markdown and LaTeX rendering
* [x] edit messages
* [x] regenerate response
* [x] open app keyboard shortcut
* [ ] chat settings
  * [ ] choose model
  * [ ] set temperature
  * [ ] set frequency penalty
  * [ ] set preence penalty
  * [ ] set max response tokens
  * [ ] set max input tokens
  * [ ] choose input cut-off method (hard cut-off, summarization)
* [ ] application settings
  * [ ] API key
  * [ ] open app shortcut
  * [ ] default chat settings
* [ ] persist chat
* [ ] multiple chats
  * [ ] list of chats
  * [ ] delete chats
  * [ ] name chats
  * [ ] auto name chats
  * [ ] start new chat
* [ ] display API cost
* [ ] system tray
  * [x] tray icon
  * [ ] smaller version of main window above task bar
  * [ ] keyboard shortcut for small window
* [ ] completions api
