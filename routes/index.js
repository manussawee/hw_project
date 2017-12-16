var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "fitnesstracker",
  password: "yyy2K3eHFCrEHcc5",
  database: "fitnesstracker"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("MySQL Connected!");
});

function isNumber (value) {
	if(value == undefined || value.length == 0) return false;


	let parts = value.split('.');
	if(parts.length > 2) return false;

	if(parts[0][0] == '-') parts[0] = parts.slice(1);

	for(let i = 0; i < parts.length; i++) {
		for(let j = 0; j < parts[i].length; j++) {
			if(!('0' <= parts[i][j] && parts[i][j] <= '9')) return false;
		}
	}

	return true;
};

/* GET home page. */
router.get('/', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  let a_x = req.param('a_x');
  let a_y = req.param('a_y');
  let a_z = req.param('a_z');
  let valid = isNumber(a_x) && isNumber(a_y) && isNumber(a_z);

  if(valid) res.send('VALID');
  else res.send('INVALID');

});

router.get('/record', function(req, res, next) {
	res.render('record');
});

router.post('/record_create', function(req, res, next) {
	con.query("UPDATE records SET done = 1", function (err, result, fields) {
		con.query("INSERT INTO records (steps, duration, data, created_at) VALUES (" + req.body.steps + ", " + req.body.duration + ", '[]', " + Date.now() + ") ", function (err_2, result_2, fields_2) {
		    if (err) throw err;
		    res.redirect('/recording');
		});
	});
});

router.get('/recording', function(req, res, next) {
	con.query("SELECT * FROM records WHERE done = 0", function (err, result, fields) {
		if(result.length == 0) res.redirect('/record');
		else {
			if(parseInt(result[0].created_at) + parseInt(result[0].duration) * 1000 < Date.now()) {
				con.query("UPDATE records SET done = 1 WHERE done = 0", function (err, result, fields) {
					res.redirect('/record');
				});
			}
			else res.render('recording', { result: result[0] });
		}
	});
});

router.get('/receive_data', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  let a_x = req.param('a_x');
  let a_y = req.param('a_y');
  let a_z = req.param('a_z');
  let valid = isNumber(a_x) && isNumber(a_y) && isNumber(a_z);

  if(valid) {
  	con.query("SELECT * FROM records WHERE done = 0", function (err, result, fields) {
  		if(result.length == 0) res.send('VALID');
  		else if(parseInt(result[0].created_at) + parseInt(result[0].duration) * 1000 < Date.now()) {
			con.query("UPDATE records SET done = 1 WHERE done = 0", function (err_2, result_2, fields_2) {
				res.send('VALID');	
			});
		}
		else {
			let data = result[0].data;
	  		data = JSON.parse(data);
	  		data.push({
	  			x: parseInt(a_x), 
	  			y: parseInt(a_y), 
	  			z: parseInt(a_z),
	  			timestamp: Date.now()
	  		});
	  		data = JSON.stringify(data);

			con.query("UPDATE records SET data = '" + data + "' WHERE id = " + result[0].id, function (err_2, result_2, fields_2) {
				io.emit('update_data', data);
				res.send('VALID');	
			});
		}
	});
  }
  else res.send('INVALID');

});

module.exports = router;
