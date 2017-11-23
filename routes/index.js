var express = require('express');
var router = express.Router();

function isNumber (value) {
	if(value.length == 0) return false;

	let parts = value.split('.');
	if(parts.length > 2) return false;

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

module.exports = router;
