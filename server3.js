var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var passport	= require('passport');
var config      = require('./config'); // get db config file
var User        = require('./app/models/user'); // get the mongoose model
var Watch       = require('./app/models/watching'); // get the mongoose model
var WatchList   = require('./app/models/watchList'); // get the mongoose model
var port        = process.env.PORT || 9111;
var jwt         = require('jwt-simple');
var path        = require('path');
var webtorrent  = require('webtorrent');
var jwts    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var xtorrents = require('eztv.ag');
var forEachAsync = require('forEachAsync').forEachAsync;
var jsonfile = require('jsonfile');
var eztv = require('eztvapi')();
var request = require("request");
var jsonfile = require('jsonfile');
var file = './tmp/data.json';
var schedule = require('node-schedule');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var Transcoder = require('stream-transcoder');
var omdb = require('omdb');
var re = /(?:\.([^.]+))?$/;

app.set('superSecret', config.secret); // secret variable
// get our request parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
 
// log to console
app.use(morgan('dev'));
 
// Use the passport package in our application
app.use(passport.initialize());
 
// connect to database
mongoose.connect(config.database);
 
// pass passport for configuration
require('./passport')(passport);

// bundle our routes
var apiRoutes = express.Router();

/*var j = schedule.scheduleJob('0 * /8 * * *', function(){
  console.log('Today is recognized by Rebecca Black!');
	var stream = eztv.createShowsStream();
	var shows = [];
	stream.on('data', function (show) {
		var showx = [];
		showx.push(show);
		forEachAsync(showx,function(next,element,index,array){
			eztv.getShow(element.imdb_id, function (err, showz) {
			if (err) { console.log(err); }
			else{ 
				var showes = {};
				showes.id = showz._id;
				showes.title = showz.title;
				showes.year = showz.year;
				showes.synopsis = showz.synopsis;
				if(showz.images.poster){
					showes.medium_cover_image=showz.images.poster;
				}
				if(showz.images.fanart){
					showes.large_cover_image=showz.images.fanart;
				}
				showes.runtime=showz.runtime;
				showes.episodes=showz.episodes;
				showes.num_seasons = showz.num_seasons;
				showes.type = "show";
				showes.genres = showz.genres;
				showes.status = showz.status;
				shows.push(showes); 
				console.log(showes);
			}
			});
		});
	  
	});
	stream.on('end', function () {
		jsonfile.writeFile(file, shows, function (err) {
			console.error(err);
		})
		console.log("finished");
	});
});*/

function prettyBytes(num) {
  var exponent, unit, neg = num < 0, units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  if (neg) num = -num
  if (num < 1) return (neg ? '-' : '') + num + ' B'
  exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
  num = Number((num / Math.pow(1000, exponent)).toFixed(2))
  unit = units[exponent]
  return (neg ? '-' : '') + num + ' ' + unit
}

function getShows(){
  console.log('Today is recognized by Rebecca Black!');
	var stream = eztv.createShowsStream();
	var shows = [];
	stream.on('data', function (show) {
		var showx = [];
		showx.push(show);
		forEachAsync(showx,function(next,element,index,array){
			eztv.getShow(element.imdb_id, function (err, showz) {
			if (err) { console.log(err); }
			else{ 
				var showes = {};
				showes.id = showz._id;
				showes.title = showz.title;
				showes.year = showz.year;
				showes.synopsis = showz.synopsis;
				if(showz.images != undefined){
					showes.medium_cover_image=showz.images.poster;
				}
				if(showz.images != undefined){
					showes.large_cover_image=showz.images.fanart;
				}
				showes.runtime=showz.runtime;
				showes.episodes=showz.episodes;
				showes.num_seasons = showz.num_seasons;
				shows.push(showes); 
				console.log(showes);
			}
			});
		});
	  
	});
	stream.on('end', function () {
		jsonfile.writeFile(file, shows, function (err) {
			console.error(err);
		})
	});
}

var peers = [];

function getLargestFile(torrent) {
    var file;
    for(i = 0; i < torrent.files.length; i++) {
        if (!file || file.length < torrent.files[i].length) {
            file = torrent.files[i];
        }
    }
    return file;
}

var client = new webtorrent();

var torrents=[];

