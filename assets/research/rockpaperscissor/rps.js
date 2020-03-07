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

    $(".selection div").on("click", function() {
        if (!_enabled) {
            console.log("SelectionBoxView: Ignoring click, as not enabled.");
            return;
        }

        var selectionString = $(this).prop("class");
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
    scoreModelObservable) {
    
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
        
        // TODO(mebjas): Stream selection to network
        var selfSelection = getSelfSelection();
        var userOutcome = getUserOutcome(userSelection.selection, selfSelection);
        _resultModel.onNewResult(userSelection.selection, selfSelection, userOutcome);
        _resultBoxModel.setEnabled(true);
        _scoreModel.onNewOutcome(userOutcome);
        _selectionBoxModel.setEnabled(true);
    });
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
    var agent = new Agent(selectionModel, selectionBoxModel, resultModel, resultBoxModel, scoreModel);
});
