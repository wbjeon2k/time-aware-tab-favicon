//https://stackoverflow.com/a/66503749
function setFavicon(color) {
    var red = '🟥';
    var orange = '🟧';
    var neutral = '⬜';
    const canvas = document.createElement('canvas');
    canvas.height = 64;
    canvas.width = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '64px serif';
    if (color === "red") {
        ctx.fillText(red, 0, 64);
    }
    else if (color === "orange") {
        ctx.fillText(orange, 0, 64);
    }
    else if (color === "neutral") {
        ctx.fillText(neutral, 0, 64);
    }

    const link = document.createElement('link');
    const oldLinks = document.querySelectorAll('link[rel="shortcut icon"]');
    oldLinks.forEach(e => e.parentNode.removeChild(e));
    link.id = 'dynamic-favicon';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
}

const setFaviconURL = link => {
    let $favicon = document.querySelector('link[rel="icon"]')
    // If a <link rel="icon"> element already exists,
    // change its href to the given link.
    if ($favicon !== null) {
        $favicon.href = link
        // Otherwise, create a new element and append it to <head>.
    } else {
        $favicon = document.createElement("link")
        $favicon.rel = "icon"
        $favicon.href = link
        document.head.appendChild($favicon)
    }
}

//send request to background.js
//to change favicon or not
//if response.change === "change"
//check color and return change_chk, color
//https://stackoverflow.com/questions/17573993/cant-access-the-response-variable-from-chrome-runtime-sendmessage-closure
function check_change_favicon(callback) {
    var change_chk, change_color;
    chrome.runtime.sendMessage({ request: "color" }, (response) => {
        console.log(response);
        //sendMessage is asynchronous : use callback.
        callback(response);
    });
}

function change_callback(response) {
    if (response.change === "true") {
        setFavicon(response.color);
    }
    else {
        // set favicon as blank
        setFavicon("neutral");
        // tries to update favicon with url.
        // if fails, use the blank favicon.
        setFaviconURL(favicon_url);
    }
}

// get initial favicon url
// set global variable favicon_url
function check_initial_favicon(callback) {
    var favicon_url;
    chrome.runtime.sendMessage({ request: "favicon" }, (response) => {
        console.log(response);
        //sendMessage is asynchronous : use callback.
        callback(response);
    });
    return favicon_url;
}

function favicon_callback(response) {
    favicon_url = response.favicon;
}

const favicon_url = undefined;
check_initial_favicon(favicon_callback);

//check favicon change every 1 second
setInterval(() => {
    check_change_favicon(change_callback);
}, 1000);

