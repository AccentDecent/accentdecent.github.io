const slider = document.getElementById("mySlider");
const output = document.getElementById("sliderValue");
const overrideGen = document.getElementById("override");
const overrideGenID = document.getElementById("overrideId");
const onlyPinyin = document.getElementById("onlyPinyin");

window.onload = function() {
  overrideGenID.hidden = !overrideGen.checked;
}

output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
  output.innerHTML = this.value;
};

overrideGen.addEventListener("change", async function() {
  overrideGenID.hidden = !overrideGen.checked;
});

document.getElementById('generateButton').addEventListener('click', async function() {
  const inputTextElement = document.getElementById('inputText');
  const outText = document.getElementById('outputText');
  const info = document.getElementById('info');

  const inputText = inputTextElement.value;

  const lines = inputText.split("\n");
  const nlines = inputText.split("\n");
  let translatedLines = [];
  let i = 1;

  info.innerText = "Generating...";

  for (const line of lines) {
    console.log("Next!")
    if(line.startsWith("#")) {
      translatedLines.push(line.replaceAll("# ", "").replaceAll("#", ""));
    }
    else {


      if(onlyPinyin.checked) {

        let pinyin = "";

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if(char !== " ") {
            pinyin += await getPinyin(char) + " ";

          }
        }

        translatedLines.push(pinyin);
      }
      else if(overrideGen.checked) {

        const id = overrideGenID.value;

        const splitted = line.split(id);
        const chinese = splitted[0];
        const translation = splitted[1];

        const pinyin = await getPinyin(chinese);

        translatedLines.push(pinyin + " " + chinese + id + translation);

        console.log("Chinese: " + chinese + " Translation: " + translation + " Id: " + id);
      }
      else {
        const translatedLine = await translate(line, i);
        translatedLines.push(translatedLine);

        if(translatedLine.includes("Failed to translate")) {
          nlines[i - 1] = "# ERR " + await getPinyin(line) + " " + line + ",";
        }
      }
    }

    outText.innerText = translatedLines.join("\n");
    inputTextElement.value = nlines.join("\n");

    i++;

    console.log("Waiting...")
    // timeout for slight delay
    await new Promise(r => setTimeout(r, parseInt(slider.value)));
  }

  console.log("Done!");

  outText.innerText = translatedLines.join("\n");
  inputTextElement.value = nlines.join("\n");
  info.innerText = "Done!"
});

document.getElementById('testButton').addEventListener('click', function() {
  test("爱");
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
  const link = `https://en.pons.com/translate?q=${chinese}&l=dezh&lf=zh&rt=de`;

  const headers = new Headers();
  headers.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
  headers.append('Accept-Encoding', 'gzip, deflate, br');
  headers.append('Accept-Language', 'en-GB,en;q=0.5');

  const subtitleResponse = await fetch(link, {
    method: 'GET',
    headers: Object.fromEntries(headers)
  }).catch(reason => {
    return "Some error occurred: " + reason;
  });

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
            return pinyin + " " + chinese + "," + translation;
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

async function test(chinese) {
  const link = `https://www.purpleculture.net/dictionary-details/?word=${chinese}`;
  const subtitleResponse = await fetch(link);
  const subtitleBody = await subtitleResponse.text();

  if (subtitleResponse.status === 200) {
    console.log(subtitleBody);
  }
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
    let hanyu = pinyinMap.get(unicode);

    console.log("Unidcode: " + unicode + " Hanyu: " + hanyu);

    if (hanyu) {

      if(hanyu.includes(",")) {
        hanyu = hanyu.split(",")[0];
      }

      const toneNumber = getToneNumber(hanyu);
      const syllableWithoutTone = hanyu.substring(0, hanyu.length - 1);
      var to = applyTone(syllableWithoutTone, toneNumber);
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
