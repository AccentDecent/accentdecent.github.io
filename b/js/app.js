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
    const translatedLine = await translate(line, i);
    translatedLines.push(translatedLine);

    if(translatedLine.includes("Failed to translate")) {
      nlines[i - 1] = ">> ERROR >> " + line;
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
