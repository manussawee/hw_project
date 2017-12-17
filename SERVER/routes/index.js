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

let min = (A, B) => A > B ? B : A;
let max = (A, B) => A > B ? A : B;
let len = str => str.length;
let getPeak = lis => {
	let up = [],down = [],count = 0,mode=-1;
	let sum = 0;
	for(let i = 1; i < lis.length-2 ; i++){
		if(lis[i] > lis[i+1] && lis[i] > lis[i-1]){
			up.push(lis[i]);
			sum += lis[i];
			if(mode==-1)
				mode = 1;
		}
		if(lis[i] < lis[i+1] && lis[i] < lis[i-1]){
			down.push(lis[i]);
			if(mode==-1)
				mode = 0;
		}
	}

	mx = 200;
	for(let i = 0 ; i < up.length ; i++){
		mn = 10000;
		if(i-mode >= 0 && i-mode < down.length)
			mn = up[i] - down[i-mode];
		if(i+1-mode >= 0 && i+1-mode < down.length)
			mn = min(up[i] - down[i+1-mode], mn);
		if(mn!=10000)
			mx = max(mx,mn);
	}
	for(let i = 0 ; i < up.length ; i++){
		mn = 10000;
		if(i-mode >= 0 && i-mode < len(down))
			mn = up[i] - down[i-mode];
		if(i+1-mode >=0 && i+1-mode <len(down))
			mn = min(up[i] - down[i+1-mode], mn);
		if(mn >= mx*(25/100))
			count+=1;
	}
	return { step: count, avg: sum / up.length };
}

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
  return res.render('index.ejs', {title: 'FitnessTracker' });
});

router.get('/get_past', function(req, res, next) {
	con.query("SELECT * FROM activities WHERE finished_at > 0", function (err, result, fields) {
		return res.send(result);
  });
});

router.get('/get_current', function(req, res, next) {
	con.query("SELECT * FROM activities WHERE finished_at = 0", function (err, result, fields) {
		if(result.length == 1) return res.send(result[0]);
		else res.send('0');
  });
});

router.post('/post_start', function(req, res, next) {
	con.query("INSERT INTO activities (created_at, data, max, min) VALUES (" + Date.now() + ", '[]', " + req.body.max + ", " + req.body.min + ")", function (err, result, fields) {
		if (err) throw err;
		console.log(result);
		return res.send(result);
  });
});

router.post('/post_stop', function(req, res, next) {
	con.query("UPDATE activities SET finished_at = " + Date.now() + " WHERE finished_at = 0", function (err, result, fields) {
		return res.send('1');
  });
});

router.get('/delete_activity', function(req, res, next) {
	con.query("DELETE FROM activities WHERE id = " + req.param('id'), function (err, result, fields) {
		return res.send('1');
	});
});

router.get('/receive_data', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  let raw_data = req.param('data');
  if(raw_data[0] != '[' || raw_data[raw_data.length - 1] != ']') return res.send('0');
  
  raw_data = raw_data.slice(1, raw_data.length - 1).split(',');

  if(raw_data.length != 3) return res.send('0')
  let a_x = raw_data[0];
  let a_y = raw_data[1];
  let a_z = raw_data[2];

  let valid = isNumber(a_x) && isNumber(a_y) && isNumber(a_z);

  if(valid) {
  	con.query("SELECT * FROM activities WHERE finished_at = 0", function (err, result, fields) {
  		if(result.length > 0) {
  			let data = result[0].data;
	  		data = JSON.parse(data);
	  		data.push({
	  			x: parseInt(a_x), 
	  			y: parseInt(a_y), 
	  			z: parseInt(a_z),
	  			timestamp: Date.now()
	  		});

	  		let y = [];
	  		let duration = (data[data.length - 1].timestamp - data[data.length > 100 ? data.length - 100 : 0].timestamp) / 1000 / 60;

	  		for(let i = data.length > 100 ? data.length - 100 : 0; i < data.length ; i++) {
	  			y.push(data[i].y);
	  		}
	  		let peak = getPeak(y);
	  		let step = peak.step;
				let distance = Math.round(step * 70) / 100;
				let speed = Math.round(distance / (duration * 60) * 10) / 10;
				if(peak.avg > 1500 || step > duration * 60 * 4) {
					distance = Math.round((step * 100) / 100);
					speed = Math.round(distance / (duration * 60) * 10) / 10;
				}

				io.emit('update_data', data);
	  		data = JSON.stringify(data);

				con.query("UPDATE activities SET data = '" + data + "' WHERE finished_at = 0", function (err_2, result_2, fields_2) {
					if(result[0].max < speed) return res.send('[');
					else if(result[0].min > speed) return res.send(']');
					else return res.send('N');
				});
  		}
  		else res.send('0');
		});
	}
  else res.send('0');

});

// TRAIN DATA

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

router.get('/receive_data_bak', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  let raw_data = req.param('data');
  if(raw_data[0] != '[' || raw_data[raw_data.length - 1] != ']') return res.send('-1');
  
  raw_data = raw_data.slice(1, raw_data.length - 1).split(',');

  if(raw_data.length != 3) return res.send('-1')
  let a_x = raw_data[0];
  let a_y = raw_data[1];
  let a_z = raw_data[2];

  let valid = isNumber(a_x) && isNumber(a_y) && isNumber(a_z);

  if(valid) {
  	con.query("SELECT * FROM records WHERE done = 0", function (err, result, fields) {
  		if(result.length == 0) res.send('VALID');
  		else if(parseInt(result[0].created_at) + parseInt(result[0].duration) * 1000 < Date.now()) {
			con.query("UPDATE records SET done = 1 WHERE done = 0", function (err_2, result_2, fields_2) {
				res.send('-1');	
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
				res.send('1');	
			});
		}
	});
  }
  else res.send('-1');

});

module.exports = router;
