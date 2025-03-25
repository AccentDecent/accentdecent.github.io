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
        const sentences = text.split(/[.!?]\s*/).filter(Boolean);
        const tokens = sentences.reduce((acc, sentence, index) => {
            acc[index + 1] = sentence.split(/(\s+|[,:;.!?])/).filter(Boolean);
            return acc;
        }, {});

        // remove spaces and special characters from tokens
        Object.keys(tokens).forEach(key => {
            tokens[key] = tokens[key].filter(token => token.trim() && !/[,:;.!?]/.test(token));
        });

        const allWords = Object.values(tokens).flat();
        displayWords(allWords);
        const translations = await fetchTranslations(allWords);

        const result = { tokens: {} };
        Object.keys(tokens).forEach(key => {
            result.tokens[key] = tokens[key].reduce((acc, word) => {
                acc[word] = translations[word] || [];
                return acc;
            }, {});
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

        // remove ```json from beginning and end
        const outputJson = output.slice(7, -3);
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
        const sentences = text.split(/[.!?]\s*/).filter(Boolean);
        const tokens = sentences.reduce((acc, sentence, index) => {
            acc[index + 1] = sentence.split(/(\s+|[,:;.!?])/).filter(Boolean);
            return acc;
        }, {});

        // remove spaces and special characters from tokens
        Object.keys(tokens).forEach(key => {
            tokens[key] = tokens[key].filter(token => token.trim() && !/[,:;.!?]/.test(token));
        });

        const result = { tokens: {} };
        Object.keys(tokens).forEach(key => {
            result.tokens[key] = tokens[key].reduce((acc, word) => {
                acc[word] = cachedTranslations[word] || [];
                return acc;
            }, {});
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

        // remove ```json from beginning and end
        const outputJson = output.slice(7, -3);
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
    words.forEach(word => {
        const wordContainer = document.createElement('div');
        wordContainer.className = 'word-container';
        wordContainer.style.position = 'relative';
        wordContainer.style.display = 'inline-block';
        
        const wordElement = document.createElement('span');
        wordElement.className = 'word';
        wordElement.textContent = word;
        wordElement.id = `word-${word}`;
        
        // Create translations popup
        const translationsPopup = document.createElement('div');
        translationsPopup.className = 'word-translations';
        translationsPopup.id = `translations-${word}`;
        
        wordContainer.appendChild(wordElement);
        wordContainer.appendChild(translationsPopup);
        outputBox.appendChild(wordContainer);
        
        // Add click event to show translations
        wordElement.addEventListener('click', (e) => {
            e.stopPropagation();
            showWordTranslations(word);
        });
    });
}

function showWordTranslations(word) {
    const translations = cachedTranslations[word] || [];
    const translationsPopup = document.getElementById(`translations-${word}`);
    
    if (translationsPopup.style.display === 'block') {
        translationsPopup.style.display = 'none';
        return;
    }
    
    // Hide all other translation popups
    document.querySelectorAll('.word-translations').forEach(popup => {
        popup.style.display = 'none';
    });
    
    if (translations.length > 0) {
        translationsPopup.innerHTML = '';
        translations.forEach(translation => {
            const translationItem = document.createElement('div');
            translationItem.className = 'word-translation-item';
            translationItem.textContent = translation;
            translationsPopup.appendChild(translationItem);
        });
        translationsPopup.style.display = 'block';
    } else {
        const noTranslation = document.createElement('div');
        noTranslation.className = 'word-translation-item';
        noTranslation.textContent = 'No translations found';
        translationsPopup.innerHTML = '';
        translationsPopup.appendChild(noTranslation);
        translationsPopup.style.display = 'block';
    }
}

// Add click event to document to close popups when clicking elsewhere
document.addEventListener('click', () => {
    document.querySelectorAll('.word-translations').forEach(popup => {
        popup.style.display = 'none';
    });
});

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
        const response = await fetch(`https://latincheats.stormcph-dk.workers.dev/lateinme?q=${word}`);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const translationEntries = doc.querySelectorAll('dd.translationEntry a');
        translations[word] = Array.from(translationEntries).map(entry => entry.textContent);
        markWordAsCompleted(word);
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
    return "You're an AI old language Translator. You will be given a json array with each word given multiple translation possibilities. Your job is to choose the most fitting translation and construct a senseful sentence from the words. You should format your response as a json like this:\n" +
        "{\n" +
        "\t\"output\": {\n" +
        "\t\t\"1\": \"translated\",\n" +
        "\t\t\"2\": ...\n" +
        "\t}\n" +
        "}\n" +
        "You are to provide the translation in this language:\n" + lang +
        "Here is some extra information to the text by the user (may be nothing): " + extras +
        "\nHere is your text to be translated:" + json;
}

function displayTranslations(translations) {
    const translationsBox = document.getElementById('translationsBox');
    translationsBox.innerHTML = '';
    Object.keys(translations).forEach(key => {
        const translationElement = document.createElement('div');
        translationElement.className = 'translation';
        translationElement.textContent = `${key}: ${translations[key]}`;
        translationsBox.appendChild(translationElement);
    });
}
