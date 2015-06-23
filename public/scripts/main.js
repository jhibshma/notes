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
		when("/list", {
			templateUrl: "/public/list.html",
			controller: "listCtrl"
		}).
		when("/edit", {
			templateUrl: "/public/edit.html",
			controller: "editCtrl"
		}).
		otherwise({
			redirectTo: "/list"
		});

		uiSelectConfig.theme = 'bootstrap';
		//uiSelectConfig.resetSearchInput = true;
		//uiSelectConfig.appendToBody = true;
}]);

main.controller("editCtrl", function ($scope, $location, generateHtml) {
	$scope.note = {};
	var index;

	function leavePage() {
		$location.url("/list");
	}

	function getFromStorageArray(arr, index) {
		var array;
		if(typeof Storage !== "undefined") {
			if(localStorage[arr]) {
				array = JSON.parse(localStorage[arr]);
				if(index > -1 && index < array.length) {
					return array[index];
				}
			}
		}
		return null;
	}

	function prepareNote() {
		var query = $location.search();
		var mode = query.mode;
		var template, note;

		if(!mode) {
			leavePage();
			return;
		} else if(mode === "new") {
			template = query.template;
			if(!template || parseInt(template) === NaN) {
				leavePage();
				return;
			}
			//changing template's 'type' here:
			template = getFromStorageArray("templates", parseInt(template));
			if(!template) {
				leavePage();
				return;
			}
			index = -1;
			$scope.note = template;

		} else if(mode === "edit") {
			note = query.note;
			console.log(note);
			if(!note || parseInt(note) === NaN) {
				leavePage();
				return;
			}
			//changing template's 'type' here:
			index = parseInt(note);
			note = getFromStorageArray("notes", parseInt(note));
			if(!note) {
				leavePage();
				return;
			}
			$scope.note = note;
		}
	}

	$scope.saveNote = function() {
		var notes = [];
		if(typeof Storage === "undefined") {
			leavePage();
			return;
		}
		if(localStorage.notes) {
			notes = JSON.parse(localStorage.notes);
		}
		$scope.note.dateModified = moment().format('MMMM Do YYYY, h:mm:ss a');
		if(index === -1) {
			notes.push($scope.note);
		} else {
			notes[index] = $scope.note;
		}
		localStorage.notes = JSON.stringify(notes);
		leavePage();
	}

	$scope.cancelNote = function () {
		leavePage();
	}

	prepareNote();

	$scope.readyForHtml = true;
}).
directive("theHtmlForm", function (generateHtml, $compile) {
	
	function link(scope, element, attrs) {

    scope.$watch(scope.readyForHtml, function(value) {
      element.html($compile(generateHtml(scope.note, "note"))(scope));

    });
  }

  return {
    link: link
  };
	
	
}).factory("generateHtml", function () {

  function getCssClass(type) {
    if(type === "number") {
      return "form-control numberInput";
    } else if(type === "text") {
      return "form-control textInput";
    } else if(type === "textarea") { //textarea vs. textArea
      return "form-control textareaInput";
    } else if(type === "checkbox") {
      return "checkbox checkboxInput";
    } else if(type === "radio") {
      return "radio radioInput";
    } else if(type === "selectionlist") {
      return "form-control selectionlistInput";
    } else if(type === "none") {
      return "noInput";
    }
    return null;
  }

  //formAddress is the scope address which the generated
  //html should access the form at
  return function (form, formAddress) {
  	//console.log(form);
  	//console.log(formAddress);
    var html = "";
    var q;
    var cssClass;
    var tag, qPath;

    html += "<p class=\"title\">" + form.title + "</p>\n";

    for(var i = 0; i < form.sections.length; i++) {
      html += "<p class=\"sectionTitle\">" + form.sections[i].title + "</p>\n";
      for(var j = 0; j < form.sections[i].questions.length; j++) {
        q = form.sections[i].questions[j];

        if(q.type === "none") {
          html += "<p class=\"" + getCssClass(q.type) + "\">" + 
            q.question + "</p>\n";

        } else if(q.type === "checkbox") {
          cssClass = getCssClass(q.type);
          qPath = formAddress + ".sections[" + i + "].questions[" + j + "]";

          html += "<div class=\"" + cssClass + "\" ";
          html += "ng-repeat=\"q in " + qPath + ".question ";
          html += "track by $index\" >\n";
          html += "  <label><input type=\"checkbox\" ";
          html += "ng-model=\"" + qPath + ".answer[$index]\" ";
          html += "name=\"" +i+j+ "\">";
          html += "{{q}}</label>\n";
          html += "</div>\n";

        } else if(q.type === "radio") {
          cssClass = getCssClass(q.type);
          qPath = formAddress + ".sections[" + i + "].questions[" + j + "]";

          html += "<div class=\"" + cssClass + "\" ";
          html += "ng-repeat=\"q in " + qPath + ".question\">\n";
          html += "  <label><input type=\"radio\" ";
          html += "name=\"" +i+j+ "\" ";
          html += "ng-model=\"" + qPath + ".answer\" ";
          html += "value=\"{{q}}\">{{q}}</label>\n";
          html += "</div>\n";


        } else if(q.type === "selectionlist") {
          cssClass = getCssClass(q.type);
          qPath = formAddress + ".sections[" + i + "].questions[" + j + "]";
          html += "<div class=\"form-group\">\n";
          html += "  <label for=\"" +i+j+ "\"></label>\n";
          html += "  <select class=\"" + cssClass + "id=\"" +i+j+ "\" ";
          html += "ng-model=\"" + qPath + ".answer\" >\n";
          html += "    <option ng-repeat=\"q in " + qPath + ".question\">";
          html += "{{q}}</option>\n";
          html += "  </select>\n";
          html += "</div>\n";

        } else {
          cssClass = getCssClass(q.type);
          qPath = formAddress + ".sections[" + i + "].questions[" + j + "]";
          tag = (q.type === "textarea" ? "textarea" : "input");

          html += "<form>\n";
          html += "  <div class=\"form-group\">\n";
          html += "    <label for=\"" + q.question + "\">" + q.question + 
            "</label>\n";
          html += "    <" + tag + " type=\"" + q.type + "\" class=\"" + 
            cssClass + "\" ng-model=\"" + qPath + ".answer\" id=\"" 
            + q.question + "\"></" + tag + ">\n";
          html += "  </div>\n";
          html += "</form>\n";
        }
      }
    }

    //console.log(html);
    return html;
  }
});

