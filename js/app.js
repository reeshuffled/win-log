// global state of the application, initialized from localStorage or set to default values if no stored data is found
const data = getStoredData() || {
    games: [],
    players: [],
    allowHistoricalEntries: true,
    showPlayDates: true,
    showGameDestructiveActions: true,
    showItemEditButtons: true
};

/**
 * Initializes the UI by setting up event listeners for the "Add Game" and "Add Player" buttons, and then calls the render function to display the initial state of the application. This function is immediately invoked to set up the UI as soon as the script is loaded.
 */
(function initUI() {
    document.getElementById("addGame").onclick = () => addItem("game");
    document.getElementById("deleteGame").onclick = () => deleteItem("game");

    document.getElementById("addPlayer").onclick = () => addItem("player");
    document.getElementById("deletePlayer").onclick = () => deleteItem("player");

    // set up checkboxes for settings
    ["showPlayDates", "allowHistoricalEntries", "showGameDestructiveActions", "showItemEditButtons"].forEach(setupCheckbox);

    render();
})();

/**
 * Renders the list of games and players to the UI. This function is called whenever there is a change to the data (e.g., adding a game, toggling player active status, recording a play) to update the display.
 */
function render() {
    // Clear existing games
    document.getElementById("gameList").innerHTML = "";

    if (data.showItemEditButtons) {
        document.getElementById("itemEdit").style.display = "block";
    }
    else {
        document.getElementById("itemEdit").style.display = "none";
    }

    renderPlayers();

    if (data.games.length === 0) {
        createElement(document.getElementById("gameList"), "p", {
            innerText: "No games added yet. Click 'Add Game' to get started!"
        });
    }

    const currentPlayers = data.players
        .filter(player => player.active)
        .sort((a, b) => a.name.localeCompare(b.name));

    // Render games
    data.games
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(game => {
            const gameElement = createElement(document.getElementById("gameList"), "div", {
                class: "game"
            });

            createElement(gameElement, "h3", {
                innerText: game.name
            });

            createElement(gameElement, "p", {
                innerText: "👑 Who Won?",
                style: "margin-bottom: 0.5rem;"
            });

            // Sort players alphabetically and create a button for each player
            currentPlayers
                .forEach(player => {
                    createElement(gameElement, "button", {
                        class: "player",
                        innerText: `${player.name} (Current Record: ${calculateCurrentRecord(player.name, currentPlayers, game)})`,
                        onclick: () => {
                            if (!game.hasOwnProperty("plays")) {
                                game.plays = [];
                            }

                            game.plays.push({
                                players: data.players.filter(p => p.active).map(p => p.name),
                                winner: player.name,
                                timestamp: new Date().toISOString()
                            });

                            saveData();
                            render();
                        }
                    });
                });

            if (!game.hasOwnProperty("plays") || game.plays.length === 0) {
                createElement(gameElement, "p", {
                    class: "mb-0",
                    innerText: "No plays yet."
                });
            }
            else {
                // Only consider plays with the same players as the current active players
                const plays = game.plays
                    .filter(play => areArraysEqual(play.players.sort(), currentPlayers.map(p => p.name).sort()))
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const playLog = createElement(gameElement, "div", {
                    style: `${document.getElementById("showPlayDates").checked ? "" : "display: none;"}`
                });

                createElement(playLog, "p", {
                    class: "mb-0",
                    innerText: "Play History:"
                });

                const olElement = createElement(playLog, "ol", {
                    class: "mb-0",
                    style: "margin-top: 0.5rem;"
                });

                plays.forEach(play => {
                    createElement(olElement, "li", {
                        innerText: `${play.winner} won on ${new Date(play.timestamp).toLocaleString()}`
                    });
                });

                // get win streak
                let streak = 1;
                for (let i = plays.length - 1; i > 0; i--) {
                    if (plays[i].winner === plays[i - 1].winner) {
                        streak++;
                    }
                    else {
                        break;
                    }
                }

                createElement(gameElement, "p", {
                    class: 'mt-1 mb-0',
                    innerText: `🔥 Current win streak: ${plays[plays.length - 1].winner} (${streak} wins in a row)`,
                    style: "margin-bottom: 0.5rem;"
                });
            }

            if (data.allowHistoricalEntries) {
                createElement(gameElement, "input", {
                    id: "playDate",
                    type: "datetime-local"
                });

                const select = createElement(gameElement, "select", {
                    id: "winnerSelect",
                    style: "margin-left: 5px;"
                });

                currentPlayers.forEach(player => {
                    createElement(select, "option", {
                        value: player.name,
                        innerText: player.name
                    });
                });

                createElement(gameElement, "button", {
                    innerText: "Add Historical Entry",
                    style: "margin-left: 5px;",
                    onclick: () => {
                        const playDateInput = gameElement.querySelector("#playDate");
                        const playDate = playDateInput.value;

                        if (!playDate) {
                            alert("Please select a date and time for the play.");
                            return;
                        }

                        if (!game.hasOwnProperty("plays")) {
                            game.plays = [];
                        }

                        game.plays.push({
                            players: data.players.filter(p => p.active).map(p => p.name),
                            winner: gameElement.querySelector("#winnerSelect").value,
                            timestamp: new Date(playDate).toISOString()
                        });

                        saveData();
                        render();
                    }
                });
            }

            if (data.showGameDestructiveActions) {
                const destructiveActions = createElement(gameElement, "p", {
                    class: "mb-0"
                });

                // add clear history button
                createElement(destructiveActions, "button", {
                    innerText: "♻️ Clear Play History",
                    onclick: () => {
                        if (confirm("Are you sure you want to clear the play history for this game? This action cannot be undone.")) {
                            delete game.plays;

                            saveData();
                            render();
                        }
                    }
                });

                // add delete game button
                createElement(destructiveActions, "button", {
                    innerText: "🗑️ Delete Game",
                    style: "margin-left: 5px;",
                    onclick: () => {
                        if (confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
                            data.games = data.games.filter(g => g !== game);

                            saveData();
                            render();
                        }
                    }
                });
            }
        });
}

