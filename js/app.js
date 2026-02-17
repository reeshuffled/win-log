// global state of the application, initialized from localStorage or set to default values if no stored data is found
const data = getStoredData() || {
    games: [],
    players: [],
    allowHistoricalEntries: true,
    showPlayDates: true,
    showGameDestructiveActions: true
};

/**
 * Initializes the UI by setting up event listeners for the "Add Game" and "Add Player" buttons, and then calls the render function to display the initial state of the application. This function is immediately invoked to set up the UI as soon as the script is loaded.
 */
(function initUI() {
    document.getElementById("addGame").onclick = addGame;
    document.getElementById("deleteGame").onclick = () => {
        const name = prompt("Enter the name of the game you want to delete:");
        if (name) {
            const gameIndex = data.games.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
            if (gameIndex !== -1) {
                if (confirm(`Are you sure you want to delete the game "${data.games[gameIndex].name}"? This action cannot be undone.`)) {
                    data.games.splice(gameIndex, 1);

                    saveData();
                    render();
                }
            }
            else {
                alert(`Game "${name}" not found.`);
            }
        }
    };

    document.getElementById("addPlayer").onclick = addPlayer;
    document.getElementById("deletePlayer").onclick = () => {
        const name = prompt("Enter the name of the player you want to delete:");
        if (name) {
            const playerIndex = data.players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
            if (playerIndex !== -1) {
                if (confirm(`Are you sure you want to delete the player "${data.players[playerIndex].name}"? This action cannot be undone.`)) {
                    data.players.splice(playerIndex, 1);

                    saveData();
                    render();
                }
            }
            else {
                alert(`Player "${name}" not found.`);
            }
        }
    };

    document.getElementById("showPlayDates").checked = data.showPlayDates;
    document.getElementById("showPlayDates").onchange = e => {
        data.showPlayDates = e.target.checked;

        saveData();

        render();
    };

    document.getElementById("allowHistoricalEntries").checked = data.allowHistoricalEntries;
    document.getElementById("allowHistoricalEntries").onchange = e => {
        data.allowHistoricalEntries = e.target.checked;

        saveData();

        render();
    };

    document.getElementById("showGameDestructiveActions").checked = data.showGameDestructiveActions;
    document.getElementById("showGameDestructiveActions").onchange = e => {
        data.showGameDestructiveActions = e.target.checked;

        saveData();

        render();
    };

    render();
})();

/**
 * Renders the list of games and players to the UI. This function is called whenever there is a change to the data (e.g., adding a game, toggling player active status, recording a play) to update the display.
 */
function render() {
    // Clear existing games
    document.getElementById("gameList").innerHTML = "";

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
};

/**
 * Prompts the user to enter a player name and adds the new player to the data. The function ensures that empty names are not allowed by looping until a valid name is entered or the user cancels the prompt. After adding the player, it saves the updated data to localStorage and re-renders the player list to reflect the change.
 */
function addPlayer() {
    // get player name from window and loop to not allow empty names
    let playerName;
    do {
        playerName = prompt("Enter player name:");
        if (playerName === null) {
            return; // User cancelled the prompt
        }
    } while (playerName.trim() === "");
    
    data.players.push({
        name: playerName,
        active: true
    });

    // Save the updated data to localStorage
    saveData();

    // Re-render the player list to include the new player
    render();
}

/**
 * Prompts the user to enter a game name and adds the new game to the data. The function ensures that empty names are not allowed by looping until a valid name is entered or the user cancels the prompt. After adding the game, it saves the updated data to localStorage and re-renders the game list to reflect the change.
 */
function addGame() {
    // get game name from window and loop to not allow empty names
    let gameName;
    do {
        gameName = prompt("Enter game name:");
        if (gameName === null) {
            return; // User cancelled the prompt
        }
    } while (gameName.trim() === "");
    
    data.games.push({
        name: gameName,
        plays: []
    });

    // Save the updated data to localStorage
    saveData();

    // Re-render the game list to include the new game
    render();
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