const checkbox = document.getElementById("myCheckbox");
const quizletDiv = document.getElementById("quizletCheckDiv");
const quizletID = document.getElementById("quizletID");

window.onload = function() {
    quizletDiv.hidden = !isCheckboxEnabled();
}

// Check if the checkbox is enabled
function isCheckboxEnabled() {
    return checkbox.checked;
}

checkbox.addEventListener("change", function() {
    quizletDiv.hidden = !isCheckboxEnabled();
});

document.getElementById("copyButton").addEventListener("click", function() {
    const outputText = document.getElementById("outputText").innerText;
    navigator.clipboard.writeText(outputText)
        .then(() => {
            alert("Text copied to clipboard");
        })
        .catch(err => {
            console.error("Failed to copy: ", err);
        });
});

document.getElementById("template").addEventListener("click", function() {
    const inputTextElement = document.getElementById("inputText");
    inputTextElement.value = "# Sentence:\nDio2 kai2 seismoi2 kai2 pneuma1twn sustpophai2 kai2 a5stron kinh1seis gi1gnontai. \n\n# Quizlet:\nlyw:lösen";
});

document.getElementById("generateButton").addEventListener("click", async function() {
    const inputTextElement = document.getElementById("inputText");
    const outText = document.getElementById("outputText");
    const info = document.getElementById("info");

    const lines = inputTextElement.value.split("\n");

    info.innerText = "Generating...";
    outText.innerText = "";
    for (const line of lines) {

        if(line.startsWith("#")) {
            outText.innerText += line.replaceAll("# ", "").replaceAll("#", "") + "\n";
            continue;
        }

        const split = line.split(":");
        const greek = convert(split[0]);
        const translation = split[1];

        if(isCheckboxEnabled()) {

            const separator = quizletID.value === "" ? ":" : quizletID.value;

            outText.innerText += `${greek}${separator}${translation}\n`;
        }
        else {
            outText.innerText += `${greek}\n`;
        }
    }

    info.innerText = "Done!";
});

const
    acuteIndex = 1,
    graveIndex = 2,
    circumflexIndex = 3,
    smoothIndex = 4,
    smoothAcuteIndex = 5,
    smoothGraveIndex = 6,
    smoothCircumflexIndex = 7,
    roughIndex = 8,
    roughAcuteIndex = 9,
    roughGraveIndex = 10,
    roughCircumflexIndex = 11,
    iotaOffset = 1;

const map = {
    "a": "α",
    "b": "β",
    "g": "γ",
    "d": "δ",
    "e": "ε",
    "z": "ζ",

    "h": "η",

    "v": "θ",
    "i": "ι",
    "k": "κ",
    "l": "λ",
    "m": "μ",
    "n": "ν",
    "ß": "ξ",
    "o": "ο",
    "p": "π",
    "r": "ρ",
    "s": "σ",
    "t": "τ",

    "u": "υ",
    "y": "υ",

    "f": "φ",
    "x": "χ",
    "j": "ψ",
    "w": "ω",
}

// acute, grave, circumflex
const tones = {
    "a": "ά" + "ὰ" + "ᾶ" +  "ἀ" + "ἄ" + "ἂ" +  "ἆ" +  "ἁ" + "ἅ" + "ἃ" + "ἇ",
    "e": "έ" + "ὲ" + "?" +  "ἐ" + "ἔ" + "ἒ" +   "?" +  "ἑ" + "ἕ" + "ἓ" +  "?",
    "i": "ί" + "ὶ" +  "ῖ" +  "ἰ" + "ἴ" +  "ἲ" +   "ἶ" +  "ἱ" +  "ἵ" +  "ἳ" +  "ἷ",
    "o": "ό" + "ὸ" + "?" +  "ὀ" + "ὄ" + "ὂ" +  "?" +  "ὁ" + "ὅ" + "ὃ" +  "?",

    "u": "ύ" + "ὺ" + "ῦ" +  "ὐ" + "ὔ" + "ὒ" +  "ὖ" +  "ὑ" + "ὕ" + "ὓ" +  "ὗ",
    "y": "ύ" + "ὺ" + "ῦ" +  "ὐ" + "ὔ" + "ὒ" +  "ὖ" +  "ὑ" + "ὕ" + "ὓ" +  "ὗ",

    "h": "ή" + "ὴ" + "ῆ" +  "ἠ" + "ἤ" + "ἢ" +  "ἦ" +  "ἡ" + "ἥ" + "ἣ" +  "ἧ",

    "w": "ώ" + "ὼ" + "ῶ" + "ὠ" + "ὤ" + "ὢ" + "ὦ" + "ὡ" + "ὥ" + "ὣ" + "ὧ",
}

