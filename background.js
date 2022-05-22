// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const ALARM_INTERVAL = 2 * 1000; // Threshold for update groups (milliseconds)
let THRESHOLD = [1, 2]; // Threshold for first and second stage (minute)
const SKIP_THRESHOLD = 2000; // Threshold for removing current visiting tab from target (milliseconds)

// Constants
const TIMEOUT = 100;
const MIN_TO_MS = (20 * 1000);

let currentActiveTabId = undefined;
//key : tab_id, value : TabInfo object
let tabInfoList = new Map();


function update_callback(tab) {
    console.log("update_callback called");
    currentActiveTabId = tab.id;
}

async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

/// Class for storing information of tabs.
// It maintains time information and window information
// You can get the tab by using chrome.tabs.get(tabInfo.getTabId());
class TabInfo {
    constructor(tab_id, window_id) {
        this.tab_id = tab_id;
        this.window_id = window_id;
        this.lastDeactivatedTime = getUnixTime();
        this.lastActivatedTime = getUnixTime();
    }

    // Getters
    getTabId() {
        return this.tab_id;
    }

    getWindowId() {
        return this.window_id;
    }

    getIdleTime() {
        return getUnixTime() - this.lastDeactivatedTime;
    }

    getActiveTime() {
        return getUnixTime() - this.lastActivatedTime;
    }

    // Setters
    setLastDeactivatedTime() {
        this.lastDeactivatedTime = getUnixTime();
    }

    setLastActivatedTime() {
        this.lastActivatedTime = getUnixTime();
    }
}


/// Utils

function getUnixTime() {
    return Math.floor(new Date().getTime());
}

function removeTabFromList(tab_id, windowid) {
    let chk = false;
    if (tabInfoList.has(tab_id)) {
        tabInfoList.delete(tab_id);
        chk = true;
    }
    return chk;
}

function getTabFromList(tab_id, window_id) {
    return tabInfoList.get(tab_id);
}

/// Listeners 

chrome.runtime.onStartup.addListener(
    async () => {
        console.log("Extension Started");
    }
);


//add tab into 
chrome.tabs.onCreated.addListener(
    (tab) => {
        //var current_date = new Date();
        var tabInfo = new TabInfo(tab.id, tab.windowId);
        tabInfoList.set(tab.id, tabInfo);
        console.log("Tab created: " + tab.id);
        if (currentActiveTabId === undefined) {
            currentActiveTabId = tab.id;
        }
    }
);

//delete tab from list
chrome.tabs.onRemoved.addListener(
    (tab_id, info) => {
        //var current_date = new Date();
        let removed = removeTabFromList(tab_id, info.windowId);
        console.log("Tab removed: " + tab_id + "removeTabFromList" + removed);
    }
);


/// Main Logic
var favicon_red_path = 'icons/favicon_red.png'
var favicon_orange_path = 'icons/favicon_orange.png'
//https://stackoverflow.com/questions/6964144/dynamically-generated-favicon
//https://stackoverflow.com/questions/260857/changing-website-favicon-dynamically
//https://github.com/sylouuu/chrome-tab-modifier/blob/master/src/js/content.js
//https://stackoverflow.com/questions/2870240/remove-favicon-using-javascript-in-google-chrome

function check_color(tab_id) {
    let tab_to_find = tabInfoList.get(tab_id);
    if (firstStage.includes(tab_to_find)) {
        return "orange";
    }
    if (secondStage.includes(tab_to_find)) {
        return "red";
    }
    return "none";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("msg received: " + message);
    console.log("sender : " + sender.tab.id);
    //check favicon change
    if (message.request === "color") {
        const color_to_change = check_color(sender.tab.id);
        if (color_to_change === "none") {
            sendResponse({
                test: "RECEIVE TEST: NOT IN LIST",
                change: "false",
                color: "none"
            });
        }
        else {
            sendResponse({
                test: "RECEIVE TEST: IN LIST",
                change: "true",
                color: color_to_change
            });
        }
    }
    if (message.request === "favicon") {
        console.log("favicon url: " + sender.tab.favIconUrl)
        const favicon_url = sender.tab.favIconUrl;
        sendResponse({
            favicon: favicon_url
        })
    }
    return true;
});

function updateCurrentTab(current_tab) {
    if (current_tab.id === undefined) {
        //do nothing
    }
    else if (currentActiveTabId !== current_tab.id) {
        console.log("currentActiveTabId " + currentActiveTabId + "!== current_tab.id" + current_tab.id);
        let prev_current_tab = tabInfoList.get(currentActiveTabId);
        if (prev_current_tab === undefined) {
            //when prev_current_tab is already deleted
            //skip last activated time update
        }
        else {
            prev_current_tab.setLastDeactivatedTime();
        }
        currentActiveTabId = current_tab.id;
        let new_current_tab = tabInfoList.get(current_tab.id);
        if (new_current_tab !== undefined) {
            new_current_tab.setLastActivatedTime();
        }
    }
    currentActiveTabId = current_tab.id;
}

// Return two tab lists satisfying thresholds
function getTabListsByTime() {
    let firstStage = [];
    let secondStage = [];

    // Compare tab's idle time and threshold
    for (let tab of tabInfoList.values()) {
        if (tab.getTabId() === currentActiveTabId)
            continue;
        else {
            let time = tab.getIdleTime();
            if (time < THRESHOLD[0] * MIN_TO_MS)
                continue;
            else if (time < THRESHOLD[1] * MIN_TO_MS)
                firstStage.push(tab);
            else
                secondStage.push(tab);
        }
    }

    return [firstStage, secondStage];
}

let firstStage = [];
let secondStage = [];

// Check the tabs periodically
// just update tab lists
// change at content script
setInterval(() => {
    //acquire current tab
    //console.log("setInterval called");
    getCurrentTab().then( tab => updateCurrentTab(tab));
    //iterate through all tabs
    let tablists = getTabListsByTime();
    firstStage = tablists[0];
    secondStage = tablists[1];
    console.log("total tabs: " + tabInfoList.size + " firstStage size: " + firstStage.length + " secondStage size: " + secondStage.length);
    //console.log(firstStage);
    //console.log(secondStage);
    //update idle time
}, ALARM_INTERVAL);

