function convertToPinyin() {
    const inputText = document.getElementById('inputText').value.trim();
    const output = document.getElementById('output');

    // Clear previous output
    output.innerText = "";

    if (inputText === "") {
        output.innerText = "Please enter Chinese characters.";
        return;
    }

    // Parse XML data
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, "text/xml");

    const items = xmlDoc.getElementsByTagName('item');
    const pinyinMap = new Map();

    for (const item of items) {
        const unicode = item.getAttribute('unicode');
        const hanyu = item.getAttribute('hanyu');
        pinyinMap.set(unicode, hanyu);
    }

    const lines = inputText.split("\n");
    let result = "";

    for (const line of lines) {
        const characters = line.trim();
        let pinyin = "";
        for (let i = 0; i < characters.length; i += 1) {
            // get unicode of character
            const unicode = characters.charCodeAt(i).toString(16).toUpperCase();
            const hanyu = pinyinMap.get(unicode);

            console.log("Unidcode: " + unicode + " Hanyu: " + hanyu);

            if (hanyu) {
                const toneNumber = getToneNumber(hanyu);
                const syllableWithoutTone = hanyu.substring(0, hanyu.length - 1);
                var to = applyTone(syllableWithoutTone, toneNumber) + " ";
                console.log(to);
                pinyin += to;

                console.log("Tone Number: " + toneNumber);

            } else {
                pinyin += characters[i] + " (No Pinyin)";
            }
        }
        result += pinyin + "\n";
    }

    output.innerText = result;
}

function getToneNumber(hanyu) {
    const toneChar = hanyu[hanyu.length - 1];
    return parseInt(toneChar);
}

function applyTone(syllable, toneNumber) {
    const toneMap = {
        "a": "āáǎàa",
        "e": "ēéěèe",
        "i": "īíǐìi",
        "o": "ōóǒòo",
        "u": "ūúǔùu",
    };

    console.log("Syllable: " + syllable + " Tone Number: " + toneNumber);

    // logic for pinyin: alphabetically the tones are assigned, so for example for bai with tone 1 it would be bāi (applied to the a instead of the i)
    for (const [vowel, tones] of Object.entries(toneMap)) {
        if (syllable.includes(vowel)) {
            const tone = tones[toneNumber - 1];
            syllable = syllable.replace(vowel, tone);
            break;
        }
    }

    return syllable;
}
