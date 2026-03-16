document.addEventListener("DOMContentLoaded", () => {
    // --- UI Elements ---
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatWindow = document.getElementById('chat-window');
    const newChatBtn = document.getElementById('new-chat-btn');

    // File Uploads
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const fileBadgesContainer = document.getElementById('file-badges-container');

    // Settings
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const setProvider = document.getElementById('setting-provider');
    const setApiKey = document.getElementById('setting-api-key');
    const setFlashModel = document.getElementById('setting-flash-model');
    const setProModel = document.getElementById('setting-pro-model');

    // Document Full Viewer
    const docModal = document.getElementById('document-modal');
    const closeDocBtn = document.getElementById('close-doc-btn');
    const docRenderArea = document.getElementById('document-render-area');
    const downloadDocBtn = document.getElementById('download-doc-btn');
    const dropZone = document.getElementById('drop-zone');

    // --- Lernzettel Modal Elements ---
    const generateNotesBtn = document.getElementById('generate-notes-btn');
    const lzModal = document.getElementById('lz-modal');
    const closeLzBtn = document.getElementById('close-lz-btn');
    const lzAttachBtn = document.getElementById('lz-attach-btn');
    const lzFileBadges = document.getElementById('lz-file-badges');

    // Steps
    const step1 = document.getElementById('lz-step-1');
    const step2 = document.getElementById('lz-step-2');
    const step3 = document.getElementById('lz-step-3');
    const step4 = document.getElementById('lz-step-4');

    // Step Buttons/UI
    const lzStartOutlineBtn = document.getElementById('lz-start-outline-btn');
    const lzOutlineContainer = document.getElementById('lz-outline-container');
    const lzGenerateDocBtn = document.getElementById('lz-generate-doc-btn');
    const lzProgressText = document.getElementById('lz-progress-text');
    const lzProgressBar = document.getElementById('lz-progress-bar');

    // --- State Management ---
    let appSettings = { provider: 'gemini', apiKey: '', flashModel: 'gemini-2.5-flash', proModel: 'gemini-2.5-pro' };
    let documentContext = "";
    let uploadedFiles =[];
    let finalMarkdownContent = "";

    // Load Settings
    if (localStorage.getItem('school_expert_settings')) {
        appSettings = JSON.parse(localStorage.getItem('school_expert_settings'));
        setProvider.value = appSettings.provider;
        setApiKey.value = appSettings.apiKey;
        setFlashModel.value = appSettings.flashModel;
        setProModel.value = appSettings.proModel;
    }

    saveSettingsBtn.addEventListener('click', () => {
        appSettings = { provider: setProvider.value, apiKey: setApiKey.value, flashModel: setFlashModel.value, proModel: setProModel.value };
        localStorage.setItem('school_expert_settings', JSON.stringify(appSettings));
        settingsModal.classList.add('hidden');
    });

    // Basic Toggles
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    closeDocBtn.addEventListener('click', () => docModal.classList.add('hidden'));

    newChatBtn.addEventListener('click', () => {
        chatWindow.innerHTML = '';
        documentContext = "";
        uploadedFiles =[];
        syncFileUI();
        appendMessage("Chat cleared. Upload new materials to start again!", "ai");
    });

    // --- Unified File Handling ---
    const triggerFileSelect = () => fileInput.click();
    attachBtn.addEventListener('click', triggerFileSelect);
    lzAttachBtn.addEventListener('click', triggerFileSelect); // Link modal button to same input

    fileInput.addEventListener('change', async (e) => {
        handleFiles(Array.from(e.target.files));
        e.target.value = '';
    });

    async function handleFiles(files) {
        for (let file of files) {
            if (uploadedFiles.find(f => f.name === file.name)) continue;
            uploadedFiles.push(file);

            try {
                let text = file.name.endsWith('.pdf') ? await extractTextFromPDF(file) : await file.text();
                documentContext += `\n\n[Source: ${file.name}]\n${text}`;
            } catch (err) {
                console.error("Extraction error:", err);
            }
        }
        syncFileUI();
    }

    // --- Drag and Drop Logic ---
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.remove('hidden');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.add('hidden'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.add('hidden');
        handleFiles(Array.from(e.dataTransfer.files));
    });

    function syncFileUI() {
        fileBadgesContainer.innerHTML = '';
        lzFileBadges.innerHTML = '';

        uploadedFiles.forEach(file => {
            const html = `<div class="file-badge"><i class="fas fa-file"></i> ${file.name} <button class="remove-file" data-name="${file.name}"><i class="fas fa-times"></i></button></div>`;
            fileBadgesContainer.insertAdjacentHTML('beforeend', html);
            lzFileBadges.insertAdjacentHTML('beforeend', html);
        });

        const hasFiles = uploadedFiles.length > 0;
        lzStartOutlineBtn.disabled = !hasFiles;

        // Handle removals natively from either view
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                uploadedFiles = uploadedFiles.filter(f => f.name !== name);
                syncFileUI(); // Re-render both
            });
        });

        updateInputState();
    }

    async function extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += `[Page ${i}] ` + textContent.items.map(item => item.str).join(' ') + "\n";
        }
        return fullText;
    }

    const updateInputState = () => {
        sendBtn.disabled = !(chatInput.value.trim().length > 0 || uploadedFiles.length > 0);
    };

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        updateInputState();
    });

    // --- LLM API Wrapper ---
    async function callLLM(systemPrompt, userPrompt, modelName) {
        if (!appSettings.apiKey) {
            // Mock Fallback
            return new Promise(resolve => {
                setTimeout(() => {
                    if (systemPrompt.includes("JSON")) resolve(JSON.stringify(["Introduction & Basics", "Core Mechanisms", "Advanced Concepts", "Summary & Review"]));
                    else resolve(`### Generated Content\n\nThis is a deep dive into the requested topic.\n\n* Detail 1\n* Detail 2\n\n#### Active Recall Questions\n1. What is the main point?`);
                }, 1500);
            });
        }
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${appSettings.apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts:[{ text: `${systemPrompt}\n\nUser Input: ${userPrompt}` }] }],
                    generationConfig: { temperature: 0.3 }
                })
            });
            const data = await response.json();
            if(data.error) throw new Error(data.error.message);
            let text = data.candidates[0].content.parts[0].text;
            if (systemPrompt.includes("JSON")) text = text.replace(/```json\n?/, '').replace(/```/, '');
            return text;
        } catch (error) {
            console.error("API Error:", error);
            return `Error: ${error.message}`;
        }
    }

    // --- LERNZETTEL WORKFLOW ---

    // Open Workflow Modal
    generateNotesBtn.addEventListener('click', () => {
        lzModal.classList.remove('hidden');
        showLzStep(1);
    });
    closeLzBtn.addEventListener('click', () => lzModal.classList.add('hidden'));

    function showLzStep(stepNum) {
        [step1, step2, step3, step4].forEach(s => s.classList.add('hidden'));
        if(stepNum === 1) step1.classList.remove('hidden');
        if(stepNum === 2) step2.classList.remove('hidden');
        if(stepNum === 3) step3.classList.remove('hidden');
        if(stepNum === 4) step4.classList.remove('hidden');
    }

    // Step 1 -> Step 2 (Extract Outline)
    lzStartOutlineBtn.addEventListener('click', async () => {
        showLzStep(2);

        const sysPrompt = `You are an expert tutor. Extract a comprehensive Syllabus/Outline from the context. 
        Output STRICTLY as a JSON array of strings. Example:["Topic 1", "Topic 2"]. Context: ${documentContext.substring(0, 30000)}`;

        const response = await callLLM(sysPrompt, "Generate outline JSON.", appSettings.flashModel);

        try {
            const outlineArray = JSON.parse(response);
            renderOutlineUI(outlineArray);
            showLzStep(3);
        } catch (e) {
            alert("Failed to parse outline from AI. Please try again.");
            showLzStep(1);
        }
    });

    // Render Step 3 List with Reordering
    function renderOutlineUI(outlineArray) {
        lzOutlineContainer.innerHTML = '';
        outlineArray.forEach((topic, index) => {
            const item = document.createElement('div');
            item.className = 'outline-item';
            item.innerHTML = `
                <input type="checkbox" id="topic-${index}" value="${topic}" checked>
                <label for="topic-${index}">${topic}</label>
                <div class="reorder-btns">
                    <button class="reorder-btn up-btn" title="Move Up"><i class="fas fa-chevron-up"></i></button>
                    <button class="reorder-btn down-btn" title="Move Down"><i class="fas fa-chevron-down"></i></button>
                </div>
            `;
            lzOutlineContainer.appendChild(item);
        });

        // Add Reorder Event Listeners
        lzOutlineContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.reorder-btn');
            if (!btn) return;
            const item = btn.closest('.outline-item');
            if (btn.classList.contains('up-btn') && item.previousElementSibling) {
                lzOutlineContainer.insertBefore(item, item.previousElementSibling);
            } else if (btn.classList.contains('down-btn') && item.nextElementSibling) {
                lzOutlineContainer.insertBefore(item.nextElementSibling, item);
            }
        });
    }

    // Step 3 -> Step 4 (Execute Generation Loop)
    lzGenerateDocBtn.addEventListener('click', async () => {
        // Gather checked topics in their current visual order
        const checkedInputs = Array.from(lzOutlineContainer.querySelectorAll('.outline-item input:checked'));
        const selectedTopics = checkedInputs.map(input => input.value);

        if (selectedTopics.length === 0) {
            alert("Please select at least one topic.");
            return;
        }

        showLzStep(4);
        lzProgressBar.style.width = '0%';
        finalMarkdownContent = `# Custom Study Guide (Lernzettel)\n\nGenerated by School Expert AI\n\n---\n\n`;

        for (let i = 0; i < selectedTopics.length; i++) {
            const topic = selectedTopics[i];

            // Update UI
            lzProgressText.innerHTML = `Generating section ${i+1}/${selectedTopics.length}: <br><b>${topic}</b>`;
            lzProgressBar.style.width = `${((i) / selectedTopics.length) * 100}%`;

            const sysPrompt = `You are a tutor. Write comprehensive study notes ONLY for the topic: [${topic}]. 
            Use provided context. Include definitions, formulas, and examples. Format in Markdown.
            End response with "## Active Recall Questions" (3-5 flashcards). Context: ${documentContext.substring(0, 30000)}`;

            const sectionContent = await callLLM(sysPrompt, `Write detailed notes for: ${topic}`, appSettings.proModel);
            finalMarkdownContent += `## ${topic}\n\n${sectionContent}\n\n---\n\n`;
        }

        lzProgressBar.style.width = '100%';
        lzProgressText.innerHTML = "Finalizing document...";

        setTimeout(() => embedDocumentInChat(), 800); // Small delay to let progress bar finish visually
    });

    // Finish Workflow: Put result in Chat
    function embedDocumentInChat() {
        lzModal.classList.add('hidden'); // Close Modal

        const msgDiv = createMessageDiv('system', '');
        const content = msgDiv.querySelector('.content');

        content.innerHTML = `
            <div class="doc-preview-card">
                <h4 style="margin-bottom:8px; color: var(--accent-magic);"><i class="fas fa-graduation-cap"></i> Lernzettel Ready!</h4>
                <p style="font-size:13px;">I have analyzed your files and generated your comprehensive study guide based on your selected outline.</p>
                <div class="doc-preview-content markdown-body" style="margin-top:10px;">
                    ${marked.parse(finalMarkdownContent)}
                </div>
                <button class="primary-btn magic-bg mt-10 view-full-btn"><i class="fas fa-expand-arrows-alt"></i> Read Full Document & Download</button>
            </div>
        `;

        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Bind button to open the large Document viewer modal
        content.querySelector('.view-full-btn').addEventListener('click', () => {
            docRenderArea.innerHTML = marked.parse(finalMarkdownContent);
            docModal.classList.remove('hidden');
        });
    }

    // Download Markdown natively
    downloadDocBtn.addEventListener('click', () => {
        const blob = new Blob([finalMarkdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Lernzettel.md';
        a.click();
        URL.revokeObjectURL(url);
    });

    // --- Standard Chat Handling ---
    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text && uploadedFiles.length === 0) return;

        if (text) appendMessage(text, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';
        updateInputState();

        const loaderId = "loader-" + Date.now();
        const loaderMsg = createMessageDiv('ai', `<span class="loader" id="${loaderId}"></span> Thinking...`);
        chatWindow.appendChild(loaderMsg);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        const sysPrompt = `You are an AI tutor. Answer based on context: ${documentContext.substring(0, 15000)}`;
        const reply = await callLLM(sysPrompt, text || "Summarize the attached files.", appSettings.flashModel);

        loaderMsg.querySelector('.content').innerHTML = marked.parse(reply);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) sendMessage();
        }
    });

    // Helpers
    function appendMessage(text, sender) {
        const msgDiv = createMessageDiv(sender, text);
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function createMessageDiv(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        const icon = sender === 'user' ? 'fa-user' : (sender === 'system' ? 'fa-wand-magic-sparkles' : 'fa-robot');
        msgDiv.innerHTML = `<div class="avatar"><i class="fas ${icon}"></i></div><div class="content">${text}</div>`;
        return msgDiv;
    }
});