function setClientAmount(torrent) {
	torrents.push({[torrent]:0});
	console.log(torrents);
}

function updateClientAmount(torrent) {
	torrents[0][torrent]=torrents[0][torrent]+1;
	console.log(torrents);
};

function removeClientAmount(torrent) {
	torrents[0][torrent]=torrents[0][torrent]-1;
	console.log(torrents);
}

var buildMagnetURI = function(infoHash) {
    return 'magnet:?xt=urn:btih:' + infoHash + '&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969';
};

function list(){
	var list = [];
	for (var i = 1; i <= 63; i++) {
		list.push(i);
	}
	return list;
}

function addPeers(){
	
}


// Allow Cross-Origin requests
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.static(path.join(__dirname, 'app')));

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname+'/web.html'));
});

apiRoutes.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwts.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;    
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });
    
  }
});

io.on('connection', function(socket){
	console.log('a user connected');
	
	socket.on('peer-connected', function(data){
		console.log('new peer connected');
		peers.push(data.id);
		socket.emit('all-peers', {connected : peers});
		for(var i=0;i<peers.length;i++){
			console.log(peers[i]);
		}
	});
	socket.on('peer-closed', function(data){
		console.log(data.id+' closed connection');
		var index = peers.indexOf(data.id);
		peers.splice(index,1);
		for(var i=0;i<peers.length;i++){
			console.log(peers[i]);
		}
	});
	
	// listen for myList socket calls
	socket.on('myList', function(item){
		console.log('setting watchList');
		var newItem = new WatchList({
		  user_id: item.user_id,
		  movie_id: item.movie_id
		});
		// save the user
		newItem.save(function(err) {
		  if (err) {
			socket.emit('myListStatus',{success: false, msg: 'Item already exist'});
		  }
		  socket.emit('myListStatus',{success: true, msg: 'Successful added new item.'});
		});
	});



	// listen for signup socket calls
	socket.on('signup', function(data){
	  if (!data.username || !data.password) {
		socket.emit('signupStatus', {success: false, msg: 'Please Enter a valid username and password.'});
	  } else {
		var newUser = new User({
		  name: data.username,
		  password: data.password
		});
		// save the user
		newUser.save(function(err) {
		  if (err) {
			socket.emit('signupStatus', {success: false, msg: 'Username already exists.'});
		  }
		  socket.emit('signupStatus', {success: true, msg: 'Successful created new user.'});
		});
	  }
	});
	socket.on('getUser', function(data){
		console.log('geting user '+data.username);
	User.findOne({
		name: data.username
	  }, function(err, user) {
		if (err) throw err;
	 
		if (!user) {
		  socket.emit('userStatus',{success: false, msg: 'Cannot find an account with '+data.username});
		} else {
			socket.emit('userStatus',{success: true, msg: 'Valid user account'});
		}
	  });
	});
	 // listen for login socket calls
	socket.on('login', function(data){
	  console.log('Logging in user');
	  User.findOne({
		name: data.username
	  }, function(err, user) {
		if (err) throw err;
	 
		if (!user) {
		  socket.emit('loginStatus',{success: false, msg: 'Authentication failed. User not found.'});
		} else {
		  // check if password matches
		  user.comparePassword(data.password, function (err, isMatch) {
			if (isMatch && !err) {
				var token = jwt.encode(user, config.secret);
				
				Watch.find({ user_id: data.username }, function(err, watching) {
					if(watching){
						WatchList.find({ user_id: data.username }, function(err, list) {
							if(list){
								socket.emit('loginStatus',{success: true, token: token, watch: watching, watchList: list, msg: 'watching and watch list found'});
							}else{
								socket.emit('loginStatus',{success: true, token: token, watch: watching});
							}
							if(err){
								console.log("error loading MyList data");
							}
						})
					}
					else{
						WatchList.find({ user_id: data.username }, function(err, list) {
							if(list){
								socket.emit('loginStatus',{success: true, token: token, watchList: list, msg: 'Watch List Loaded'});
							}else{
								socket.emit('loginStatus',{success: true, token: token, msg: 'No Watch List'});
							}
							if(err){
								console.log("error loading MyList data");
							}
						})
					}
					if(err){
						console.log("error loading watching data");
						socket.emit('loginStatus',{success: true, token: token, msg: 'Error loading watch list'});
					}
					
				  });
			} else {
			  socket.emit('loginStatus',{success: false, msg: 'Authentication failed. Wrong password.'});
			}
		  });
		}
	  });
	});
	socket.on('generateTorrent', function(data) {
		if(typeof data.infoHash == 'undefined' || data.infoHash == '') {
			//res.json(500).send('Missing infoHash parameter!'); return;
			socket.emit('generatedT', {success: false, msg: 'Missing infoHash parameter!'});
		}
		console.log('fetching ' + data.infoHash);
		var torrent = buildMagnetURI(data.infoHash);
		try {
			client.add(torrent, function (torrent) {
				var file = getLargestFile(torrent);
				if(re.exec(file.name)[1] === 'mp4'){
					console.log(file.name);
					socket.emit('generatedT', {success: true, file: file.name});
				}else{
					console.log(file.name);
					socket.emit('generatedT', {success: true, file: file.name});
				}
				console.log(file.name);
			});
		} catch (err) {
			socket.emit('generatedT', {success: false, file: + err.toString()});
			console.log(err.toString());
		}
	});
	socket.on('generateInfo', function(data) {
		omdb.search(data.title, function(err, movies) {
			if(err) {
				socket.emit('generated', {success: false, msg: err});
				console.log(err);
			}
		 
			if(movies.length < 1) {
				socket.emit('generated', {success: false, msg: 'No movies Found! Please search again!'});
			}
			
			socket.emit('generated', {success: true, msg: movies});
		});
	});	
	socket.on('getShows', function() {
		jsonfile.readFile(file, function(err, obj) {
			  socket.emit('shows', {success: true, show: obj});
			  if(err){
				socket.emit('shows', {success: false, msg: 'Could not load shows'});
			  }
		});
	});
	socket.on('addTorrent', function(data) {
		if(typeof data.infoHash == 'undefined' || data.infoHash == '') {
			//res.json(500).send('Missing infoHash parameter!'); return;
			socket.emit('addStatus', {success: false, msg: 'Missing infoHash parameter!'});
		}
		var torrent = buildMagnetURI(data.infoHash);
		if(client.get(torrent)){
			updateClientAmount(data.infoHash);
			socket.emit('addStatus', {success: true, msg: 'Torrent Added!', link: 'http://localhost:9111/api/stream/'+data.infoHash+'.mp4' });
		}
		else{
			try {
				setClientAmount(data.infoHash);
				client.add(torrent, function (torrent) {
					var file = getLargestFile(torrent);
					torrent.on('upload', function() {
						torrent.on('done', onDone)
						setInterval(onProgress, 500)
						onProgress()
						function onProgress () {
							socket.emit('progress', {downloaded: prettyBytes(torrent.downloaded), peers: torrent.numPeers });
						}
						function onDone () {
							console.log('done');
						}
					});
					socket.emit('addStatus', {success: true, msg: 'Torrent Added!', link: "http://localhost:9111/api/stream/"+data.infoHash+'.mp4'});
					console.log('added');
				});
				client.on('error', function (err) {
				  console.log(err.stack);
				});
			} catch (err) {
				socket.emit('addStatus', {success: false, msg: + err.toString()});
			}
		}
	});
	
	socket.on('updateWatching', function(data){
		Watch.findOneAndUpdate({user_id: data.watching.user_id, movie_id: data.watching.movie_id}, {$set:{current: data.watching.current}}, {new: true}, function(err, doc){
			if(err){
				console.log(err.toString());
			}else{
				if(doc===null){
					console.log('creating');
					var newWatch = new Watch({
					  user_id: data.watching.user_id,
					  movie_id: data.watching.movie_id,
					  current: data.watching.current,
					  infoHash: data.watching.infoHash,
					  status: data.watching.status
					});
					newWatch.save(function(err) {
					  if (err) {
						console.log('Error creating item');
					  }else{
						console.log('Successfully created new item.');
					  }
					});
				}else{
					console.log('Successfully updated item.');
				}
			}
		});
	});
	socket.on('deleteTorrent', function(data){
		if(typeof data.infoHash == 'undefined' || data.infoHash == '') {
			socket.emit('deleteStatus', {success: false, msg: 'Missing infoHash parameter!'});
		}
		var torrent = buildMagnetURI(data.infoHash);
		// save the user
		Watch.findOneAndUpdate({user_id: data.watch.user_id, movie_id: data.watch.movie_id}, {$set:{current: data.watch.current}}, {new: true}, function(err, doc){
			if(err){
				console.log('Error occured.');
			}else{
				if(doc===null){
					console.log('creating');
					var newWatch = new Watch({
					  user_id: data.watch.user_id,
					  movie_id: data.watch.movie_id,
					  current: data.watch.current,
					  infoHash: data.watch.infoHash,
					  status: data.watch.status
					});
					newWatch.save(function(err) {
					  if (err) {
						console.log('Error creating item');
					  }else{
						console.log('Successfully created new item.');
					  }
					});
				}else{
					console.log('Successfully updated item.');
				}
			}
		});
		if(data.infoHash[0][data.infoHash]===0){
			try {
				var torrent = client.remove(torrent);
				socket.emit('deleteStatus', {success: true, msg: 'Torrent removed'});
			} catch (err) {
				socket.emit('deleteStatus', {success: false, msg: + err.toString()});
			}
		}
		else{
			removeClientAmount(data.infoHash);
			socket.emit('deleteStatus', {success: true, msg: 'Torrent removed'});
		}
	});
	
	socket.on('stream', function(data){
		var torrent = buildMagnetURI(data.infoHash);
		var torrent = client.get(torrent);
        var file = getLargestFile(torrent);
		//var readStream = file.createReadStream();
		console.log("cast-video emitted");
		var proc = ffmpeg(infs)
		  .videoCodec('vp8')
		  .audioCodec('libmp3lame')
		  .format('webm')
		  // setup event handlers
		  .on('end', function() {
			console.log('done processing input stream');
		  })
		  .on('error', function(err) {
			console.log('an error happened: ' + err.message);
		  })
		 proc.addListener('data', function(data) {
			 console.log('sending data');
			socket.emit('watch', data);
		});
	});
});
	
