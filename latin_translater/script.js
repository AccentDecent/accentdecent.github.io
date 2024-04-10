document.getElementById("test").addEventListener("click", async function() {
    console.log("now pinging...");
   await ping("nuntiatur");
});


async function ping(word) {
    const link = "https://www.frag-caesar.de/lateinwoerterbuch/nuntiatur-uebersetzung.html";

    const headers = new Headers();
    headers.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
    headers.append('Accept-Encoding', 'gzip, deflate, br');
    headers.append('Accept-Language', 'en-GB,en;q=0.5');
    headers.append('Connection', 'keep-alive');
    headers.append('Host', 'www.frag-caesar.de');
    headers.append('Sec-Fetch-Dest', 'document');

    const subtitleResponse = await fetch(link, {
        method: 'GET',
        headers: Object.fromEntries(headers)
    }).catch(reason => {
        return "Some error occurred: " + reason;
    });

    if (subtitleResponse.status === 200) {
        const subtitleBody = await subtitleResponse.text();
    }
}