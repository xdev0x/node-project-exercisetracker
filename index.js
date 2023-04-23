const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const port = process.env.PORT || 3000;

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const mongoose = require('mongoose');
const { stringify } = require('querystring');

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    required: true 
  }
}, {collection: 'user'});

var userModel = mongoose.model('user', userSchema);

var exerciseSchema = mongoose.Schema({
	userId: { 
    type: String, 
    required: true 
  },
	description: { 
    type: String, 
    required: true 
  },
	duration: { 
    type: Number, 
    min: 1, required: 
    true 
  },
	date: { 
    type: Date, 
    default: Date.now 
  }
}, {collection: 'exercise'});

var Exercises = mongoose.model('Exercises', exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', function (req, res) {
	const username = req.body.username;
	console.log('username', username)
	userModel.find({username: username}).exec().then(data => {
		console.log('data', data)
		if(data.length === 0){
			let user = new userModel({username: username});
			console.log('user', user)
			user.save()
			.then(() => {
				return res.json({ _id: user._id, username: user.username });
			})
			.catch(err => {
				console.log(err)
				return res.json(err);
			});
		} else {
			console.log('user already exists!')
			return res.json({ error: 'user already exists!' });
		}
	}).catch(err => {
		console.log(err)
		return res.json(err);
	});
});

app.get('/api/users', function (req, res) {
	userModel.find().exec().then(data => {
		return res.json(data);
	})
	.catch((err)=>{
		return res.json(err);
	});
});

app.post('/api/users/:_id/exercises', function (req, res) {
	let userId = req.params._id;
	let description = req.body.description;
	let duration = parseInt(req.body.duration);
	let date = (req.body.date !== undefined ? new Date(req.body.date) : new Date());
	y = date.toUTCString().replace(',', '').split(' ')
	y = y[0]+' '+y[2]+' '+y[1]+' '+y[3]
	console.log('exercise date ', req.body.date, date, y);
	if(date == 'Invalid Date'){
		return res.json({ error: 'Invalid Date' });
	}
	userModel.findById(userId).then(data => {
		console.log('exercise data userId', userId, data)
		if(data){
			let exercise = new Exercises({
				userId: data._id,
				description: description,
				duration: duration,
				date: date
			});
			exercise.save().then(exerciseData => {
				console.log(exerciseData)
				return res.json({
						_id: data._id,
						username: data.username,
						description: exerciseData.description,
						duration: exerciseData.duration,
						date: y
				});
			}).catch((err)=>{
				return res.json({ error: err});
			})
		} else {
			console.log('user not found')
			return res.json({ error: 'user not found' });
		}
	})
	.catch(err => {
		console.log('e err', err)
		return res.json({ error: err});
	})
});

app.get('/api/users/:_id/logs', function (req, res) {
	let userId = req.params._id;
	let conditions = { userId: userId };

	if (
    (req.query.from !== undefined && req.query.from !== '')
		||
		(req.query.to !== undefined && req.query.to !== '')
  ) {
		conditions.date = {};

		if (req.query.from !== undefined && req.query.from !== '') {
			conditions.date.$gte = new Date(req.query.from);
		}

		if (req.query.to !== undefined && req.query.to !== '') {
			conditions.date.$lte = new Date(req.query.to);
		}

		if (conditions.date.$gte == 'Invalid Date') {
			return res.json({ error: 'from date is invalid' });
		}

		if (conditions.date.$lte == 'Invalid Date') {
			return res.json({ error: 'to date is invalid' });
		}
	}

	let limit = (req.query.limit !== undefined ? parseInt(req.query.limit) : 0);

	if (isNaN(limit)) {
		return res.json({ error: 'limit is not a number' });
	}

	userModel.findById(userId).then(data => {
		console.log('user data userId', userId, data)
		if(data){
			Exercises.find(conditions)
			.sort({ date: 'asc' })
			.limit(limit).exec()
			.then(exerciseData => {
				if (exerciseData) {
					return res.json({
						_id: data._id,
						username: data.username,
						log: exerciseData.map(function (e) {
							return {
								description: e.description,
								duration: e.duration,
								date: new Date(e.date).toDateString()
							};
						}),
						count: exerciseData.length
					});
				}
			});
		} else {
			console.log('user not found')
			return res.json({ error: 'user not found' });
		}
	})
	.catch((err)=>{
		return res.json({ error: err});
	})

	/*userModel.findById(userId, function (err, data) {
		if (!err && data !== null) {
			Exercises.find(conditions).sort({ date: 'asc' }).limit(limit).exec(function (err, exerciseData) {
				if (!err) {
					return res.json({
						_id: data['_id'],
						username: data['username'],
						log: exerciseData.map(function (e) {
							return {
								description: e.description,
								duration: e.duration,
								date: new Date(e.date).toDateString()
							};
						}),
						count: exerciseData.length
					});
				}
			});
		} else {
			return res.json({ error: 'user not found' });
		}
	});
	*/
});

app.use((req, res, next) => {
	return next({ status: 404, message: 'Not Found!' });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
