const Selections = {
    ROCK: 0,
    PAPER: 1,
    SCISSOR: 2
};

const ReverseSelections = [ Selections.ROCK, Selections.PAPER, Selections.SCISSOR ];
const SelectionNames = [ "ROCK", "PAPER", "SCISSOR" ];

const SelectionMapping = {
    "rock": Selections.ROCK,
    "paper": Selections.PAPER,
    "scissor": Selections.SCISSOR
};

const Outcomes = {
    WIN: "WIN",
    DRAW: "DRAW",
    LOSS: "LOSS"
};

var OutcomeColorMapping = {
    "WIN": "green",
    "DRAW": "gray",
    "LOSS": "red"
};

const SIO_SERVER = "https://rs1.minhazav.dev";

function generateUid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function createImage(src) {
    var img = new Image(80, 80);
    img.src = src;
    return img;
}

var ROCK_USER = createImage("/assets/research/rockpaperscissor/rock.png");
var PAPER_USER = createImage("/assets/research/rockpaperscissor/paper.png");
var SCISSOR_USER = createImage("/assets/research/rockpaperscissor/scissors.png");
var ROCK_AGENT = createImage("/assets/research/rockpaperscissor/rock.png");
var PAPER_AGENT = createImage("/assets/research/rockpaperscissor/paper.png");
var SCISSOR_AGENT = createImage("/assets/research/rockpaperscissor/scissors.png");

// User model observable.
function UserModelObservable() {
    var _observers = [];
    var _name = "Fanny";

    Object.defineProperties(this, {
        "Name": {
            get: function() {
                return _name;
            }
        }
    });

    this.setName = function(name) {
        if (name != undefined && name.trim() != "") {
            _name = name;
        }

        _observers.forEach(function(observerCallback) {
            observerCallback(_name);
        });
    };

    this.addObserver = function(observerCallback) {
        _observers.push(observerCallback);
    };
}

// User name View
function UserNameView(userModelObservable) {
    userModelObservable.addObserver(function(name) {
        $(".label_player_name").html(name);
    });
}

// InitialName controller
function InitialNameController(
    userModelObservable,
    initalNameModelObservable,
    dataGateway) {
    this.setName = function(name) {
        userModelObservable.setName(name);
        initalNameModelObservable.setEnabled(false);
        dataGateway.startConnection();
    }
}

// InitialName View
function InitialNameView(initalNameModelObservable, initialNameController) {

    initalNameModelObservable.addObserver(function(isEnabled) {
        if (!isEnabled) {
            $(".placeholder").hide();
            $("#initial_banner").hide();
            $(".game").show();
        }
    });

    $("#input_skip").on('click', function() {
        initialNameController.setName(undefined);
    });

    $("#input_start").on('click', function() {
        var possibleVal = $("#input_name").val();
        initialNameController.setName(possibleVal);
    });
}

// Hint message model observable.
function HintModelObservable() {
    var _defaultMessage = "The shortcut 'R', 'P' and 'S' works";
    var _lastMessage = _defaultMessage;
    var _timeout;
    var _observers = [];

    function updateObservers(message) {
        _observers.forEach(function(observerCallback) {
            observerCallback(message);
        });
    }

    this.setMessage = function(message, timeout) {
        if (timeout == undefined) {
            _lastMessage = message;
        }
        clearTimeout(_timeout);
        updateObservers(message);

        // reset timeout
        _timeout = setTimeout(function() {
            updateObservers(_lastMessage);
        }, timeout);
    };

    this.addObserver = function(observerCallback) {
        _observers.push(observerCallback);
    };
}

// Selection Model Observable
function SelectionModelObservable() {
    var _data = {
        count: 0,
        selection: undefined
    };
    var _observers = [];

    // Updates on each call.
    this.setSelection = function(selection) {
        if (!(selection in ReverseSelections)) {
            throw "undefined selection";
        }
    
        _data.count++;
        _data.selection = selection;
        _observers.forEach(function (observerCallback) {
            observerCallback(_data);
        });
    };

    this.addObserver = function(observerCallback) {
        _observers.push(observerCallback);
    };
}

// An observable item to enable / disable an entity
function EnabledObservable(defaultValue) {
    var _isEnabled = defaultValue;
    var _observers = [];

    Object.defineProperties(this, {
        "isEnabled": {
            get: function() {
                return _isEnabled;
            }
        }
    });

    // Updates on change only.
    this.setEnabled = function(isEnabled) {
        if (isEnabled != _isEnabled) {
            _isEnabled = isEnabled;
            _observers.forEach(function (observerCallback) {
                observerCallback(_isEnabled);
            });
        }
    };

    this.addObserver = function(observerCallback) {
        _observers.push(observerCallback);
    };
}

// Controller for selections
function SelectionBoxController(
    selectionModelObservable,
    selectionBoxModelObservable) {
    var _selectionModel = selectionModelObservable;
    var _selectionBoxModel = selectionBoxModelObservable;

    this.onSelection = function(selection) {
        if (!(selection in ReverseSelections)) {
            throw "undefined selection";
        }

        _selectionBoxModel.setEnabled(false);
        _selectionModel.setSelection(selection);
    };
}

