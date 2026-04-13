/*
https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0

https://en.wikipedia.org/?curid=

title
\n
curid
 */

let link = "href";
let linkID = "1";

const word = byId("word");
const linkText = byId("link");
const input = byId("definition_input");
const playButton = byId("play_button");
const infoText = byId("info_text");

let playing = false;

input.disabled = true;
input.value = "";

linkText.innerText = "";
infoText.innerText = "";

document.addEventListener('DOMContentLoaded', () => {
    const serverApiKey = getCookie('serverApiKey');
    if(serverApiKey) {
        document.getElementById('serverApiKeyInput').value = serverApiKey;
    }
});

document.getElementById('saveServerApiKeyButton').addEventListener('click', () => {
    const serverApiKey = document.getElementById('serverApiKeyInput').value;
    if (serverApiKey) {
        document.cookie = `serverApiKey=${serverApiKey}; path=/; max-age=31536000`; // Save for 1 year
        alert('Server API key saved successfully!');
    } else {
        alert('Please enter a valid Server API key.');
    }
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

playButton.addEventListener("click", async function() {
    await play();
});

document.getElementById("link").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent default behavior of link
    window.open(link, "_blank"); // Open link in a new tab
});

async function play() {
    if(!playing) {
        console.log("Getting random article...");

        infoText.innerText = "Getting article...";
        await getRandomArticle();
        infoText.innerText = "";

        input.disabled = false;
        input.value = "";
        playButton.innerText = "Submit";
        playing = true;
    }
    else {
        console.log("Checking answer...");
        infoText.innerText = "Checking answer...";

        const success = await checkAnswer(input.value);

        if(success) {
            playing = false;
            playButton.innerText = "Play Again";
            input.disabled = true;
        }
    }
}

async function getRandomArticle(){
    const serverApiKey = getCookie('serverApiKey');
    if (!serverApiKey) {
        alert('Please enter and save your Server API key first.');
        return;
    }

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${serverApiKey}`);

    let response = await fetch(`https://accentdecent-utils.corruptionhades.workers.dev/wiki?query=random`, {
        method: "GET",
        headers: headers
    });

    if (!response.ok) {
        infoText.innerText = "Error: " + response.status;
        return;
    }

    let text = await response.text();

    const title = text.split("\n")[0].replace(/\(.*?\)/g, '');
    const id = text.split("\n")[1];

    linkID = id;

    link = "https://en.wikipedia.org/?curid=" + id;
  //  link = `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&pageids=${text.split("\n")[1]}`;

    word.innerText = title;
    linkText.innerText = link;
}

async function checkAnswer(answer) {

    if(answer === "") {
        infoText.innerText = "Please enter an answer";
        return false;
    }

    const serverApiKey = getCookie('serverApiKey');
    if (!serverApiKey) {
        alert('Please enter and save your Server API key first.');
        return false;
    }

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${serverApiKey}`);

    const queryJson = JSON.stringify({
        "answer": answer,
        "id": parseInt(linkID)
    });

    let response = await fetch(`https://accentdecent-utils.corruptionhades.workers.dev/wiki?query=${encodeURIComponent(queryJson)}`, {
        method: "GET",
        headers: headers
    });

    if (!response.ok) {
        infoText.innerText = "Error: " + response.status;
        return false;
    }

    let responseText = await response.text();
    let responseJson = JSON.parse(responseText);

    console.log(responseJson);

    const score = responseJson.score;
    const percentage = responseJson.percentage;

    infoText.innerText = `Score: ${score} (${percentage}%)`;

    return true;
}

function byId(id) {
    return document.getElementById(id);
}