main.controller("listCtrl", function ($scope, $http, $location) {
	
	$scope.template = {
		selected: undefined
	};
	$scope.chosenTemplate = false;
	var id;
	$scope.templates = [];
	$scope.notes = [];
	$scope.setNotesToUpload(false);
	$scope.gettingTemplates = false;

	if(typeof Storage !== "undefined") {
		if(localStorage.notes) {
			$scope.notes = JSON.parse(localStorage.notes);
			$scope.setNotesToUpload(true);
		}
	}

	$scope.getTemplatesFromStorage = function() {
		$scope.chosenTemplate = false;
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
		$scope.chosenTemplate = false;
		$scope.gettingTemplates = true;
		$scope.template.selected = undefined;
		$http.get("/api/templates").
			success(function(data, status, headers, config) {
				localStorage.templates = JSON.stringify(data);
				$scope.templates = data;
				$scope.gettingTemplates = false;
			}).error(function() {
				$scope.gettingTemplates = false;
			});
	}

	$scope.selectTemplate = function (item, model) {
		for(var i = 0; i < $scope.templates.length; i++)
		{
			if($scope.templates[i].title === item.title)
			{
				$scope.chosenTemplate = true;
				id = i;
				return;
			}
		}
	}

	$scope.startNote = function () {
		$location.url("/edit?mode=new&template=" + id);
	}

});


main.controller("mainCtrl", function ($scope, $http, $location) {

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
		$http.post("/api/upload", localStorage.notes).
		success(function(data, status, headers, config) {
				$scope.message = "Data Sent";
				$scope.hasMessage = true;
				localStorage.removeItem("notes");
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
				$scope.connected = data === "check";
				if(data === "login") {
					window.location.assign("https://dev.notes.candoris.com:1337/login");
				}
				//console.log(data);
			}).error(function(data, status, headers, config) {
				$scope.connected = false;
			});
	}

	checkConnection(); //because setInterval waits 10 secs to get started
	var checkIntervalId = window.setInterval(checkConnection, 10000);
});