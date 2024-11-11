const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg'); // PostgreSQL client
const cors = require('cors'); // Import cors
require('dotenv').config();

const app = express();
app.use(express.json());

// Use cors middleware to allow all origins
app.use(cors());

// Setup PostgreSQL client
const pool = new Pool({
    user: "postgres",
    host: "mydb.cz0q6mq0u61d.us-east-1.rds.amazonaws.com",
    database: "mydb",
    password: "manoj123",
    port: 5432,
    ssl: { rejectUnauthorized: false }, 
});

// Check the database connection and print a message
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to the database', err.stack);
    } else {
        console.log('Connected to the AWS RDS PostgreSQL database');
    }
    release(); // Release the client back to the pool
});

// Signup route
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the user already exists
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "User already exists, you can login", success: false });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save the new user to the database
        await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
            [name, email, hashedPassword]
        );

        // Respond with a success message
        res.status(201).json({ message: "Successfully signed up", success: true });

    } catch (error) {
        // Handle any server errors
        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const ErrorMessage = 'Auth Failed: Email or password is incorrect';

        // Check if the user exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: ErrorMessage, success: false });
        }

        const user = userResult.rows[0];
        console.log("user : ",user);
        // Compare the password provided with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: ErrorMessage, success: false });
        }

        // Respond with a success message and user details
        res.status(200).json({ 
            message: "Successfully logged in", 
            success: true, 
            email: user.email, 
            name: user.name 
        });

    } catch (error) {
        // Handle any server errors
        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
});

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
