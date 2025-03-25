document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial theme
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '🌞';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
    }

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '🌞';
            localStorage.setItem('theme', 'dark');
        }
    });

    // Clear button functionality
    document.getElementById('clearButton').addEventListener('click', () => {
        document.getElementById('textInput').value = '';
    });

    // Rest of your existing code...
    const apiKey = getCookie('apiKey');
    if(apiKey) {
        document.getElementById('apiKeyInput').value = apiKey;
    }
});

document.getElementById('saveApiKeyButton').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKeyInput').value;
    if (apiKey) {
        document.cookie = `apiKey=${apiKey}; path=/; max-age=31536000`; // Save for 1 year
        alert('API key saved successfully!');
    } else {
        alert('Please enter a valid API key.');
    }
});

let cachedTranslations = {};
let originalSentences = [];
document.getElementById('generateButton').addEventListener('click', async () => {
    const apiKey = getCookie('apiKey');
    if (!apiKey) {
        alert('Please enter and save your AI API key first.');
        return;
    }

    const indicator = document.getElementById('translatingIndicator');
    indicator.classList.add('active');

    try {
        const text = document.getElementById('textInput').value;
        // Store original sentences with punctuation
        originalSentences = text.split(/([.!?])\s*/).reduce((acc, curr, i, arr) => {
            if (i % 2 === 0) {
                acc.push(curr + (arr[i+1] || ''));
            }
            return acc;
        }, []).filter(Boolean);

        // Split into tokens while preserving punctuation markers
        const sentences = text.split(/([.!?])\s*/).filter(Boolean);
        const tokens = {};
        let sentenceIndex = 1;
        
        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i];
            const punctuation = sentences[i+1] || '';
            tokens[sentenceIndex] = {
                words: sentence.split(/(\s+|[,:;])/).filter(token => token.trim()),
                punctuation: punctuation
            };
            sentenceIndex++;
        }

        // Get all words for translation (filter out punctuation and spaces)
        const allWords = Object.values(tokens).flatMap(s => 
            s.words.filter(word => word.trim() && !/^[,:;.!?]$/.test(word))
        );
        
        displayWords(allWords);
        const translations = await fetchTranslations(allWords);

        // Build result object with punctuation markers
        const result = { 
            tokens: {},
            originalSentences: originalSentences
        };
        
        Object.keys(tokens).forEach(key => {
            result.tokens[key] = {
                words: tokens[key].words.reduce((acc, word) => {
                    if (word.trim() && !/^[,:;.!?]$/.test(word)) {
                        acc[word] = translations[word] || [];
                    }
                    return acc;
                }, {}),
                punctuation: tokens[key].punctuation
            };
        });

        cachedTranslations = translations;

        const json = JSON.stringify(result, null, 4);

        const language = document.getElementById('languageSelector').value;
        const extras = document.getElementById('extraInfoInput').value;
        const prompt = initialPrompt(language, json, extras);
        document.getElementById('translatingIndicator').style.display = 'block';
        const response = await promptAI(prompt);
        document.getElementById('translatingIndicator').style.display = 'none';

        console.log(response);

        const output = response.candidates[0].content.parts[0].text;

        console.log(output);

        // remove ```json from beginning and end if present
        const outputJson = output.startsWith('```json') ? output.slice(7, -3) : output;
        const parsedOutput = JSON.parse(outputJson);
        const outputs = parsedOutput.output;

        console.log(outputs);

        displayTranslations(outputs);

        // Show retry button
        document.getElementById('retryButton').style.display = 'block';
    } catch (error) {
        console.error('Translation error:', error);
        alert('An error occurred during translation. Please try again.');
    } finally {
        indicator.classList.remove('active');
    }
});

