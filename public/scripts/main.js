var main = angular.module("main", ["ngRoute"]);

main.config(['$routeProvider', '$locationProvider', 
	function($routeProvider, $locationProvider) {
	$routeProvider.
		when("/edit", {
			templateUrl: "/public/edit.html",
			controller: "editCtrl"
		}).
		when("/alt", {
			templateUrl: "/public/alt.html",
			controller: "altCtrl"
		}).
		when("/list", {
			templateUrl: "/public/list.html",
			controller: "listCtrl"
		}).
		when("/new", {
			templateUrl: "/public/new.html",
			controller: "newCtrl"
		}).
		otherwise({
			redirectTo: "/list"
		});
}]);

main.controller('altCtrl', function($scope) {
	$scope.message = 'This is the alternate page.';
});

main.controller("listCtrl", function($scope) {
	if(typeof Storage !== "undefined") {
		console.log("Came to list");
		if(localStorage.notesTaken) {
			$scope.notesTaken = JSON.parse(localStorage.notesTaken);
		} else {
			$scope.notesTaken = [];
		}
	}
});

main.controller('editCtrl', function($scope, $location) {
	var notesTaken = [];
	
	$scope.editedNote = {
		noteBody: undefined,
		opportunityID: undefined	
	};

	function pullUpNote() {
		var query = $location.search();
		var index = query.index;

		if(!index) {
			$location.path("#/list");
		} else {
			notesTaken = JSON.parse(localStorage.notesTaken);
			$scope.editedNote = notesTaken[index];
		}
	}

	function saveNote() {
		$scope.editedNote.dateModified = new Date();
		localStorage.notesTaken = JSON.stringify(notesTaken);
		$location.path("#/list");
	}

	$scope.saveNote = saveNote;

	pullUpNote();
});

main.controller('newCtrl', function($scope, $location) {
	$scope.choseTemplate = false;
	$scope.newNote = {
		noteBody: undefined,
		opportunityID: undefined,
		//dateModified: undefined
	};

	function zeroNewNote() {
		$scope.newNote.noteBody = undefined;
		$scope.newNote.opportunityID = undefined;
		//$scope.newNote.dateModified = undefined;
	}

	function saveNote() {
		var n, notesTaken;
		if(typeof Storage !== "undefined") {
			n = angular.copy($scope.newNote);
			n.dateModified = new Date();
			zeroNewNote();
			if(localStorage.notesTaken) {
				notesTaken = JSON.parse(localStorage.notesTaken);
			} else {
				notesTaken = [];
			}
			notesTaken.push(n);
			localStorage.notesTaken = JSON.stringify(notesTaken);
			$scope.$parent.notesToUpload = true;
		} else {

		}
		$location.path("#/list");
	}

	$scope.saveNote = saveNote;


	function pullTemplatesFromStorage() {
		if(typeof Storage !== "undefined") {
			if(localStorage.templates) {
				$scope.templates = JSON.parse(localStorage.templates);
			} else {
				$scope.templates = [];
			}
		}
	}

	function startNoteFromTemplate(template) {
		$scope.newNote.noteBody = template.templateBody;
		$scope.choseTemplate = true;
	}

	$scope.startNoteFromTemplate = startNoteFromTemplate;

	pullTemplatesFromStorage();
});

main.controller("mainCtrl", function ($scope, $http) {
		$scope.connected = false;
		$scope.message = "";
		$scope.hasMessage = false;
		$scope.templates = [];

		
		$scope.notesToUpload = (localStorage.notesTaken ? true : false);

		function uploadNotes () {
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

		$scope.uploadNotes = uploadNotes;
		
		function checkConnection () {
			$http.get("/public/check").
				success(function(data, status, headers, config) {
					$scope.connected = true;
				}).error(function(data, status, headers, config) {
					$scope.connected = false;
				});
		}

		function getTemplates() {
			$http.get("/api/templates").
				success(function(data, status, headers, config) {
					localStorage.templates = JSON.stringify(data);
					$scope.templates = data;
					$scope.hasMessage = true;
					$scope.message = "Got Templates";
				}).error(function() {
					$scope.hasMessage = true;
					$scope.message = "Failed To Obtain Templates";
				});
		}

		$scope.getTemplates = getTemplates;
		$scope.checkConnection = checkConnection;

		checkConnection();
	});