require("dotenv").config();
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt =  require('jsonwebtoken');
const express = require("express");

const app = express();
const bodyParser = require('body-parser');
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
// Logic goes here
const pool = require('./config/db');
app.post("/register", async (req, res) => {

    console.log('Req Body:', req.body);

    // our register logic goes here..
    try{
        //get user input
        const { name, email, password } = req.body;
      
        //Validate user input
        if (!(email && password && name)) {
            res.status(400).send("All input is required");
        }

        // console.log(name, email, password);
        // check if user already exist
        // Validate if user exist in our database
        const results = await pool.query('Select name from users where email = $1', [email]);
        console.log(name.rows);

        // if(results.rows){
        //     return res.status(409).send("User Already Exist. Please Login");
        // }

        let encryptedPassword = await bcrypt.hash(password, 10);

        //create user in database
        await pool.query('Insert into users (name, email, password) values ($1, $2, $3);',[name, email, password]);
        let user = await pool.query('Select * from users where email = $1', [email]);
      
        console.log('User created:', user.rows);
        //create token
        const token = jwt.sign(
            {"userid":user.rows[0].userid, "email": email}, process.env.Token_Key,
            {
                expiresIn: '1h'
            }
        );
        console.log('Token created:', token);
        
        //save user token
        const result = await pool.query('Select userid from users where email = $1', [email]);
        await pool.query('Update users set token = $1 where userid = $2', [token, result.rows[0].userid]);

        //return new user
        user = await pool.query('Select * from users where email = $1', [email]);
        return res.status(201).json(user.rows);
    }
    catch(err){
        console.log(err);
    }
});
    
    // Login
app.post("/login", async (req, res) => {
    // our login logic goes here
    try{
        const {email, password} = req.body;

        // Validate user input
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }

        let user  = await pool.query('Select * from users where email = $1', [email]);
        console.log(user.rows);

        // console.log(password, user.rows[0].password);
        let token;
        if(user.rows[0].name && password === user.rows[0].password){
            // Create token
            token = jwt.sign(
            {"userid":user.rows[0].userid, "email": email},
            process.env.TOKEN_KEY,
            {
            expiresIn: "1h",
            }
            );

            // console.log('Token:',token);
        }

        // save user token
        const result = await pool.query('Select userid from users where email = $1', [email]);
        await pool.query('Update users set token = $1 where userid = $2', [token, result.rows[0].userid]);

        // user
        user = await pool.query('Select * from users where email = $1', [email]);
        return res.status(201).json({
            "token":token
        }
        );
    }
    catch(err){
        console.log(err);
    }
});

const auth = require("./middleware/auth");

app.post("/welcome", auth, (req, res) => {
  res.status(200).send("Welcome 🙌 ");
});

module.exports = app;