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

    // Paste button functionality
    document.getElementById('pasteButton').addEventListener('click', async () => {
        try {
            document.getElementById('textInput').value = await navigator.clipboard.readText();
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            alert('Failed to paste from clipboard.');
        }
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

async function handleTranslation() {
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
            if (i % 2 === 0 && curr.trim()) {
                acc.push(curr.trim() + (arr[i+1] || ''));
            }
            return acc;
        }, []).filter(s => s.trim());

        // Split into tokens while preserving punctuation markers
        const sentences = text.split(/([.!?])\s*/).filter(Boolean);
        const tokens = {};
        let sentenceIndex = 1;

        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i];
            if (!sentence.trim()) continue;
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
        // Only fetch new translations if cache is empty (first run)
        if (Object.keys(cachedTranslations).length === 0) {
            cachedTranslations = await fetchTranslations(allWords);
        }

        // Build result object with punctuation markers
        const result = {
            tokens: {},
            originalSentences: originalSentences
        };

        Object.keys(tokens).forEach(key => {
            result.tokens[key] = {
                words: tokens[key].words.reduce((acc, word) => {
                    if (word.trim() && !/^[,:;.!?]$/.test(word)) {
                        acc[word] = cachedTranslations[word] || { entries: [] };
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

        const response = await promptAI(prompt);

        const output = response.candidates[0].content.parts[0].text;

        // remove ```json from beginning and end if present
        const outputJson = output.trim().replace(/^```json\s*|```$/g, '');
        const parsedOutput = JSON.parse(outputJson);
        const outputs = parsedOutput.output;

        displayTranslations(outputs);

        // Show retry button
        document.getElementById('retryButton').style.display = 'block';
    } catch (error) {
        console.error('Translation error:', error);
        alert('An error occurred during translation: ' + error.message);
    } finally {
        indicator.classList.remove('active');
    }
}

document.getElementById('generateButton').addEventListener('click', () => {
    // Clear cache for a new translation
    cachedTranslations = {};
    handleTranslation();
});

document.getElementById('retryButton').addEventListener('click', handleTranslation);

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function displayWords(words) {
    const outputBox = document.getElementById('outputBox');
    outputBox.innerHTML = '';

    let popup = document.getElementById('wordPopup');
    if (!popup) {
        popup = document.createElement('div');
        popup.className = 'word-popup';
        popup.id = 'wordPopup';
        document.body.appendChild(popup);
        document.addEventListener('click', (e) => {
            if (popup && !popup.contains(e.target) && !e.target.classList.contains('word')) {
                popup.style.display = 'none';
            }
        });
    }

    const uniqueWords = [...new Set(words)];
    uniqueWords.forEach(word => {
        const container = document.createElement('div');
        container.className = 'word-container';

        const wordElement = document.createElement('span');
        wordElement.className = 'word';
        wordElement.textContent = word;
        wordElement.id = `word-${word}`;

        wordElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const wordData = cachedTranslations[word];
            let content = `<h4>${word}</h4>`;

            if (!wordData || !wordData.entries || wordData.entries.length === 0) {
                content += '<p>No data found.</p>';
            } else {
                wordData.entries.forEach(entry => {
                    content += `<div class="popup-entry"><h5>${entry.word}</h5>`;
                    if (entry.translations && entry.translations.length > 0) {
                        content += `<ul>${entry.translations.map(t => `<li>${t}</li>`).join('')}</ul>`;
                    }
                    if (entry.formAnalysis && entry.formAnalysis.length > 0) {
                        content += `<p class="form-analysis"><strong>Analysis:</strong> ${entry.formAnalysis.join(', ')}</p>`;
                    }
                    content += `</div>`;
                });
            }

            const rect = wordElement.getBoundingClientRect();
            popup.innerHTML = content;
            popup.style.display = 'block';

            const popupHeight = popup.offsetHeight;
            const popupWidth = popup.offsetWidth;
            let top = rect.bottom + window.scrollY + 5;
            let left = rect.left + window.scrollX;

            if (top + popupHeight > window.innerHeight + window.scrollY) {
                top = rect.top + window.scrollY - popupHeight - 5;
            }
            if (left + popupWidth > window.innerWidth + window.scrollX) {
                left = window.innerWidth + window.scrollX - popupWidth - 10;
            }

            popup.style.top = `${top}px`;
            popup.style.left = `${left}px`;
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
    const translationsCache = {};
    const uniqueWords = [...new Set(wordTokens)];

    for (const originalWord of uniqueWords) {
        // NOTE: We now query with the original word ('servaque'). The `-que` logic is handled by the API.
        const wordToFetch = originalWord;

        console.log(`Fetching translation for "${wordToFetch}"`);
        try {
            const response = await fetch(`https://latincheats.stormcph-dk.workers.dev/lateinme/json?q=${encodeURIComponent(wordToFetch)}`);
            if (!response.ok) {
                console.log("HTTP error", response.status);
                alert("An error occurred while fetching translations. Please try again later. Error code: " + response.status);
                return;
            }
            const data = await response.json();

            // The API returns an array of possible word objects. We store them all.
            if (data && data.length > 0) {
                translationsCache[originalWord] = {
                    entries: data.map(entry => ({
                        word: entry.word || 'Unknown',
                        translations: entry.translations || [],
                        formAnalysis: entry.formAnalysis || null
                    }))
                };
            } else {
                // If no data, still create a valid structure to avoid errors
                translationsCache[originalWord] = { entries: [] };
            }
            markWordAsCompleted(originalWord);
        } catch (error) {
            console.error(`Error fetching translation for ${originalWord}:`, error);
            translationsCache[originalWord] = {
                entries: [{
                    word: 'Error',
                    translations: ['Translation error'],
                    formAnalysis: null
                }]
            };
        }
    }
    return translationsCache;
}

async function promptAI(prompt) {
    const apiKey = getCookie('apiKey');
    if (!apiKey) {
        throw new Error('AI API key is missing.');
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("AI API Error:", errorData);
        throw new Error(`AI API request failed with status ${response.status}: ${errorData.error.message}`);
    }

    return await response.json();
}

function initialPrompt(lang, json, extras) {
    return `You are a highly skilled AI specializing in Latin translation. You will be provided with a JSON object containing structured data about a Latin text.

The JSON object includes:
1. "originalSentences": The complete Latin sentences as they were input.
2. "tokens": An object where each key is a sentence number. Each sentence contains:
   - "words": An object where each key is a Latin word from the sentence. The value is an object containing an "entries" array.
   - "entries": This array holds one or more objects, representing the different possible interpretations of the Latin word. For example, "servaque" could be an entry for "serva" (slave girl) and an entry for "que" (and). Each entry object contains:
     - "word": A string indicating the base word and its type (e.g., "serva (Substantiv)").
     - "translations": An array of possible translations.
     - "formAnalysis": An array describing the word's grammatical form (e.g., case, number, gender). This is crucial for context.
   - "punctuation": The concluding punctuation for that sentence.

Your task is to perform a high-quality translation into ${lang} by following these steps:
1. Deconstruct compound words. For a word with multiple "entries", like "servaque", you must understand it's composed of "serva" and "que".
2. Analyze the "formAnalysis" for each entry to understand its grammatical role. This is the most important clue.
3. Select the most contextually appropriate meaning from the "translations" array for each component.
4. If the extra context contains specific instructions or notes, consider them while translating.
5. If the extra context includes word translations, ALWAYS prioritize those meanings.
6. Construct a fluent, grammatically correct sentence in ${lang}, adding necessary words (articles, helper verbs) that are implied in Latin.
7. Maintain the original sentence structure and apply the original punctuation.

User has provided this extra context: ${extras || 'None'}

Here is the Latin data:
${json}

Your final output MUST be a valid JSON object in the following format, with no other text or explanations before or after it:
{
    "output": {
        "1": "First translated sentence with punctuation.",
        "2": "Second translated sentence with punctuation."
    }
}`;
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