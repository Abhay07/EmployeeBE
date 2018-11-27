const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const jwt = require('jsonwebtoken');
const config = process.env.SECRETKEY;
const ObjectId = require('mongodb').ObjectId; 

let db,employees;
console.log(config);
MongoClient.connect('mongodb://abhay07:abhay0707@ds115442.mlab.com:15442/nodelearndb',(err,database)=>{
	db = database.db('nodelearndb');
	app.listen(8080, () => console.log('Example app listening on port 3000!'))
})
const app = express()

app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json());


app.use(function (err, req, res, next) {
  res.status(500).send('Something broke!')
})

const checkAuth = (req,res,next)=>{
	const authorizationHeader = req.headers['authorization'];

	//Get token from header else set it to null
	const token = authorizationHeader ? authorizationHeader.split('Bearer ')[1] : null;


	if(!token) return res.status(401).send('User not authrized');
	jwt.verify(token,config.secret,(err,decoded)=>{
		if(err) return res.status(401).send('User not authorized');
		db.collection('users').findOne({"_id":ObjectId(decoded.id)},(err,results)=>{
			if (err) return res.status(404).send('User not found');
			console.log(decoded);
			if(!results) return res.status(500).send('User not found');
			req.user = results;
			next();
		})
	})
}



app.use(function(req,res,next){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, access-token");
	next();
})

app.options('/*',(req,res,next)=>{
	next();
})

app.get('/api/employees', (req,res)=>{
	employees = db.collection('employees');
	employees.find({},function(err,results){
		if(err || !results) return res.status(500).send();
		const result = results.body ? results.body : [];
		res.send(result);
	});
});

app.post('/api/employees', checkAuth, (req,res)=>{
	const id = req.user._id;
	const empId = req.body.Id;
	const empName = req.body.Name;
	const empSurname = req.body.Surname;


	if(empId){
		db.collection('employees').findOneAndUpdate(
			{_id:ObjectId(empId)},
			{$set:{Name:empName, Surname:empSurname}},
			{upsert:true},
			(err,result)=>{
			if(err) return console.log(err);
			res.status(200).send('Successful');
		})
	}
	else{
		db.collection('employees').insert({
				Name:req.body.Name,
				Surname:req.body.Surname
			},
			(err,result)=>{
			if(err) return console.log(err);
			res.status(200).send({Id:id,Name:empName, Surname: empSurname});
		})
	}

});

app.post('/token',(req,res)=>{
	const username = req.body.name;
	const password = req.body.password;
	const usersDb = db.collection('users');

	if(!username || !password){
		res.status(422).send('Invalid info');
		return;
	}
	usersDb.findOne({username:username},(err,results)=>{
		if(results){
			res.status(422);
			res.send('User already exists');
			return;
		}


		usersDb.insert({username:username,password:password},(err,result)=>{
			if(err) return console.log(err);
			const id = result.ops[0]._id;
			const token = jwt.sign({id:id},config.secret,{
				expiresIn:86399
			})
			res.send({token_type:'bearer',access_token:token, expires_in:86399});
		})

	})
})


