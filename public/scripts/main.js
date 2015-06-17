var main = angular.module("main", ["ngRoute", "ngSanitize", "ui.select"]);

main.filter('propsFilter', function() {
  return function(items, props) {
    var out = [];

    if (angular.isArray(items)) {
      items.forEach(function(item) {
        var itemMatches = false;

        var keys = Object.keys(props);
        for (var i = 0; i < keys.length; i++) {
          var prop = keys[i];
          var text = props[prop].toLowerCase();
          if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
            itemMatches = true;
            break;
          }
        }

        if (itemMatches) {
          out.push(item);
        }
      });
    } else {
      // Let the output be the input untouched
      out = items;
    }

    return out;
  }
});

main.config(['$routeProvider', '$locationProvider', 
	function($routeProvider, uiSelectConfig, $locationProvider) {
	$routeProvider.
		when("/edit", {
			templateUrl: "/public/edit.html",
			controller: "editCtrl"
		}).
		when("/list", {
			templateUrl: "/public/list.html",
			controller: "listCtrl"
		}).
		otherwise({
			redirectTo: "/list"
		});

		uiSelectConfig.theme = 'bootstrap';
		//uiSelectConfig.resetSearchInput = true;
		//uiSelectConfig.appendToBody = true;
}]);

main.controller("listCtrl", function($scope) {
	$scope.notesTaken = [];
	$scope.setNotesToUpload(false);

	if(typeof Storage !== "undefined") {
		if(localStorage.notesTaken) {
			$scope.notesTaken = JSON.parse(localStorage.notesTaken);
			$scope.setNotesToUpload(true);
		}
	}

});

main.controller('editCtrl', function ($scope, $location, $http) {
	var notesTaken = [];
	$scope.readyForEditing = false;
	$scope.choosingTemplate = false;
	$scope.templates = [];
	$scope.oppChosen = null;
	$scope.gettingTemplates = false;
	$scope.opp = {
		selected: null
	}

	$scope.editedNote = {
		noteBody: undefined,
		opportunityID: undefined,
		opportunityName: undefined
	};

	function getTemplatesFromStorage() {
		$scope.gettingTemplates = true;
		if(typeof Storage !== "undefined") {
			if(localStorage.templates) {
				$scope.templates = JSON.parse(localStorage.templates);
			} else {
				$scope.templates = [];
			}
		}
		$scope.gettingTemplates = false;
	}

	$scope.getTemplatesFromSalesforce = function() {
		$scope.gettingTemplates = true;
		$http.get("/api/templates").
			success(function(data, status, headers, config) {
				localStorage.templates = JSON.stringify(data);
				$scope.templates = data;
				$scope.gettingTemplates = false;
			}).error(function() {
				$scope.gettingTemplates = false;
			});
	}

	$scope.startNoteFromTemplate = function(template) {
		$scope.editedNote.noteBody = template.templateBody;
		$scope.choosingTemplate = false;
		$scope.readyForEditing = true;
	}

	function setUpNote() {
		var query = $location.search();
		var id = query.id;
		var opps;

		if(!id) {
			$location.path("#/list");

		} else if(id === "new") {

			if(localStorage.notesTaken) {
				notesTaken = JSON.parse(localStorage.notesTaken);
			} else {
				notesTaken = [];
			}
			
			notesTaken.push($scope.editedNote);
			$scope.editedNote = notesTaken[notesTaken.length - 1];

			getTemplatesFromStorage();
			$scope.choosingTemplate = true;

		} else {
			notesTaken = JSON.parse(localStorage.notesTaken);
			$scope.editedNote = notesTaken[id];
			opps = $scope.getOpps();
			for(var i = 0; i < opps.length; i++) {
				if(opps[i].Id === $scope.editedNote.opportunityID) {
					$scope.opp.selected = opps[i];
					break;
				}
			}

			$scope.readyForEditing = true;
		}
	}

	$scope.saveNote = function() {
		$scope.editedNote.dateModified = moment().format('MMMM Do YYYY, h:mm:ss a');
		localStorage.notesTaken = JSON.stringify(notesTaken);
		$location.path("#/list");
	}

	function pullOppsFromStorage() {
		if(typeof Storage !== "undefined" && localStorage.opps) {
			$scope.setOpps(JSON.parse(localStorage.opps));
		}
		else {
			$scope.setOpps([]);
		}
		$scope.setGettingOpps(false);
	}

	$scope.getOppsFromSalesforce = function () {
		$scope.setGettingOpps("Fetching Opportunities");
		$http.get("/api/salesforce/opportunity").
			success(function(data, status, headers, config) {
				$scope.setOpps(data);
				localStorage.opps = JSON.stringify(data);
				$scope.setGettingOpps(false);
			}).error(function() {
				//$scope.setGettingOpps("Fetch Failed");
			});
	}

	$scope.selectOpp = function (item, model) {
		$scope.editedNote.opportunityID = item.Id;
		$scope.editedNote.opportunityName = item.Name;
	}
	

	if($scope.getGettingOpps()) {
		pullOppsFromStorage();
	}
	setUpNote();

});


main.controller("mainCtrl", function ($scope, $http) {
	$scope.notesToUpload = false;

	$scope.gettingOpps = "Fetching Opportunities";
	$scope.opps = [];

	$scope.newNote = {
		noteBody: undefined,
		opportunityID: undefined,
			//dateModified: undefined
		};

		$scope.connected = false;
		$scope.message = "";
		$scope.hasMessage = false;

		$scope.getConnected = function () {
			return $scope.connected;
		}

		$scope.setNotesToUpload = function(tf) {
			$scope.notesToUpload = tf;
		}

		$scope.setGettingOpps = function (go) {
			$scope.gettingOpps = go;
		}

		$scope.getGettingOpps = function () {
			return $scope.gettingOpps;
		}

		$scope.setOpps = function (o) {
			$scope.opps = o;
		}

		$scope.getOpps = function () {
			return $scope.opps;
		}

		$scope.uploadNotes = function () {
			$http.post("/api/upload", localStorage.notesTaken).
			success(function(data, status, headers, config) {
					$scope.message = "Data Sent";
					$scope.hasMessage = true;
					localStorage.removeItem("notesTaken");
					$scope.notesToUpload = false;
				}).error(function(data, status, headers, config) {
					$scope.message = "Send Failed";
					$scope.hasMessage = true;
					$scope.notesToUpload = true;
				});
		}
		
		function checkConnection () {
			$http.get("/api/check").
			success(function(data, status, headers, config) {
					$scope.connected = true;
				}).error(function(data, status, headers, config) {
					$scope.connected = false;
				});
		}

		checkConnection(); //because setInterval waits 10 secs to get started
		var checkIntervalId = window.setInterval(checkConnection, 10000);
	});