<template>
	<div class="chat-panel">
		<div class="chat-messages" ref="messageContainer">
			<div v-for="message in displayMessages" :key="message.id" :class="'message-container ' + (message.role === 'user' ? 'user' : 'assistant')">
				<div :class="'message ' + (message.role === 'user' ? 'user' : 'assistant')" v-html="renderMarkdown(message.content)"></div>
			</div>
		</div>
		<div class="input-container">
			<div class="message-input">
				<div class="input-type">
					<button class="input-type-button" :class="{'input-type-active': !inputType}" @click="() => setInputType(false)"><font-awesome-icon icon="fa-solid fa-file-lines" class="input-type-icon" /></button>
					<label class="switch">
						<input type="checkbox" v-model="inputType" @change="test">
						<span class="slider"></span>
					</label>
					<button class="input-type-button" :class="{'input-type-active': inputType }" @click="() => setInputType(true)"><font-awesome-icon icon="fa-brands fa-markdown" class="input-type-icon" /></button>
				</div>
				<div v-if="inputType"></div>
				<textarea v-else ref="input" class="input" rows="1" v-model="inputText" placeholder="Enter message ..." @input="resizeInput" @keypress.enter="handleInputEnter" @keydown.tab="handleInputTab"></textarea>
				<button id="send-message" :disabled="sendDisabled" @click="sendMessage"><font-awesome-icon icon="fa-solid fa-paper-plane" class="send-icon" /></button>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref, reactive, onMounted, watch, computed, nextTick } from "vue";
	import { v4 as uuid } from "uuid";
	import { fetchEventSource, EventStreamContentType } from "@microsoft/fetch-event-source";
	import { remark } from "remark";
	import remarkHtml from "remark-html";
	import remarkGfm from "remark-gfm";
	import remarkBreaks from "remark-breaks";

	const messages = reactive([{id: uuid(), role: "system", content: "You are ChatGPT, a large language model trained by OpenAI.Follow the user's instructions carefully. Respond using markdown. Your responses are to the point and not unnecessarily verbose. You do not apologize if you misunderstand the user or make a mistake."}]);
	const displayMessages = computed(() => messages.filter(message => message.role !== "system"))
	const gptMessages = computed(() => {
		return messages.map(message => {
			const {id, ...rest} = message;
			return rest;
		})
	});

	const inputText = ref("");
	const messageContainer = ref(null);
	const input = ref(null);
	const inputType = ref(false);

	onMounted(() => {
		scrollToBottom(true);

		//resizeInput();
	});

	watch(messages, () => scrollToBottom());

	const sending = ref(false);
	const sendDisabled = computed(() => inputText.value.trim() === "" || sending.value);

	function resizeInput() {
		input.value.style.height = "auto";
		input.value.style.height = input.value.scrollHeight + "px";
	}

	function scrollToBottom(force = false) {
		const elem = messageContainer.value;

		// don't scroll if force = false and messages are not scrolled to the bottom
		if (elem.scrollTop + elem.clientHeight + 10 > elem.scrollHeight || force) {
			nextTick(() => elem.scrollTop = elem.scrollHeight);
		}
	}

	async function sendMessage() {
		if (sendDisabled.value)
			return;

		// disable sending
		sending.value = true;

		// add user message
		messages.push({id: uuid(), role: "user", content: inputText.value});
		inputText.value = "";
		input.value.style.height = "auto";
		scrollToBottom(true);

		sending.value = false;
		return;

		// get assistant response
		const url = "https://api.openai.com/v1/chat/completions";
		messages.push({id: uuid(), role: "assistant", content: " |"});

		fetchEventSource(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "Bearer " + env.OPENAI_KEY
			},
			body: JSON.stringify({
				model: "gpt-3.5-turbo",
				messages: gptMessages.value,
				stream: true
			}),
			onopen(response) {
				if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
					return;
				} else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
					throw new FatalError();
				} else {
					throw new Error();
			}
			},
			onmessage(message) {
				if (message.data === "[DONE]") {
					messages[messages.length - 1].content = messages[messages.length - 1].content.substring(0, messages[messages.length - 1].content.length - 2);
					return;
				}

				const delta = JSON.parse(message.data).choices[0].delta;

				if ("content" in delta)
					messages[messages.length - 1].content = messages[messages.length - 1].content.substring(0, messages[messages.length - 1].content.length - 2) + delta.content + " |";
			},
			onclose() {
				sending.value = false;
			},
			onerror(error) {
				console.log(error);

				if (error instanceof FatalError)
					throw error;
			}
		});
	}

	function handleInputEnter(event) {
		if (event.shiftKey || event.ctrlKey)
			return;

		event.preventDefault();
		sendMessage();
	}

	function handleInputTab(event) {
		event.preventDefault();
		const textarea = event.target;
		const { selectionStart, selectionEnd } = textarea;
		const tab = '\t';
		const updatedText = textarea.value.substring(0, selectionStart) + tab + textarea.value.substring(selectionEnd);
		inputText.value = updatedText;
		textarea.selectionStart = textarea.selectionEnd = selectionStart + tab.length;
		textarea.setSelectionRange(selectionStart + tab.length, selectionStart + tab.length);
	}

	function renderMarkdown(value) {
		const processedContent = remark()
			.use(remarkGfm)
			.use(remarkBreaks)
			.use(remarkHtml)
			.processSync(value)
			.toString();
		return processedContent;
	}

	function setInputType(type) {
		inputType.value = type;
	}

	class FatalError extends Error {}
</script>

<style scoped>
	.chat-panel {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
	}

	.message {
		margin: 0 auto 0 auto;
		padding: 20px 15px 20px 15px;
		max-width: 780px;
		line-height: 1.5;
	}

	.message.user {
		padding-left: 100px;
	}

	.message.assistant {
		padding-right: 100px;
	}

	.message-container.assistant {
		background-color: #555;
	}

	.message-input {
		display: flex;
		max-width: 870px;
		padding: 15px;
		margin: 10px auto 10px auto;
		border: none;
		border-radius: 10px;
		background-color: #444;
		align-items: flex-end;

	}

	.custom-textarea .CodeMirror {
		font: inherit;
		color: inherit;
		background: none;
	}

	.input {
		display: flex;
		resize: none;
		overflow-y: auto;
		max-height: 200px;
		flex: 1;
		outline: none;
		color: inherit;
		font-family: inherit;
		font-size: inherit;
		line-height: 1.5;
		background: none;
		border: none;
		padding: 0;
		margin-right: 15px;
	}

	.input::placeholder {
		color: #999;
	}

	.input-type-button {
		padding: 0;
		border: none;
		background: none;
		color: #eee;
		cursor: pointer;
	}

	.input-type-active {
		color: #9f6af1;
		cursor: default;
	}

	#send-message {
		padding: 0;
		border: none;
		background: none;
		color: #9f6af1;
	}

	#send-message:hover {
		cursor: pointer;
	}

	#send-message:active {
		color: #eee;
	}

	#send-message:disabled {
		color: #888;
		cursor: default;
	}

	.send-icon, .input-type-icon {
		font-size: 20px;
	}

	.input-type {
		margin-right: 15px;
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 50px;
		height: 10px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 2px;
		left: 0;
		right: 0;
		bottom: -2px;
		background-color: #888;
		-webkit-transition: 0.4s;
		transition: 0.4s;
		border-radius: 5px;
		margin: 0 10px 0 10px;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 0px;
		bottom: -3px;
		background-color: #eee;
		-webkit-transition: 0.4s;
		transition: 0.4s;
		border-radius: 8px;
	}

	input:checked + .slider:before {
		transform: translateX(14px);
	}
</style>
