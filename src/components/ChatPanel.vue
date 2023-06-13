<template>
	<div class="chat-panel">
		<div class="chat-messages" ref="messageContainer">
			<div v-for="(message, index) in displayMessages" :key="message.id" :class="'message-container ' + (message.role === 'user' ? 'user' : 'assistant')" @mouseover="hoveringMessage = message.id" @mouseleave="hoveringMessage = null">
				<div v-if="editingMessage === message.id" :class="'message ' + (message.role === 'user' ? 'user' : 'assistant')">
					<MdEditor v-model="message.content" class="message-editor" :theme="'dark'" :language="'en-US'" :preview="false" :toolbars="[]" :tab-width="4" :footers="[]" :no-upload-img="true" :auto-focus="true" />
					<div class="edit-buttons">
						<button v-if="message.role ==='user'" @click="saveEditAndRegenerate(index + 1)">Save & Regenerate</button>
						<button @click="exitEdit">Save</button>
						<button @click="cancelEdit(index + 1)" style="background-color: #777">Cancel</button>
					</div>
				</div>
				<div v-else :class="'message preview ' + (message.role === 'user' ? 'user' : 'assistant')">
					<MdPreview v-model="message.content" class="message-md-preview" :theme="'dark'" :language="'en-US'" :show-code-row-number="true" :preview-theme="'github'" :code-theme="'github'" />
					<div class="message-buttons">
						<button :disabled="hoveringMessage !== message.id || editingMessage !== null" class="icon-button" @click="editMessage(index + 1)"><font-awesome-icon icon="fa-solid fa-pen-to-square" /></button>
						<button :disabled="hoveringMessage !== message.id || editingMessage !== null || message.role === 'user'" class="icon-button" @click="regenerate(index + 1)"><font-awesome-icon icon="fa-solid fa-rotate" /></button>
					</div>
				</div>
			</div>
		</div>
		<div class="input-container">
			<div class="message-input">
				<div class="input-type">
					<button class="icon-button" :class="{'input-type-active': !inputType}" @click="() => setInputType(false)"><font-awesome-icon icon="fa-solid fa-file-lines" class="input-type-icon" /></button>
					<label class="switch">
						<input type="checkbox" v-model="inputType">
						<span class="slider"></span>
					</label>
					<button class="icon-button" :class="{'input-type-active': inputType }" @click="() => setInputType(true)"><font-awesome-icon icon="fa-brands fa-markdown" class="input-type-icon" /></button>
				</div>
				<MdEditor v-if="inputType" ref="mdInput" v-model="inputText" class="md-input" :placeholder="'Enter message ...'" :theme="'dark'" :language="'en-US'" :preview="false" :toolbars="[]" :tab-width="4" :footers="[]" :no-upload-img="true" />
				<textarea v-else ref="input" class="input" rows="1" v-model="inputText" placeholder="Enter message ..." @input="resizeInput" @keypress.enter="handleInputEnter" @keydown.tab="handleInputTab"></textarea>
				<button id="send-message" class="icon-button" :disabled="sendDisabled" @click="sendMessage"><font-awesome-icon icon="fa-solid fa-paper-plane" class="send-icon" /></button>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref, reactive, onMounted, watch, computed, nextTick } from "vue";
	import { v4 as uuid } from "uuid";
	import { fetchEventSource, EventStreamContentType } from "@microsoft/fetch-event-source";
	import { MdEditor, MdPreview, config } from "md-editor-v3";
	import "md-editor-v3/lib/style.css";

	const messages = reactive([{id: uuid(), role: "system", content: "You are ChatGPT, a large language model trained by OpenAI.Follow the user's instructions carefully. Respond using markdown. Your responses are to the point and not unnecessarily verbose. You do not apologize if you misunderstand the user or make a mistake."}]);
	const displayMessages = computed(() => messages.filter(message => message.role !== "system"))
	const gptMessages = computed(() => {
		return messages.map(message => {
			const {id, role, content, ...rest} = message;
			return {role, content};
		})
	});

	const inputText = ref("");
	const messageContainer = ref(null);
	const input = ref(null);
	const inputType = ref(false);
	const mdInput = ref(null);

	const hoveringMessage = ref(null);
	const editingMessage = ref(null);
	let editingMessageOriginal = null;

	onMounted(() => {
		scrollToBottom(true);
		config({ editorConfig: { renderDelay: 0 } });
	});

	watch(messages, () => scrollToBottom());

	watch(inputType, () => {
		nextTick(() => {
			if (inputType.value) {
				mdInput.value.focus();
			} else {
				input.value.focus();
			}
			scrollToBottom();
		});
	});

	const sending = ref(false);
	const sendDisabled = computed(() => inputText.value.trim() === "" || sending.value);

	function resizeInput() {
		input.value.style.height = "auto";
		input.value.style.height = input.value.scrollHeight + "px";
		scrollToBottom();
	}

	function scrollToBottom(force = false) {
		const elem = messageContainer.value;

		// don't scroll if force = false and messages are not scrolled to the bottom
		if (elem.scrollTop + elem.clientHeight + 50 > elem.scrollHeight || force) {
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

		generateResponse();
	}

	function generateResponse() {
		// get assistant response
		const url = "https://api.openai.com/v1/chat/completions";

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
					messages.push({ id: uuid(), role: "assistant", content: " \u2588" });
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
					messages[messages.length - 1].content = messages[messages.length - 1].content.substring(0, messages[messages.length - 1].content.length - 2) + delta.content + " \u2588";
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

	function setInputType(type) {
		inputType.value = type;
	}

	function editMessage(index) {
		editingMessageOriginal = messages[index].content;
		editingMessage.value = messages[index].id;

	}

	function saveEditAndRegenerate(index) {
		exitEdit();
		regenerate(index + 1);
	}

	function exitEdit() {
		editingMessage.value = null;
		editingMessageOriginal = null;
	}

	function cancelEdit(index) {
		messages[index].content = editingMessageOriginal;
		exitEdit();
	}

	function regenerate(index) {
		messages.splice(index);
		generateResponse();
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
		padding-top: 15px;
		max-width: 900px;
	}

	.message.preview {
		display: flex;
		align-items: flex-start;
	}

	.message-md-preview {
		display: flex;
		flex: 1;
	}

	.message.user {
		padding-left: 60px;
		max-width: 840px;
	}

	.message.user .md-editor {
		--md-bk-color: #333;
		--md-border-color: #333;
		--md-scrollbar-bg-color: #333;
		--md-color: #eee;
	}

	.message.assistant .md-editor {
		--md-bk-color: #444;
		--md-border-color: #444;
		--md-scrollbar-bg-color: #444;
		--md-color: #eee;
	}

	.message-container.assistant {
		background-color: #444;
	}

	.message-editor {
		height: auto;
	}

	.edit-buttons {
		display: flex;
		justify-content: center;
		gap: 20px;
		margin-right: 60px;
		padding-bottom: 15px;
	}

	.edit-buttons button {
		border: none;
		border-radius: 5px;
		padding: 10px 15px 10px 15px;
		background-color: #9f6af1;
		color: inherit;
		cursor: pointer;
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

	.icon-button {
		padding: 0;
		border: none;
		background: none;
		color: #eee;
		cursor: pointer;
		font-size: 20px;
	}

	.message-buttons {
		margin-top: 12px;
	}

	.message-buttons .icon-button {
		color: #aaa;
		padding-right: 10px;
	}

	.message-buttons .icon-button:hover {
		color: inherit;
	}

	.message-buttons .icon-button:disabled {
		color: transparent;
		cursor: default;
	}

	.input-type-active {
		color: #9f6af1;
		cursor: default;
	}

	#send-message {
		color: #9f6af1;
	}

	#send-message:hover {
		cursor: pointer;
	}

	#send-message:active {
		color: #eee;
	}

	#send-message:disabled {
		color: #666;
		cursor: default;
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

	.md-input {
		--md-color: #eee;
		--md-bk-color: #444;
		--md-border-color: #444;
		--md-scrollbar-bg-color: #444;
		--md-scrollbar-thumb-color: #777;
		--md-scrollbar-thumb-hover-color: #aaa;
		--md-scrollbar-thumb-active-color: #aaa;
		display: flex;
		max-height: 200px;
		flex: 1;
		margin-right: 15px;
	}
</style>