// Controller for selection
function SelectionBoxView(selectionBoxModelObservable, selectionBoxController) {
    var _selectionBoxModel = selectionBoxModelObservable;
    var _selectionBoxController = selectionBoxController;
    var _enabled = _selectionBoxModel.isEnabled;
    var _timeout;

    function clearActiveItem() {
        $(".selection .active").removeClass("active");
    }

    $(".selection div").on("click", function() {
        if (_timeout) {
            clearTimeout(_timeout);
            _timeout = undefined;
        }
        clearActiveItem();
        if (!_enabled) {
            console.log("SelectionBoxView: Ignoring click, as not enabled.");
            return;
        }

        var selectionString = $(this).prop("class");
        _selectionBoxController.onSelection(SelectionMapping[selectionString]);
    });

    $(document).keypress(event => {        
        var selectionString = "";
        if (event.which == 114) selectionString = "rock";
        else if (event.which == 112) selectionString = "paper";
        else if (event.which == 115) selectionString = "scissor";
        else return;

        if (_timeout) {
            clearTimeout(_timeout);
            _timeout = undefined;
        }
        clearActiveItem();
        $(".selection ." +selectionString).addClass("active");
        _timeout = setTimeout(clearActiveItem, 2000);
        _selectionBoxController.onSelection(SelectionMapping[selectionString]);
    });

    _selectionBoxModel.addObserver(function (isEnabled) {
        _enabled = isEnabled;
        // TODO(mebjas): prevent clicking on view item when not enabled.
    });
}

// the Agent
function Agent(
    selectionModelObservable,
    selectionBoxModelObservable,
    resultModelObservable,
    resultBoxModelObservable,
    scoreModelObservable,
    dataGateway) {
    
    var _verbose = true;
    var _victoryBoard = [
        [Outcomes.DRAW, Outcomes.LOSS, Outcomes.WIN],
        [Outcomes.WIN, Outcomes.DRAW, Outcomes.LOSS],
        [Outcomes.LOSS, Outcomes.WIN, Outcomes.DRAW],
    ];
    var _selectionModel = selectionModelObservable;
    var _selectionBoxModel = selectionBoxModelObservable;
    var _resultModel = resultModelObservable;
    var _resultBoxModel = resultBoxModelObservable;
    var _scoreModel = scoreModelObservable;
    var _dataGateway = dataGateway;

    function getSelfSelection() {
        var randVal = Math.floor(Math.random() * 3);
        return randVal;
    }

    function getUserOutcome(userSelection, agentSelection) {
        var outcome =  _victoryBoard[userSelection][agentSelection];
        if (_verbose) {
            console.log(
                "[Agent#getUserOutcome] User: %s, Agent: %s, Outcome: %s",
                SelectionNames[userSelection],
                SelectionNames[agentSelection],
                outcome);
        }
        return outcome;
    }

    _selectionModel.addObserver(function(userSelection) {
        if (_verbose) {
            console.log(
                "[Agent] Selection: %s, Count: %d",
                SelectionNames[userSelection.selection],
                userSelection.count);
        }

        // Stream selection to network
        _dataGateway.onNewSelection(userSelection);
        
        var selfSelection = getSelfSelection();
        var userOutcome = getUserOutcome(userSelection.selection, selfSelection);
        _resultModel.onNewResult(userSelection.selection, selfSelection, userOutcome);
        _resultBoxModel.setEnabled(true);
        _scoreModel.onNewOutcome(userOutcome);
        _selectionBoxModel.setEnabled(true);
    });
}

// Gateway to transfer the user selection.
function DataGateway(hintModelObservable, userModelObservable) {
    var _hintModel = hintModelObservable;
    var _verbose = true;
    var _client = undefined;

    this.startConnection = function() {
        const connectionParam = {
            sessionId: generateUid(20),
            username: userModelObservable.Name
        };

        _client = io(SIO_SERVER, {
            query: connectionParam
        });
        
        _hintModel.setMessage("Connecting to server ...", 2000);
        _client.on('connect', function() {
            if (_verbose) {
                console.log("Connected to server");
            }
    
            console.log("sending to hint message");
            _hintModel.setMessage("Connected to server", 2000);
        });
    
        _client.on('disconnect', function() {
            if (_verbose) {
                console.log("Disconnected from server");
            }
    
            _hintModel.setMessage("Disconnected from server", 2000);
        });
    };

    this.onNewSelection = function(selection) {
        if (_client == undefined) {
            return;
        }
        _client.emit("rps_selection", {selection: selection});
    };
}

