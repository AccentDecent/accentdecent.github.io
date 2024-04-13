/*
https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0

https://en.wikipedia.org/?curid=

title
\n
curid
 */

let link = "href";

document.getElementById("play_button").addEventListener("click", async function() {
   console.log("Getting random article...");

    await getRandomArticle();
});

document.getElementById("link").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent default behavior of link
    window.open(link, "_blank"); // Open link in a new tab
});

async function getRandomArticle() {
    const headers = new Headers();
    headers.append("Wiki-Header", "random");

    let response = await fetch(`https://latincheats.stormcph-dk.workers.dev/`, {
        method: "GET",
        headers: headers
    });

    let text = await response.text();

    link = "https://en.wikipedia.org/?curid=" + text.split("\n")[1]

    byId("word").innerText = text.split("\n")[0];
    byId("link").innerText = link;
}

function byId(id) {
    return document.getElementById(id);
}