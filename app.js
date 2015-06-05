var express = require('express');
var app = express();
var path = require('path');
var publicDir = path.join(__dirname, './public');
var fs = require('fs');
var port = 1337;

app.use('/public', express.static('public'));

app.get('/api/templates', function (req, res) {
	fs.readFile("templates.txt", function (err, data) {
		if(err) throw err;
		res.send(data);
	});
});

app.get('/api/check', function (req, res) {
	res.send("check");
});

app.post('/api/upload', function (req, res) {
	var input = "";
	//handle authentication stuff

	req.on('data', function (data) {
		input += data;
	});
	req.on('end', function () {
		console.log(input + "\n");
	});
	//Merge Data With Salesforce

	res.send("Something Useful");
});

app.route('/*').get(function(req, res) {
    res.sendFile(publicDir + '/index.html');
  });

app.listen(port);