const infoText = document.getElementById("info_text");
const displayBox = document.getElementById("displayBox");

document.getElementById("test").addEventListener("click", async function() {
    console.log("now pinging...");
   await sendRequest(document.getElementById("linkInput").value);
});

async function sendRequest(info) {
    // send get request to server

    const headers = new Headers();
    headers.append("Custom-Header", info);

    let response = await fetch(`https://latincheats.stormcph-dk.workers.dev/`, {
        method: "GET",
        headers: headers
    });

    let text = await response.text();

    text = removeUseless(text);

    console.log(text);

    displayBox.innerHTML = "";

    if(contains(text, "Kurzübersicht")) {
        infoText.innerText = "Richtige saite";

        const table = findTable(text);

        if(table) {
            for (let i = 2; i < table.rows.length; i++) {
                const row = table.rows[i];

                const lines = row.textContent.split("\n");

                for (let j = 1; j < lines.length; j++) {
                    const line = lines[j];

                    if(line.includes(info)) {
                        continue;
                    }

                    displayBox.innerText += line + "\n";
                }

                console.log(row);
            }
        }
    }
    else {
        infoText.innerText = "mehreree möglichkweiten";
        displayBox.innerHTML = text;
    }


}

function contains(html, search) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');

    let allElements = doc.body.getElementsByTagName('*');
    for (let i = allElements.length - 1; i >= 0; i--) {

        const title = allElements[i].title;

        if (title !== undefined && allElements[i].innerText.includes(search)) {
            return true;
        }
    }

    return false;
}

function findTable(html) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');

    let table = doc.querySelector('.table-responsive table');

    return table;
}

function removeUseless(html) {
    // Parse the HTML string into a Document object
    let parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');

    // Remove the head element
    doc.head.remove();

    let scripts = doc.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        scripts[i].parentNode.removeChild(scripts[i]);
    }

    // Remove any tags that contain the string "im Lateinwörterbuch"
    let allElements = doc.body.getElementsByTagName('*');
    for (let i = allElements.length - 1; i >= 0; i--) {

        const title = allElements[i].title;

        if (title !== undefined && title.includes("im Lateinwörterbuch")) {
            allElements[i].parentNode.removeChild(allElements[i]);
        }
    }

    // Remove all comment nodes
    let childNodes = doc.body.childNodes;
    for (let i = childNodes.length - 1; i >= 0; i--) {
        if (childNodes[i].nodeType === Node.COMMENT_NODE) {
            childNodes[i].parentNode.removeChild(childNodes[i]);
        }
    }

    // Remove all media elements
    const mediaElements = ['img', 'audio', 'video', 'source', 'track'];
    mediaElements.forEach(tag => {
        let elements = doc.getElementsByTagName(tag);
        for (let i = elements.length - 1; i >= 0; i--) {
            elements[i].parentNode.removeChild(elements[i]);
        }
    });

    // Serialize the Document object back into an HTML string
    let serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
}