apiRoutes.get('/stream/:infoHash', function(req, res, next) {
	if(typeof req.params.infoHash == 'undefined' || req.params.infoHash == '') {
        //res.status(500).send('Missing infoHash parameter!'); return;
		return res.json({success: false, msg: 'Missing infoHash parameter!'});
    }
    var torrent = buildMagnetURI(req.params.infoHash);
    try {
        var torrent = client.get(torrent);
        var file = getLargestFile(torrent);
        var total = file.length;

        if(typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
        } else {
            var start = 0; var end = total;
        }
		var stream = file.createReadStream({start: start, end: end});
		//if(re.exec(file.name)[1] === 'mp4'){
			res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
			stream.pipe(res);
		/*}else{
			res.writeHead(200, {'Content-Type': 'video/mp4'});
			new Transcoder(stream)
			.maxSize(1280, 720)
			.videoCodec('h264')
			.videoBitrate(800 * 1000)
			.fps(25)
			.sampleRate(44100)
			.channels(2)
			.audioBitrate(128 * 1000)
			.format('mp4')
			.on('finish', function() {
				console.log("finished");
			})
			.stream().pipe(res);
		}*/		
    } catch (err) {
        //res.status(500).send('Error: ' + err.toString());
		res.json({success: false, msg: err.toString()});
    }
});

app.get('/avi/:infoHash', function(req, res, next) {

    var torrent = buildMagnetURI(req.params.infoHash);
    try {
        var torrent = client.get(torrent);
        var file = getLargestFile(torrent);
        var total = file.length;

        if(typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
        } else {
            var start = 0; var end = total;
        }
		
		var trans = new Transcoder(file)
		  .videoCodec('h264')
		  .format('mp4')
		  .videoBitrate(800 * 1000)
		  .fps(25)
		  .on('finish', function() {
			console.log('finished transcoding');
		  })
		  .on('error', function(err) {
			console.log('transcoding error: %o', err);
		  });
		res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
		trans.stream().pipe(res);
    } catch (err) {
        console.log( err.toString());
		res.json({success: false, msg: err.toString()});
    }
});

app.use('/api', apiRoutes);
 
// Start the server
server.listen(port);
console.log('There will be dragons: http://localhost:' + port);