document.getElementById('retryButton').addEventListener('click', async () => {
    const apiKey = getCookie('apiKey');
    if (!apiKey) {
        alert('Please enter and save your AI API key first.');
        return;
    }

    const indicator = document.getElementById('translatingIndicator');
    indicator.classList.add('active');

    try {
        const text = document.getElementById('textInput').value;
        const sentences = text.split(/([.!?])\s*/).filter(Boolean);
        const tokens = {};
        let sentenceIndex = 1;
        
        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i];
            const punctuation = sentences[i+1] || '';
            tokens[sentenceIndex] = {
                words: sentence.split(/(\s+|[,:;])/).filter(token => token.trim()),
                punctuation: punctuation
            };
            sentenceIndex++;
        }

        const result = { 
            tokens: {},
            originalSentences: originalSentences
        };
        
        Object.keys(tokens).forEach(key => {
            result.tokens[key] = {
                words: tokens[key].words.reduce((acc, word) => {
                    if (word.trim() && !/^[,:;.!?]$/.test(word)) {
                        acc[word] = cachedTranslations[word] || [];
                    }
                    return acc;
                }, {}),
                punctuation: tokens[key].punctuation
            };
        });

        const json = JSON.stringify(result, null, 4);

        const language = document.getElementById('languageSelector').value;
        const extras = document.getElementById('extraInfoInput').value;
        const prompt = initialPrompt(language, json, extras);
        document.getElementById('translatingIndicator').style.display = 'block';
        const response = await promptAI(prompt);
        document.getElementById('translatingIndicator').style.display = 'none';

        console.log(response);

        const output = response.candidates[0].content.parts[0].text;

        console.log(output);

        // remove ```json from beginning and end if present
        const outputJson = output.startsWith('```json') ? output.slice(7, -3) : output;
        const parsedOutput = JSON.parse(outputJson);
        const outputs = parsedOutput.output;

        console.log(outputs);

        displayTranslations(outputs);
    } catch (error) {
        console.error('Translation error:', error);
        alert('An error occurred during translation. Please try again.');
    } finally {
        indicator.classList.remove('active');
    }
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function displayWords(words) {
    const outputBox = document.getElementById('outputBox');
    outputBox.innerHTML = '';
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'word-popup';
    popup.id = 'wordPopup';
    document.body.appendChild(popup);
    
    // Close popup when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('word') && e.target.id !== 'wordPopup') {
            popup.style.display = 'none';
        }
    });

    words.forEach(word => {
        const container = document.createElement('div');
        container.className = 'word-container';
        
        const wordElement = document.createElement('span');
        wordElement.className = 'word';
        wordElement.textContent = word;
        wordElement.id = `word-${word}`;
        
        // Add click handler
        wordElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const translations = cachedTranslations[word] || ['No translations found'];
            
            // Position and show popup
            const rect = wordElement.getBoundingClientRect();
            popup.innerHTML = `
                <h4>${word}</h4>
                <ul>
                    ${translations.map(t => `<li>${t}</li>`).join('')}
                </ul>
            `;
            
            popup.style.display = 'block';
            popup.style.left = `${rect.left + window.scrollX}px`;
            popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
        });
        
        container.appendChild(wordElement);
        outputBox.appendChild(container);
    });
}

function markWordAsCompleted(word) {
    const wordElement = document.getElementById(`word-${word}`);
    if (wordElement) {
        wordElement.classList.add('completed');
    }
}

async function fetchTranslations(wordTokens) {
    const translations = {};

    for (const word of wordTokens) {
        console.log("fetching translation for", word);
        try {
            const response = await fetch(`https://latincheats.stormcph-dk.workers.dev/lateinme?q=${word}`);
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const translationEntries = doc.querySelectorAll('dd.translationEntry a');
            translations[word] = Array.from(translationEntries).map(entry => entry.textContent);
            markWordAsCompleted(word);
        } catch (error) {
            console.error(`Error fetching translation for ${word}:`, error);
            translations[word] = ['Translation error'];
        }
    }

    // remove empty translations
    Object.keys(translations).forEach(key => {
        translations[key] = translations[key].filter(Boolean);
    });

    return translations;
}

async function promptAI(prompt) {
    const apiKey = getCookie('apiKey');
    if (!apiKey) {
        alert('Please enter and save your AI API key first.');
        return;
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });

    const data = await response.json();
    return data;
}

function initialPrompt(lang, json, extras) {
    return `You're an AI Latin translator. You will be given a JSON object containing:
1. Original Latin sentences with punctuation
2. Individual words with their possible translations

Your task is to:
1. Use the most appropriate translations for each word
2. Reconstruct grammatically correct sentences in ${lang}
3. Preserve the original punctuation and sentence structure
4. Add necessary words (like articles) to make the translation natural

Return your response in this JSON format:
{
    "output": {
        "1": "First translated sentence with punctuation.",
        "2": "Second translated sentence with punctuation."
    }
}

Extra context from user: ${extras || 'None'}

Here is the Latin text to translate:
${json}`;
}

function displayTranslations(translations) {
    const translationsBox = document.getElementById('translationsBox');
    translationsBox.innerHTML = '';
    Object.keys(translations).forEach(key => {
        const translationElement = document.createElement('div');
        translationElement.className = 'translation';
        translationElement.innerHTML = `
            <div class="original">${originalSentences[key-1] || ''}</div>
            <div class="translated">${translations[key]}</div>
        `;
        translationsBox.appendChild(translationElement);
    });
}