/**
 * Renders the list of players to the UI. This function is called whenever there is a change to the player data (e.g., adding a player, toggling active status) to update the display.
 */
function renderPlayers() {
    document.getElementById("playerList").innerHTML = "";

    if (data.players.length === 0) {
        createElement(document.getElementById("playerList"), "p", {
            innerText: "No players added yet. Click 'Add Player' to get started!"
        });
    }
    else {
        createElement(document.getElementById("playerList"), "p", {
            innerText: "Click a player to toggle whether they are active or not. Only active players will be included in game plays."
        });
    }

     // Render players
    data.players
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(player => {
            createElement(document.getElementById("playerList"), "button", {
                class: `player${player.active ? " active" : ""}`,
                innerText: player.name,
                onclick: () => {
                    // Toggle the active status of the player and save the updated data
                    player.active = !player.active;

                    saveData();
                    render();
                }
            });
        });
}

/**
 * Calculates the current win-loss record for a given player based on the play history of a game, considering only the plays that involved the same set of active players as the current game state. The record is returned as a string in the format "wins-losses".
 * @param {string} playerName 
 * @param {string[]} currentPlayers 
 * @param {Object} game 
 * @returns 
 */
function calculateCurrentRecord(playerName, currentPlayers, game) {
    if (!game.hasOwnProperty("plays")) {
        return 0;
    }

    // Only consider plays with the same players as the current active players
    const applicablePlays = game.plays.filter(play => areArraysEqual(play.players, currentPlayers.map(p => p.name)));

    // Count wins and losses for the given player
    const wins = applicablePlays.filter(play => play.winner === playerName).length;
    const losses = applicablePlays.filter(play => play.winner !== playerName).length;

    return `${wins}-${losses}`;
}

/**
 * Adds a player or game to the data based on the specified type.
 * Prompts the user to enter the name of the item, validates that it's not empty, and adds it to the data.
 * @param {string} type - Either "player" or "game"
 */
