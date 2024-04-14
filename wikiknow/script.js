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
    const headers = new Headers();
    headers.append("Wiki-Header", "random");

    let response = await fetch(`https://latincheats.stormcph-dk.workers.dev/`, {
        method: "GET",
        headers: headers
    });

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

    const headers = new Headers();

    const json = JSON.stringify(
        {
            "answer": answer,
            "id": linkID
        }
    );

    headers.append("Wiki-Header", json);

    let response = await fetch(`https://latincheats.stormcph-dk.workers.dev/`, {
        method: "GET",
        headers: headers
    });

    let text = await response.text();

    let responseJson = JSON.parse(text);

    console.log(responseJson);

    const score = responseJson.score;
    const percentage = responseJson.percentage;

    infoText.innerText = `Score: ${score} (${percentage}%)`;

    return true;
}

function byId(id) {
    return document.getElementById(id);
}