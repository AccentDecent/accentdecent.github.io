document.getElementById('generateButton').addEventListener('click', async function() {
  const inputTextElement = document.getElementById('inputText');
  const outText = document.getElementById('outputText');
  outText.innerText = "Generating...";

  const inputText = inputTextElement.value;

  const lines = inputText.split("\n");
  const nlines = inputText.split("\n");
  let translatedLines = [];
  let i = 1;
  for (const line of lines) {

    if(line.startsWith("#")) {
      translatedLines.push(line.replaceAll("#", "").replaceAll("# ", ""));
      i++;
      continue;
    }

    const translatedLine = await translate(line, i);
    translatedLines.push(translatedLine);

    if(translatedLine.includes("Failed to translate")) {
      nlines[i - 1] = "# ERR " + line + " " + await getPinyin(line);
    }

    i++;
  }

  outText.innerText = translatedLines.join("\n");
  inputTextElement.value = nlines.join("\n");
});

document.getElementById('copyButton').addEventListener('click', function() {
  const outputText = document.getElementById('outputText').innerText;
  navigator.clipboard.writeText(outputText)
    .then(() => {
      alert('Text copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });
});

async function translate(chinese, index) {
  const link = `https://en.pons.com/translate?q=${chinese}&in=&l=dezh&lf=zh&rt=de&qnac=`;
  const subtitleResponse = await fetch(link);
  const subtitleBody = await subtitleResponse.text();

  if (subtitleResponse.status === 200) {
    const lines = subtitleBody.split("\n");

    let found = false, found2 = false;
    var pinyin = "";
    for (const line of lines) {
      if (found) {
        if (line.includes("<dd class=\"dd-inner\">") && !found2) {
          found2 = true;
        } else if (found2) {
          if (line.includes("<a href=")) {
            var translation = line.substring(line.indexOf(">") + 1, line.lastIndexOf("<")).replace("</a>", "");
            return pinyin + " " + chinese + "\t" + translation;
          }
        }
      } else {
        if (line.includes("1.")) {
          found = true;
        }
      }

      if(line.includes("headword pinyin")) {
        pinyin = line
          .substring(
            line.indexOf("headword pinyin") + 15 + 2, line.lastIndexOf("<"))
          .replaceAll("</span>", "").replace(" ", "");
      }
    }
  }
  return index + ". Failed to translate: " + chinese;
}

async function getPinyin(chineseChar) {
  /*const link = `https://www.purpleculture.net/dictionary-details/?word=${chineseChar}`;
  const subtitleResponse = await fetch(link);
  const subtitleBody = await subtitleResponse.text();

  if (subtitleResponse.status === 200) {
    const lines = subtitleBody.split("\n");

    let found = false, found2 = false;
    var pinyin = "";
    for (const line of lines) {
      if (found) {
        if (line.includes("<dd class=\"dd-inner\">") && !found2) {
          found2 = true;
        } else if (found2) {
          if (line.includes("<a href=")) {
            var translation = line.substring(line.indexOf(">") + 1, line.lastIndexOf("<")).replace("</a>", "");
            return pinyin + " " + chineseChar + "\t" + translation;
          }
        }
      } else {
        if (line.includes("1.")) {
          found = true;
        }
      }

      if(line.includes("headword pinyin")) {
        pinyin = line
          .substring(
            line.indexOf("headword pinyin") + 15 + 2, line.lastIndexOf("<"))
          .replaceAll("</span>", "").replace(" ", "");
      }
    }
  }
  return "Failed to translate: " + chineseChar; */

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlData, "text/xml");

  const items = xmlDoc.getElementsByTagName('item');
  const pinyinMap = new Map();

  for (const item of items) {
    const unicode = item.getAttribute('unicode');
    const hanyu = item.getAttribute('hanyu');
    pinyinMap.set(unicode, hanyu);
  }
  let result = "";
  const characters = chineseChar.trim();
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

  return pinyin;
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
