const checkbox = document.getElementById("myCheckbox");

// Check if the checkbox is enabled
function isCheckboxEnabled() {
    return checkbox.checked;
}

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
    inputTextElement.value = "# Sentence:\nDio2 kai2 seismoi2 kai2 pneuma1twn sustpophai2 kai2 a5stron kinh1seis gi1gnontai. \n\n# Quizlet:\nlüw:lösen";
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
        const greek = convertToGreek(split[0]);
        const translation = split[1];

        if(isCheckboxEnabled()) {
            outText.innerText += `${greek}, ${translation}\n`;
        }
        else {
            outText.innerText += `${greek}\n`;
        }
    }

    info.innerText = "Done!";
});

//region Lowercase

const map = {
    "a": "α",
    "b": "β",
    "g": "γ",
    "d": "δ",
    "e": "ε",
    "z,f": "ζ",

    "h": "η",
    "ä": "η",
    "hä": "η",
    "he": "η",

    "th": "θ",
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
    "ü": "υ",
    "ph": "φ",

    "x": "χ",
    "ps": "ψ",
    "w": "ω",
}

const tones = {
    "a": "άὰᾶἀἄἂἆἁἅἃἇ",
    "e": "έὲ?ἐἔἒ?ἑἕἓ?",
    "i": "ίὶῖἰἴἲἶἱἵἳἷ",
    "o": "όὸ?ὀὄὂ?ὁὅὃ?",
    "u": "ύὺῦὐὔὒὖὑὕὓὗ",
    "h": "ήὴῆἠἤἢἦἡἥἣἧ",
    "ω": "ῶὼῳὠὤὢὦὡὥὣὧ",
}

const subscripts = {
    "a": "ᾳᾴᾲᾷᾀᾄᾂᾆᾁᾅᾃᾇ",
    "h": "ῃῄῂῇἠἤἢἦἡἥἣἧ",
    "w": "ῳῴῲῷὠὤὢὦὡὥὣὧ",
}

//endregion

//region Uppercase

const upMap = {
    "A": "Α",
    "B": "Β",
    "G": "Γ",
    "D": "Δ",
    "E": "Ε",
    "Z,F": "Ζ",

    "H": "Η",
    "Ä": "Η",
    "HÄ": "Η",
    "HE": "Η",

    "TH": "Θ",
    "I": "Ι",
    "K": "Κ",
    "L": "Λ",
    "M": "Μ",
    "N": "Ν",
    "Ξ": "Ξ",
    "O": "Ο",
    "P": "Π",
    "R": "Ρ",
    "S": "Σ",
    "T": "Τ",

    "U": "Υ",
    "Y": "Υ",
    "Ü": "Υ",

    "PH": "Φ",
    "X": "Χ",
    "PS": "Ψ",
    "W": "Ω",
}

const upTones = {
    "A": "ΆᾺ?ἈἌ?ἎἉἍἋἏ",
    "E": "ΈῈ?ἘἜἚ?ἙἝἛ?",
    "I": "ΊῚἸἼἺἾἹἽἻἿΪ",
    "O": "ΌῸὈὌὊ?ὉὍὋ?",
    "U": "ΎῪ?????ὙὝὛὟΫ",
    "H": "ΉῊἨἬἪἮἩἭἫἯ",
    "Ω": "ΏῺῳὨὬὢὦὩὭὣὧ",
}

const upSubscripts = {
    "A": "ᾼ???ᾈᾌᾊᾎᾉᾍᾋᾏ",
    "H": "ῌ???ἨἬἪἮἩἭἫἯ",
    "W": "ῼ???ᾨᾬᾪᾮᾩᾭᾫᾯ",
}

// endregion

function convertToGreek(text) {
    let newText = "";

    for(let i = 0; i < text.length; i++) {
        const char = text[i];

        if(char == " ") {
            newText += " ";
            continue;
        }

        let uppercase = false;
        if(char === char.toUpperCase()) {
            uppercase = true;
        }

        let tone = -1;
        let sub = false;
        // check if next character is a number and then check if the one after that is a number, if then next cahracter is a _ set sub to true and check next 2 cahracters to get tone number
        if(i + 1 < text.length) {

            const nextChar = text[i + 1];

            if(nextChar.trim() !== "" && !isNaN(nextChar)) {
                let skip = false;
                if(i + 2 < text.length) {
                    if(!isNaN(text[i + 2]) && text[i + 2].trim() !== "") {
                        tone = parseInt(text[i + 1] + text[i + 2]);
                        i += 2;
                        skip = true;
                    }
                }

                if(!skip) {
                    tone = parseInt(text[i + 1]);
                    i++;
                }
            }
            else if(nextChar === "_") {
                sub = true;
                i++;
                if(!isNaN(text[i + 1]) && text[i + 1].trim() !== "") {
                    skip = false;
                    if(i + 2 < text.length) {
                        if(!isNaN(text[i + 2]) && text[i + 2].trim() !== "") {
                            tone = parseInt(text[i + 1] + text[i + 2]);
                            i += 2;
                            skip = true;
                        }
                    }

                    if(!skip) {
                        tone = parseInt(text[i + 1]);
                        i++;
                    }
                }
            }
            else {
                tone = -1;
            }
        }
        if(tone === -1 || isNaN(tone)) {
            if(uppercase) {
                const value = upMap[char];
                if(value) {
                    newText += value;
                }
                else {
                    newText += char;
                    console.log(`Failed to convert: ${char}`);
                }
            }
            else {
                const value = map[char];
                if(value) {
                    newText += value;
                }
                else {
                    newText += char;
                    console.log(`Failed to convert: ${char}`);
                }
            }
        }
        else {
            newText += getTone(char, tone, sub, uppercase);
        }
    }

    return newText;
}

function getTone(char, tone, sub, uppercase) {
    if(sub) {
        let value;
        if(uppercase) {
            value = upSubscripts[char];
        }
        else {
            value = subscripts[char];
        }

        if(value === undefined) {
            console.log("Failed to get value for: " + char);
            return char;
        }

        return value.charAt(tone);
    }
    else {
        let value;
        if(uppercase) {
            value = upTones[char];
        }
        else {
           value = tones[char];
        }

        if(value === undefined) {
            console.log("Failed to get value for: " + char);
            return char;
        }

        return value.charAt(tone - 1);
    }
}