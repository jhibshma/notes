var express = require('express');
var app = express();
var https = require('https');
var request = require('request');
var bodyParser = require('body-parser');
var path = require('path');
var jsforce = require('jsforce');
var publicDir = path.join(__dirname, './public');
var fs = require('fs');
var passport = require('passport');
var ForceDotComStrategy = require('passport-forcedotcom').Strategy;
var session = require('express-session');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var MongoStore = require('connect-mongo')(session);
var port = 1337;

app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true,
  cookie: {domain: "candoris.com"},
  store: new MongoStore({url: 'mongodb://localhost/notes-app'})
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({
    extended: false
  }));
app.use(bodyParser.json());

app.use('/public', express.static('public'));

//################# AUTHENTICATION ####################

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new ForceDotComStrategy({
    clientID: '3MVG98RqVesxRgQ6ctdKk0gU9JzBD5BNJoC6DBFicWgAPG6NpKvySqcGzAtwUg9d78e0rxGpdWwMfInn.05tu',
    clientSecret: '3622045312764702971',
    scope: ['full', 'refresh_token'],
    skipPhoto: true,
    callbackURL: 'https://dev.notes.candoris.com:1337/token',
    authorizationURL: "https://test.salesforce.com/services/oauth2/authorize",
    tokenURL: "https://test.salesforce.com/services/oauth2/token"
  },
  function(token, tokenSecret, profile, done) {
    //console.log(profile);
    return done(null, {accessToken: token.params.access_token, profile: profile});   
  }
));

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) {
    //console.log("We\'re authenticated.");
    return next();
  }
  console.log("Not authenticated.");
  if(req.originalUrl === "/api/check"){
    console.log("check");
    res.send("login");
    return;
  }
  res.redirect('/login');
}

app.all('/api/*', ensureAuth);

app.get('/logout', function (req, res) {
  var url = 'https://test.salesforce.com/services/oauth2/revoke?token=' + req.session.passport.user.accessToken;
  //url = 'https://login.salesforce.com/services/oauth2/revoke';
  request(url, function (err, response, body) {
    //debugger
    if(err) {
      res.sendStatus(500);
      return;
    }
    req.session.destroy();
    res.redirect('/login');
  });
});

app.get('/login', passport.authenticate('forcedotcom'));
app.get('/token', passport.authenticate('forcedotcom'),
  function (req, res) {
    //console.log(req.session.passport.user.accessToken);
    console.log("The token page was visited.");
    res.redirect('/');
});

//################# EVERYTHING ELSE ###################

// A simple test of redirect. Works nicely.
// app.get('/google', function (req, res) {
//   res.redirect('http://www.google.com/')
// });

app.get('/api/templates', function (req, res) {
	fs.readFile("templates.txt", function (err, data) {
		if(err) throw err;
		res.send(data);
	});
});

app.get('/api/check', function (req, res) {
	res.send("check");
});

app.get('/api/salesforce/opportunity', function (req, res) {
  // debugger;
  console.log(req.session.passport.user.accessToken);

  var server = 
    req.session.passport.user.profile._raw.urls.enterprise.substring(8, 12);
	var conn = new jsforce.Connection({
		instanceUrl: "https://" + server + ".salesforce.com",
    accessToken: req.session.passport.user.accessToken
	});
  //console.log(conn);

  conn.sobject('Opportunity')
  .select('Id, Name, AccountId')
  .where({
    'Opportunity_Type__c': {
      $in: [
      'Desktop/Notebook/Tablet',
      'Solutions Sale',
      'Support Renewal',
      'WSCA Reseller'
      ]
    }
  })
  .execute(function(err, records) {
    if (err) {
      console.error('Error retrieving opportunities from Salesforce', err);
      res.sendStatus(500);
      return;
    }

    if(records && records.length) {
      records.forEach(function (record) {
        delete record.attributes;
      });
    }
    res.send(records);        
  });
});

app.post('/api/salesforce/uploadNote', function (req, res) {
  // debugger;
  var note = req.body;
  if(!note) {
    res.status(400).send("Gimme a note.");
    return;
  }

  var server = 
    req.session.passport.user.profile._raw.urls.enterprise.substring(8, 12);
  var conn = new jsforce.Connection({
    instanceUrl: "https://" + server + ".salesforce.com",
    accessToken: req.session.passport.user.accessToken
  });

  conn.query("SELECT Id, Name FROM Opportunity", function(err, result) {
    if (err) {
      res.sendStatus(500);
      return;
    }
    res.send(result.records);
  });
    
});

app.post('/api/upload', function (req, res) {
	var input = "";
	//handle authentication stuff
  
  console.log(req.body);

	//Merge Data With Salesforce
	res.send("Something Useful");
});

app.route('/*').get([ensureAuth, function(req, res) {
  //console.log("got one o these");
	res.sendFile(publicDir + '/index.html');
}]);

var server = https.createServer({
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt')
}, app);


server.listen(port);