const diaeresis = {
    "i": "ϊ",
}

// Iota subscript
const subTones = {
    "a": "ᾳ" + "ᾴ" +  "ᾲ" + "ᾷ" +  "ᾀ" + "ᾄ" +  "ᾂ" +  "ᾆ" +  "ᾁ" + "ᾅ" + "ᾃ" +  "ᾇ",
    "h": "ῃ" + "ῄ" +  "ῂ" + "ῇ" +  "ῄ" + "ῄ" +  "ῂ" +  "ῇ" +  "ῇ" +  "ῇ" + "ῇ" +  "ῇ",
    "ä": "ῃ" + "ῄ" +  "ῂ" + "ῇ" +  "ῄ" + "ῄ" +  "ῂ" +  "ῇ" +  "ῇ" +  "ῇ" + "ῇ" +  "ῇ",
    "w": "ῳ" + "ῴ" + "ῲ" + "ῷ" + "ῴ" + "ῴ" + "ῲ" +  "ῷ" +  "ῷ" + "ῷ" + "ῷ" + "ῷ",
}

function convert(text) {

    let result = "";

    console.log("TEXT:  " + text);

    for(const word of text.split(" ")) {
        result += convertWord(word) + " ";
    }

    console.log(result);

    if(result.endsWith(" ")) {
        result = result.substring(0, result.length - 1);
    }

    return result;
}

function convertWord(word) {
    let chunks = word.match(/([a-zA-Z][^a-zA-Z]*)/g);

    if(chunks === null) {
        return word;
    }

    let result = chunks.map(chunk => convertCharacter(chunk));
    return result.join("");
}

function getChar(char, tone, iota, dia, uppercase) {

    let retu = char;

    if(iota) {
        const toneString = subTones[char];

        if(toneString === undefined) {
            console.log("Failed to get value for: " + char);
            return char;
        }

        retu = toneString.charAt(tone);
    }
    else {
        const toneString = tones[char];

        if(toneString === undefined) {
            console.log("Failed to get value for: " + char);
            return char;
        }

        retu = toneString.charAt(tone - 1);
    }

    if(char === "i" && dia) {
        retu = diaeresis[char];
    }

    if(uppercase) {
        retu = retu.toUpperCase();
    }

    return retu;
}

function convertCharacter(text) {

    console.log("converting: " + text);

    let char = text.charAt(0);
    let agc = 0;
    let sr = 0;
    let iota = false;
    let dia = false;

    let uppercase = char === char.toUpperCase();

    let numbers = text.match(/\d+/g);
    if (numbers) {
        agc = parseInt(numbers[0]);
    }

    if (text.includes("%")) {
        sr = smoothIndex;
    } else if (text.includes("&")) {
        sr = roughIndex;
    }
    if (text.includes("_")) {
        iota = true;
    }
    if (text.includes("^")) {
        dia = true;
    }

    if ((isNaN(agc) || agc === 0 || agc === undefined || agc === null) && sr === 0 && !iota && !dia) {

        // get from map

        if (uppercase) {
            char = char.toLowerCase();
        }

        const value = map[char];
        if (value) {

            if (uppercase) {
                return value.toUpperCase();
            }

            return value;
        } else {
            console.log(`Failed to convert: ${char}`);
            return text;
        }
    }

    let index = agc + sr;
    return getChar(char.toLowerCase(), index, iota, dia, uppercase);
}