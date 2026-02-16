const data = getStoredData() || {
    games: [],
    players: []
};

(function initUI() {
    bindClickListeners();

    render();
})();

function bindClickListeners() {
    document.getElementById("addGame").onclick = addGame;
    document.getElementById("addPlayer").onclick = addPlayer;
}

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

function render() {
    // Clear existing games
    document.getElementById("gameList").innerHTML = "";

    renderPlayers();

    if (data.games.length === 0) {
        createElement(document.getElementById("gameList"), "p", {
            innerText: "No games added yet. Click 'Add Game' to get started!"
        });
    }
    else {
        createElement(document.getElementById("gameList"), "p", {
            innerText: "Click a player to log a win for that player. Only active players will be included in the current record shown next to each player's name."
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
                innerText: "Who Won?"
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
                    innerText: "No plays yet."
                });
            }
            else {
                const olElement = createElement(gameElement, "ol", {
                    class: "mb-0"
                });

                game.plays
                    .filter(play => areArraysEqual(play.players.sort(), currentPlayers.map(p => p.name).sort()))
                    .forEach(play => {
                        createElement(olElement, "li", {
                            innerText: `${play.winner} won on ${new Date(play.timestamp).toLocaleString()}`
                        });
                    });
            }
        });
}

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

// from gemini/google search
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