function addItem(type) {
    const isGame = type === "game";
    const collection = isGame ? data.games : data.players;
    const itemType = isGame ? "game" : "player";
    const promptMessage = `Enter ${itemType} name:`;
    const newItemTemplate = isGame ? { name: "", plays: [] } : { name: "", active: true };

    let itemName;
    do {
        itemName = prompt(promptMessage);
        if (itemName === null) {
            return; // User cancelled the prompt
        }
    } while (itemName.trim() === "");

    const newItem = { ...newItemTemplate, name: itemName };
    collection.push(newItem);

    // Save the updated data to localStorage
    saveData();

    // Re-render to include the new item
    render();
}

/**
 * Deletes a player or game from the data based on the specified type.
 * Prompts the user to enter the name of the item to delete, confirms the deletion, and updates the data accordingly.
 * @param {string} type - Either "player" or "game"
 */
function deleteItem(type) {
    const isGame = type === "game";
    const collection = isGame ? data.games : data.players;
    const itemType = isGame ? "game" : "player";
    const promptMessage = `Enter the name of the ${itemType} you want to delete:`;

    const name = prompt(promptMessage);
    if (name) {
        const index = collection.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
        if (index !== -1) {
            const itemName = collection[index].name;
            const confirmMessage = `Are you sure you want to delete the ${itemType} "${itemName}"? This action cannot be undone.`;
            if (confirm(confirmMessage)) {
                collection.splice(index, 1);

                saveData();
                render();
            }
        }
        else {
            alert(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${name}" not found.`);
        }
    }
}

/**
 * Sets up a checkbox element by initializing its checked state from data and attaching an onchange handler
 * that updates the data property, saves it, and re-renders the UI.
 * @param {string} settingName - The name of the setting (matches both the element ID and data property)
 */
function setupCheckbox(settingName) {
    const element = document.getElementById(settingName);
    element.checked = data[settingName];
    element.onchange = e => {
        data[settingName] = e.target.checked;

        saveData();
        render();
    };
}

/**
 * Gets stored data from localStorage and returns it as an object.
 * If no data is found or if there is an error parsing the data, it returns false.
 * @returns {Object | false} data 
 */
function getStoredData() {
    // return valid JSON data or false if no data is found
    try {
        const storedData = localStorage.getItem("win-log-data");

        return storedData ? JSON.parse(storedData) : false;
    }
    // return false if there is an error parsing the data (e.g., corrupted data)
    catch (e) {
        console.error("Error parsing stored data:", e);

        return false;
    }
}

/**
 * Saves the current global state object to localStorage.
 */
function saveData() {
    localStorage.setItem("win-log-data", JSON.stringify(data));
}

/**
 * From https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
 * @param {Array} arrA      
 * @param {Array} arrB 
 * @returns {boolean}
 */
function areArraysEqual(arrA, arrB) {
  // Check if the arrays are the same length
  if (arrA.length !== arrB.length) {
    return false;
  }

  // Check if all items exist and are in the same order
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i] !== arrB[i]) {
      return false; // Return false immediately if a mismatch is found
    }
  }

  return true; // If the loop finishes, the arrays are equal
}

/**
 * Create an HTML element and add it to the DOM tree.
 * @param {HTMLElement} parent 
 * @param {String} tag 
 * @param {Object} attributes 
 */
function createElement(parent, tag, attributes={}) {
    // create the element to whatever tag was given
    const el = document.createElement(tag);
    
    // go through all the attributes in the object that was given
    Object.entries(attributes)
        .forEach(([attr, value]) => {
            // handle the various special cases that will cause the Element to be malformed
            if (attr == "innerText") 
            {
                el.innerText = value;
            }
            else if (attr == "innerHTML") 
            {
                el.innerHTML = value;
            }
            else if (attr == "textContent") 
            {
                el.textContent = value;
            }
            else if (attr == "onclick")
            {
                el.onclick = value;
            }
            else if (attr == "onkeydown")
            {
                el.onkeydown = value;
            }
            else
            {
                el.setAttribute(attr, value);
            }
        });
    
    // add the newly created element to its parent
    parent.appendChild(el);

    // return the element in case this element is a parent for later element creation
    return el;
}