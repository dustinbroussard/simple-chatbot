const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menu-toggle');
        const conversationsList = document.getElementById('conversations-list');
        const chatBody = document.getElementById('chat-body');
        const userInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-btn');
        const newChatBtn = document.getElementById('new-chat-btn');
        const startChatBtn = document.getElementById('start-chat-btn');
        const emptyState = document.getElementById('empty-state');

        const settingsModal = document.getElementById('settings-modal');
        const openSettings = document.getElementById('open-settings');
        const closeSettings = document.getElementById('close-settings');
        const cancelSettings = document.getElementById('cancel-settings');
        const saveSettings = document.getElementById('save-settings');

        const renameModal = document.getElementById('rename-modal');
        const closeRename = document.getElementById('close-rename');
        const cancelRename = document.getElementById('cancel-rename');
        const saveRename = document.getElementById('save-rename');
        const conversationName = document.getElementById('conversation-name');

        const exportModal = document.getElementById('export-modal');
        const closeExport = document.getElementById('close-export');
        const closeExportBtn = document.getElementById('close-export-btn');
        const copyExport = document.getElementById('copy-export');
        const downloadExport = document.getElementById('download-export');
        const exportContent = document.getElementById('export-content');

        const apiKeyInput = document.getElementById('api-key');
        const modelSelect = document.getElementById('model-select');
        const systemPromptInput = document.getElementById('system-prompt');
        const maxContextSelect = document.getElementById('max-context');
        const corsProxyInput = document.getElementById('cors-proxy');
        const newCustomModelInput = document.getElementById('new-custom-model');
        const customModelsList = document.getElementById('custom-models-list');

        const maxTokensInput = document.getElementById('max-tokens');
        const temperatureInput = document.getElementById('temperature');

        let conversations = [];
        let currentConversationId = null;
        let settings = {
            apiKey: '',
            model: 'qwen/qwen3-235b-a22b:free',
            systemPrompt: 'You are a helpful chatbot. Provide concise and accurate responses.',
            maxContext: 20,
            corsProxy: 'http://localhost:8000/api/chat/completions',
            customModels: []
        };
        let renameConversationId = null;
        let typing = false;

        function init() {
            loadSettings();
            loadConversations();
            setupEventListeners();
        }

        function loadSettings() {
            const savedSettings = localStorage.getItem('chatbot_settings');
            if (savedSettings) {
                settings = JSON.parse(savedSettings);
            }
            // Ensure customModels is always an array
            settings.customModels = settings.customModels || [];

            apiKeyInput.value = settings.apiKey || '';
            systemPromptInput.value = settings.systemPrompt || 'You are a helpful chatbot. Provide concise and accurate responses.';
            maxContextSelect.value = settings.maxContext ?? 20;
            // Set the cors proxy to the local server by default
            corsProxyInput.value = settings.corsProxy || 'http://localhost:8000/api/chat/completions';
            
            refreshModelSelect();
            
            const modelExists = [...modelSelect.options].some(opt => opt.value === settings.model);
            modelSelect.value = modelExists ? settings.model : 'qwen/qwen3-235b-a22b:free';

            if (!settings.apiKey) {
                settingsModal.style.display = 'flex';
                displaySystemMessage('Please enter your OpenRouter API key in the Settings to start using the chatbot.');
            }
        }

        function refreshModelSelect() {
            const customGroup = document.getElementById('custom-models-group');
            customGroup.innerHTML = '';
            settings.customModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                customGroup.appendChild(option);
            });
            
            // Refresh models list
            customModelsList.innerHTML = '';
            settings.customModels.forEach(model => {
                const div = document.createElement('div');
                div.className = 'custom-model-item';
                div.innerHTML = `
                    <span>${model}</span>
                    <button type="button" onclick="removeCustomModel('${model}')">Remove</button>
                `;
                customModelsList.appendChild(div);
            });
        }

        function addCustomModel() {
            const model = newCustomModelInput.value.trim();
            if (model && !settings.customModels.includes(model)) {
                settings.customModels.push(model);
                newCustomModelInput.value = '';
                saveSettingsToStorage();
                refreshModelSelect();
            }
        }

        function removeCustomModel(model) {
            settings.customModels = settings.customModels.filter(m => m !== model);
            if (modelSelect.value === model) {
                modelSelect.value = 'qwen/qwen3-235b-a22b:free';
            }
            saveSettingsToStorage();
            refreshModelSelect();
        }

        function saveSettingsToStorage() {
            settings.apiKey = apiKeyInput.value.trim();
            settings.model = modelSelect.value;
            settings.systemPrompt = systemPromptInput.value.trim();
            settings.maxContext = parseInt(maxContextSelect.value);
            settings.corsProxy = corsProxyInput.value.trim();

            if (!settings.apiKey) {
                alert('API Key is required. Please enter a valid OpenRouter API key.');
                return false;
            }

            localStorage.setItem('chatbot_settings', JSON.stringify(settings));
            return true;
        }

        function loadConversations() {
            const savedConversations = localStorage.getItem('chatbot_conversations');
            if (savedConversations) {
                conversations = JSON.parse(savedConversations);
            }

            const lastActiveId = localStorage.getItem('chatbot_active_conversation');
            if (lastActiveId) {
                currentConversationId = lastActiveId;
            }

            renderConversationsList();

            if (currentConversationId && conversations.length > 0) {
                loadConversation(currentConversationId);
            } else {
                showEmptyState();
            }
        }

        function saveConversationsToStorage() {
            localStorage.setItem('chatbot_conversations', JSON.stringify(conversations));
            if (currentConversationId) {
                localStorage.setItem('chatbot_active_conversation', currentConversationId);
            }
        }

        function renderConversationsList() {
            conversationsList.innerHTML = '';

            const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

            if (sortedConversations.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'conversation-item';
                emptyItem.textContent = 'No conversations yet';
                conversationsList.appendChild(emptyItem);
                return;
            }

            sortedConversations.forEach(conversation => {
                const item = document.createElement('div');
                item.className = 'conversation-item';
                if (conversation.id === currentConversationId) {
                    item.classList.add('active');
                }

                const titleSpan = document.createElement('span');
                titleSpan.className = 'conversation-title';
                titleSpan.textContent = conversation.title;

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'conversation-actions';

                const renameBtn = document.createElement('button');
                renameBtn.className = 'action-btn rename-btn';
                renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openRenameModal(conversation.id, conversation.title);
                });

                const exportBtn = document.createElement('button');
                exportBtn.className = 'action-btn export-btn';
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i>';
                exportBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    exportConversation(conversation.id);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                });

                actionsDiv.appendChild(renameBtn);
                actionsDiv.appendChild(exportBtn);
                actionsDiv.appendChild(deleteBtn);

                item.appendChild(titleSpan);
                item.appendChild(actionsDiv);

                item.addEventListener('click', () => {
                    loadConversation(conversation.id);
                });

                conversationsList.appendChild(item);
            });
        }

        function createNewConversation() {
            const id = 'conv_' + Date.now();
            const newConversation = {
                id: id,
                title: 'New Conversation',
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                context: [
                    { role: 'system', content: settings.systemPrompt || 'You are a helpful chatbot. Provide concise and accurate responses.' }
                ]
            };

            conversations.push(newConversation);
            currentConversationId = id;
            saveConversationsToStorage();
            renderConversationsList();
            loadConversation(id);
        }

        function loadConversation(id) {
            if (id === currentConversationId) {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
                return;
            }

            currentConversationId = id;
            localStorage.setItem('chatbot_active_conversation', id);
            renderConversationsList();

            const conversation = conversations.find(conv => conv.id === id);
            if (!conversation) return;

            chatBody.innerHTML = '';
            hideEmptyState();

            conversation.messages.forEach(msg => {
                displayMessage(msg.role === 'user' ? 'user' : 'bot', msg.content, msg.timestamp);
            });

            scrollToBottom();
            
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        }

        function deleteConversation(id) {
            if (confirm('Are you sure you want to delete this conversation?')) {
                const index = conversations.findIndex(conv => conv.id === id);
                if (index !== -1) {
                    conversations.splice(index, 1);
                    saveConversationsToStorage();

                    if (id === currentConversationId) {
                        currentConversationId = null;
                        chatBody.innerHTML = '';
                        showEmptyState();
                    }

                    renderConversationsList();
                }
            }
        }

        function openRenameModal(id, currentTitle) {
            renameConversationId = id;
            conversationName.value = currentTitle;
            renameModal.style.display = 'flex';
        }

        function renameConversation() {
            const newName = conversationName.value.trim();
            if (!newName || !renameConversationId) return;

            const conversation = conversations.find(conv => conv.id === renameConversationId);
            if (conversation) {
                conversation.title = newName;
                conversation.updatedAt = Date.now();
                saveConversationsToStorage();
                renderConversationsList();
            }

            renameModal.style.display = 'none';
        }

        function exportConversation(id) {
            const conversation = conversations.find(conv => conv.id === id);
            if (!conversation) return;

            const exportData = {
                title: conversation.title,
                createdAt: new Date(conversation.createdAt).toLocaleString(),
                messages: conversation.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp).toLocaleString()
                }))
            };

            exportContent.value = JSON.stringify(exportData, null, 2);
            exportModal.style.display = 'flex';
        }

        function displayMessage(sender, content, timestamp = null) {
            hideEmptyState();

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}`;

            // Parse markdown for bot messages
            if (sender === 'bot') {
                content = marked.parse(content);
            }

            const messageTime = timestamp ? new Date(timestamp) : new Date();
            const formattedTime = messageTime.toLocaleString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                month: 'short',
                day: 'numeric'
            });

            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            if (sender === 'bot') {
                messageContent.innerHTML = content.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
                    const highlightedCode = Prism.highlight(code, Prism.languages[lang], lang);
                    return `<div class="code-container">
                        <div class="code-toolbar">
                            <button class="code-btn" onclick="copyCode(this)">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="code-btn" onclick="downloadCode(this)">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                        <pre><code class="language-${lang}">${highlightedCode}</code></pre>
                    </div>`;
                });
            } else {
                if (content.startsWith('```') && content.endsWith('```')) {
                    const codeContent = content.slice(3, -3).trim();
                    messageContent.innerHTML = `<div class="user-code" contenteditable="true" 
                        onblur="this.style.minHeight='auto'"
                        onfocus="this.style.minHeight='100px'">${codeContent}</div>`;
                } else {
                    messageContent.textContent = content;
                }
            }

            const messageTimestamp = document.createElement('div');
            messageTimestamp.className = 'message-timestamp';
            messageTimestamp.textContent = formattedTime;

            messageDiv.appendChild(messageContent);
            messageDiv.appendChild(messageTimestamp);
            chatBody.appendChild(messageDiv);

            scrollToBottom();
        }

        function showTypingIndicator() {
            if (typing) return;
            typing = true;

            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.id = 'typing-indicator';

            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'typing-dot';
                indicator.appendChild(dot);
            }

            chatBody.appendChild(indicator);
            scrollToBottom();
        }

        function hideTypingIndicator() {
            typing = false;
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.remove();
            }
        }

        function displaySystemMessage(text, isError = false) {
            const systemMsg = document.createElement('div');
            systemMsg.className = `system-message ${isError ? 'error' : ''}`;
            systemMsg.textContent = text;
            chatBody.appendChild(systemMsg);
            scrollToBottom();
        }

        function showEmptyState() {
            emptyState.style.display = 'flex';
        }

        function hideEmptyState() {
            emptyState.style.display = 'none';
        }

        async function sendMessage() {
            const message = userInput.value.trim();
            if (!message) return;

            if (!settings.apiKey) {
                displaySystemMessage('Please configure your OpenRouter API key in Settings.', true);
                settingsModal.style.display = 'flex';
                return;
            }

            if (!settings.corsProxy) {
                displaySystemMessage('Please configure a CORS Proxy URL in Settings.', true);
                settingsModal.style.display = 'flex';
                return;
            }

            if (!currentConversationId) {
                createNewConversation();
            }

            const conversation = conversations.find(conv => conv.id === currentConversationId);
            if (!conversation) return;

            displayMessage('user', message);

            const timestamp = Date.now();
            conversation.messages.push({
                role: 'user',
                content: message,
                timestamp
            });

            conversation.context.push({
                role: 'user',
                content: message
            });

            if (settings.maxContext > 0 && conversation.context.length > settings.maxContext + 1) {
                const systemMessage = conversation.context[0];
                conversation.context = [
                    systemMessage,
                    ...conversation.context.slice(-(settings.maxContext))
                ];
            }

            conversation.updatedAt = timestamp;
            saveConversationsToStorage();

            if (conversation.messages.length === 1 || conversation.title === 'New Conversation') {
                const title = message.length > 20 ? message.substring(0, 20) + '...' : message;
                conversation.title = title;
                conversation.updatedAt = Date.now();
                saveConversationsToStorage();
                renderConversationsList();
            }

            userInput.value = '';
            userInput.disabled = true;
            sendBtn.disabled = true;
            clearBtn.disabled = true;
            showTypingIndicator();

            try {
                const response = await fetch(settings.corsProxy, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.apiKey}`,
                        'HTTP-Referer': window.location.href,
                        'X-Title': 'ChatBot AMOLED'
                    },
                    body: JSON.stringify({
                        model: settings.model,
                        messages: conversation.context,
                        max_tokens: 1000
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'API request failed');
                }

                const data = await response.json();
                const botMessage = data.choices[0].message.content;

                hideTypingIndicator();
                displayMessage('bot', botMessage);

                const botTimestamp = Date.now(); // Fixed: removed the "2" typo
                conversation.messages.push({
                    role: 'assistant',
                    content: botMessage,
                    timestamp: botTimestamp
                });

                conversation.context.push({
                    role: 'assistant',
                    content: botMessage
                });

                conversation.updatedAt = botTimestamp;
                saveConversationsToStorage();
            } catch (error) {
                console.error('Error:', error);
                hideTypingIndicator();
                displayMessage('bot', `**Error:** ${error.message || 'Something went wrong. Please check your API key and CORS proxy settings.'}`);
                displaySystemMessage(`Technical details: ${error.message}`, true);
            } finally {
                userInput.disabled = false;
                sendBtn.disabled = false;
                clearBtn.disabled = false;
            }
        }

        function clearCurrentConversation() {
            if (!currentConversationId) return;

            if (confirm('Are you sure you want to clear this conversation?')) {
                const conversation = conversations.find(conv => conv.id === currentConversationId);
                if (conversation) {
                    const systemMessage = conversation.context.find(msg => msg.role === 'system') || 
                        { role: 'system', content: settings.systemPrompt || 'You are a helpful chatbot. Provide concise and accurate responses.' };
            
                    conversation.title = 'New Conversation';
                    
                    conversation.messages = [];
                    conversation.context = [systemMessage];
                    conversation.updatedAt = Date.now();
                    saveConversationsToStorage();
                    
                    chatBody.innerHTML = '';
                    showEmptyState();
                }
            }
        }

        // Code block handling functions
        function copyCode(button) {
            const codeContainer = button.closest('.code-container').querySelector('code');
            const code = codeContainer.textContent;
            navigator.clipboard.writeText(code).then(() => {
                button.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
        }

        function downloadCode(button) {
            const codeContainer = button.closest('.code-container').querySelector('code');
            const code = codeContainer.textContent;
            const lang = codeContainer.className.replace('language-', '') || 'txt';
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code_${Date.now()}.${lang}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        async function copyExportToClipboard() {
            try {
                await navigator.clipboard.writeText(exportContent.value);

                const originalText = copyExport.textContent;
                copyExport.textContent = 'Copied!';
                setTimeout(() => {
                    copyExport.textContent = originalText;
                }, 2000);
            } catch (e) {
                console.error('Copy failed:', e);
                alert('Failed to copy to clipboard. Please manually copy the text.');
            }
        }

        function downloadExportToFile() {
            const data = exportContent.value;
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function scrollToBottom() {
            chatBody.scrollTo({
                top: chatBody.scrollHeight,
                behavior: 'smooth'
            });
        }

        function setupEventListeners() {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            sendBtn.addEventListener('click', sendMessage);
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            clearBtn.addEventListener('click', clearCurrentConversation);

            newChatBtn.addEventListener('click', createNewConversation);
            startChatBtn.addEventListener('click', createNewConversation);

            openSettings.addEventListener('click', () => {
                settingsModal.style.display = 'flex';
            });

            closeSettings.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });

            cancelSettings.addEventListener('click', () => {
                loadSettings(); // Reload settings to revert changes
                settingsModal.style.display = 'none';
            });

            saveSettings.addEventListener('click', () => {
                if (saveSettingsToStorage()) {
                    settingsModal.style.display = 'none';
                    // Re-render conversations to reflect any changes to active chat
                    renderConversationsList();
                }
            });

            closeRename.addEventListener('click', () => {
                renameModal.style.display = 'none';
            });

            cancelRename.addEventListener('click', () => {
                renameModal.style.display = 'none';
            });

            saveRename.addEventListener('click', renameConversation);

            closeExport.addEventListener('click', () => {
                exportModal.style.display = 'none';
            });

            closeExportBtn.addEventListener('click', () => {
                exportModal.style.display = 'none';
            });

            copyExport.addEventListener('click', copyExportToClipboard);
            downloadExport.addEventListener('click', downloadExportToFile);

            window.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                }
                if (e.target === renameModal) {
                    renameModal.style.display = 'none';
                }
                if (e.target === exportModal) {
                    exportModal.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('open') && 
                    !sidebar.contains(e.target) && e.target !== menuToggle) {
                    sidebar.classList.remove('open');
                }
            });
        }
        
        init();
