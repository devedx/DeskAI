<template>
	<div class="chat-panel">
		<div class="chat-messages" ref="messageContainer">
			<div v-for="message in displayMessages" :key="message.id" :class="'message-container ' + (message.role === 'user' ? 'user' : 'assistant')">
				<div :class="'message ' + (message.role === 'user' ? 'user' : 'assistant')">{{ message.content }}</div>
			</div>
		</div>
		<div class="input-container">
			<div class="message-input">
				<textarea class="input" rows="1" ref="input" v-model="inputText" placeholder="Enter message ..." @input="resizeInput" @keypress.enter="handleInputEnter"></textarea>
				<button id="send-message" :disabled="sendDisabled" @click="sendMessage"><font-awesome-icon icon="fa-solid fa-paper-plane" class="send-icon" /></button>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref, reactive, onMounted, watch, computed, nextTick } from "vue";
	import { Configuration, OpenAIApi } from "openai";
	import { v4 as uuid } from "uuid";

	const openai = new OpenAIApi(new Configuration({ apiKey: env.OPENAI_KEY }));

	const messages = reactive([{id: uuid(), role: "system", content: "You are ChatGPT, a large language model trained by OpenAI.Follow the user's instructions carefully. Respond using markdown. Your responses are to the point and not unnecessarily verbose. You don't need to apologize if you misunderstand the user or make a mistake, you just correct it."}]);
	const displayMessages = computed(() => messages.filter(message => message.role !== "system"))
	const gptMessages = computed(() => {
		return messages.map(message => {
			const {id, ...rest} = message;
			return rest;
		})
	});

	const inputText = ref("");

	const messageContainer = ref(null);

	onMounted(() => scrollToBottom(true));

	watch(messages, () => scrollToBottom());

	const input = ref(null)

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

		// get assistant response
		const response = await openai.createChatCompletion({model: "gpt-3.5-turbo", messages: gptMessages.value});
		messages.push({id: uuid(), role: "assistant", content: response.data.choices[0].message.content});

		sending.value = false;
	}

	function handleInputEnter(event) {
		if (event.shiftKey || event.ctrlKey)
			return;

		event.preventDefault();
		sendMessage();
	}
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

	.send-icon {
		font-size: 20px;
	}
</style>
