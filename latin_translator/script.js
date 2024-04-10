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

    document.getElementById("displayBox").innerHTML = text;
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
        if (allElements[i].title.includes("im Lateinwörterbuch")) {
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