// Observable result model
function ResultModelObservable() {
    // Not maintaining any state
    var _observers = [];

    function getAgentOutcome(userOutcome) {
        if (userOutcome == Outcomes.DRAW) return Outcomes.DRAW;
        return userOutcome == Outcomes.WIN ? Outcomes.LOSS : Outcomes.WIN;
    }

    this.onNewResult = function(
        userSelection, agentSelection, userOutcome) {
        var result = {
            userSelection: userSelection,
            agentSelection: agentSelection,
            userOutcome: userOutcome,
            userOutcomeColor: OutcomeColorMapping[userOutcome],
            agentOutcomeColor: OutcomeColorMapping[getAgentOutcome(userOutcome)]
        };

        _observers.forEach(function(observerCallback) {
            observerCallback(result);
        });
    };

    this.addObserver = function(observerCallback) {
        _observers.push(observerCallback);
    };
}

// Observable model for score board.
function ScoreModelObservable() {
    var _observers = [];
    var _userScore = {
        WIN: 0,
        DRAW: 0,
        LOSS: 0
    };

    this.onNewOutcome = function(userOutcome) {
        if (!(userOutcome in _userScore)) {
            throw "Unsupported outcome";
        }

        _userScore[userOutcome]++;
        _observers.forEach(function(observerCallback) {
            observerCallback(_userScore);
        });
    };
    
    this.addObserver = function(observerCallback) {
        _observers.push(observerCallback);
    };
}

// Hint box view
function HintBoxView(hintBoxObservable) {
    hintBoxObservable.addObserver(function(hintMessage) {
        $(".hint").html(hintMessage);
    });
}

// View handler for result box.
function ResultBoxView(resultModelObservable, resultBoxModelObservable) {
    var _enabled = resultBoxModelObservable.isEnabled;

    function updateViewVisibility() {
        if (_enabled) {
            $(".last_result").removeClass("disabled");
        } else {
            $(".last_result").addClass("disabled");
        }
    }

    function getImageBasedOnSelection(selection, isUser) {
        switch (selection) {
            case Selections.ROCK:
                return isUser ? ROCK_USER : ROCK_AGENT;
            case Selections.PAPER:
                return isUser ? PAPER_USER : PAPER_AGENT;
            case Selections.SCISSOR:
                return isUser ? SCISSOR_USER : SCISSOR_AGENT;
        }
    }

    resultModelObservable.addObserver(function(result) {
        $(".section.selected.user").html(
            getImageBasedOnSelection(result.userSelection, /* isUser= */ true));
        $(".section.selected.agent").html(
            getImageBasedOnSelection(result.agentSelection, /* isUser= */ false));
        $(".arrow.user").css({"color": result.userOutcomeColor});
        $(".arrow.agent").css({"color": result.agentOutcomeColor});
    });

    resultBoxModelObservable.addObserver(function(isEnabled) {
        _enabled = isEnabled;
        updateViewVisibility();
    });

    updateViewVisibility();
}

function ScoreBoxView(scoreModelObservable, resultModelObservable) {
    scoreModelObservable.addObserver(function(userScore) {
        $(".scoreboard .win .score").html(userScore.WIN);
        $(".scoreboard .draw .score").html(userScore.DRAW);
        $(".scoreboard .loss .score").html(userScore.LOSS);
    });

    function clearPulse() {
        $(".pulse").removeClass("pulse");
    }

    var _timeout;
    resultModelObservable.addObserver(function(result) {
        // Clear former timeouts and remove the pulses.
        clearTimeout(_timeout);
        clearPulse();

        if (result.userOutcome == Outcomes.WIN) {
            $(".scoreboard .win").addClass("pulse");
        } else if (result.userOutcome == Outcomes.DRAW) {
            $(".scoreboard .draw").addClass("pulse");
        } else if (result.userOutcome == Outcomes.LOSS) {
            $(".scoreboard .loss").addClass("pulse");
        }

        _timeout = setTimeout(clearPulse, 500);
    });
}

$(document).ready(function() {
    // User model
    var userModel = new UserModelObservable();
    var userNameView = new UserNameView(userModel);

    // hint model & view
    var hintModel = new HintModelObservable();
    var hintBoxView = new HintBoxView(hintModel);

    // Data gateway
    var dataGateway = new DataGateway(hintModel, userModel);

    // InitialName model, view and controller.
    var initialNameModel = new EnabledObservable(/* defaultValue= */ true);
    var initalNameController = new InitialNameController(
        userModel, initialNameModel, dataGateway);
    var initialNameView = new InitialNameView(initialNameModel, initalNameController);

    // Selection model, view & controller.
    var selectionModel = new SelectionModelObservable();
    var selectionBoxModel = new EnabledObservable(/* defaultValue= */ true);
    var selectionBoxController = new SelectionBoxController(
        selectionModel, selectionBoxModel);
    var selectionBoxView = new SelectionBoxView(selectionBoxModel, selectionBoxController);

    // result model & view.
    var resultBoxModel = new EnabledObservable(/* defaultValue= */ false);
    var resultModel = new ResultModelObservable();
    var resultBoxView = new ResultBoxView(resultModel, resultBoxModel);

    // Score model & view.
    var scoreModel = new ScoreModelObservable();
    var scoreBoxView = new ScoreBoxView(scoreModel, resultModel);

    // The glorified agent.
    var agent = new Agent(
        selectionModel,
        selectionBoxModel,
        resultModel,
        resultBoxModel,
        scoreModel,
        dataGateway);
});