require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");

const Booking = require("./models/Booking");
const User = require("./models/user");

const app = express();


app.set("trust proxy", 1);


// ========================================
// SESSION
// ========================================

app.use(session({
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ========================================
// MONGODB
// ========================================

if (!process.env.MONGO_URI) {
    console.log(
        "ERROR: MONGO_URI environment variable set nahi hai!"
    );
}

mongoose.connection.on("connected", () => {

    console.log(
        "MongoDB connection state: CONNECTED"
    );

    console.log(
        "Database name:",
        mongoose.connection.name
    );

});

mongoose.connection.on("disconnected", () => {

    console.log(
        "MongoDB connection state: DISCONNECTED"
    );

});

mongoose.connection.on("error", (error) => {

    console.log(
        "MongoDB connection error:",
        error.message
    );

});

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
})
.then(() => {

    console.log(
        "MongoDB Connected Successfully!"
    );

    console.log(
        "Mongoose readyState:",
        mongoose.connection.readyState
    );

    console.log(
        "DATABASE NAME:",
        mongoose.connection.name
    );

})
.catch((error) => {

    console.log(
        "MongoDB Connection Error:",
        error.message
    );

});


// ========================================
// PUBLIC FOLDER
// ========================================

app.use(express.static(path.join(__dirname, "public")));

app.get("/booking.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "booking.html"));
});


// ========================================
// USER REGISTER
// ========================================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        // Check fields

        if (!name || !email || !password) {

            return res.status(400).json({
                message: "All fields are required"
            });

        }


        // Password length

        if (password.length < 6) {

            return res.status(400).json({
                message:
                    "Password must be at least 6 characters"
            });

        }


        // Check existing user

        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });


        if (existingUser) {

            return res.status(409).json({
                message:
                    "Email already registered"
            });

        }


        // Hash password

        const hashedPassword =
            await bcrypt.hash(password, 10);


        // Create user

        const user = new User({

            name: name.trim(),

            email: email.toLowerCase().trim(),

            password: hashedPassword

        });


        await user.save();


        console.log(
            "New user registered:",
            user.email
        );


        res.status(201).json({

            message:
                "Account created successfully"

        });


    } catch (error) {

        console.log(
            "Registration error:",
            error.message
        );


        res.status(500).json({

            message:
                "Registration failed"

        });

    }

});


// ========================================
// USER LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Check fields

        if (!email || !password) {

            return res.status(400).json({

                message:
                    "Email and password are required"

            });

        }


        // Find user

        const user = await User.findOne({

            email:
                email.toLowerCase().trim()

        });


        if (!user) {

            return res.status(401).json({

                message:
                    "Invalid email or password"

            });

        }


        // Compare password

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                message:
                    "Invalid email or password"

            });

        }


        // Create session

        req.session.userId =
            user._id.toString();

        req.session.userName =
            user.name;

        req.session.userEmail =
            user.email;


        console.log(
            "User logged in:",
            user.email
        );


        res.json({

            message:
                "Login successful",

            user: {

                name:
                    user.name,

                email:
                    user.email

            }

        });


    } catch (error) {

        console.log(
            "Login error:",
            error.message
        );


        res.status(500).json({

            message:
                "Login failed"

        });

    }

});


// ========================================
// USER AUTHENTICATION
// ========================================

function requireUser(req, res, next) {

    if (req.session.userId) {

        next();

    } else {

        res.redirect("/login.html");

    }

}


// ========================================
// CHECK LOGIN STATUS
// ========================================

app.get("/api/me", async (req, res) => {

    try {

        if (!req.session.userId) {

            return res.json({

                loggedIn: false

            });

        }


        const user = await User.findById(
            req.session.userId
        ).select("-password");


        if (!user) {

            req.session.destroy();

            return res.json({

                loggedIn: false

            });

        }


        res.json({

            loggedIn: true,

            user: {

                id:
                    user._id,

                name:
                    user.name,

                email:
                    user.email

            }

        });


    } catch (error) {

        console.log(
            "User check error:",
            error.message
        );


        res.status(500).json({

            message:
                "Unable to check login"

        });

    }

});


// ========================================
// USER LOGOUT
// ========================================

app.get("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.log(
                "Logout error:",
                error.message
            );

            return res.status(500).send(
                "Logout failed"
            );

        }


        res.redirect("/login.html");

    });

});


// ========================================
// CREATE BOOKING
// ========================================

app.post(
    "/book",
    requireUser,
    async (req, res) => {

        try {

            console.log(
                "Booking request received."
            );

            console.log(
                "MongoDB readyState:",
                mongoose.connection.readyState
            );

            console.log(
                "Booking database:",
                mongoose.connection.name
            );


            const booking = new Booking({

                name:
                    req.body.name,

                phone:
                    req.body.phone,

                service:
                    req.body.service,

                address:
                    req.body.address,

                date:
                    req.body.date,

                status:
                    "Pending"

            });


            await booking.save();


            console.log(
                "Booking saved successfully!"
            );


            res.redirect(
                `/booking-success.html?id=${booking._id}`
            );


        } catch (error) {

            console.log(
                "Booking error:",
                error.message
            );


            res.status(500).send(
                "Booking failed! " +
                error.message
            );

        }

    }
);


// ========================================
// GET ALL BOOKINGS
// ========================================

app.get(
    "/api/bookings",
    requireAdmin,
    async (req, res) => {

        try {

            const bookings =
                await Booking.find()
                    .sort({
                        createdAt: -1
                    });


            res.json(bookings);


        } catch (error) {

            console.log(error);


            res.status(500).json({

                message:
                    "Unable to fetch bookings"

            });

        }

    }
);


// ========================================
// GET SINGLE BOOKING
// ========================================

app.get(
    "/api/booking/:id",
    async (req, res) => {

        try {

            const booking =
                await Booking.findById(
                    req.params.id
                );


            if (!booking) {

                return res.status(404).json({

                    message:
                        "Booking not found"

                });

            }


            res.json(booking);


        } catch (error) {

            console.log(error);


            res.status(400).json({

                message:
                    "Invalid Booking ID"

            });

        }

    }
);


// ========================================
// ADMIN LOGIN
// ========================================

app.post(
    "/admin-login",
    (req, res) => {

        const password =
            req.body.password;


        if (
            password ===
            process.env.ADMIN_PASSWORD
        ) {

            req.session.isAdmin = true;


            res.redirect("/admin");

        } else {

            res.send(`

                <h2>Wrong Password ❌</h2>

                <a href="/admin-login.html">
                    Try Again
                </a>

            `);

        }

    }
);


// ========================================
// ADMIN AUTHENTICATION
// ========================================

function requireAdmin(
    req,
    res,
    next
) {

    if (req.session.isAdmin) {

        next();

    } else {

        res.redirect(
            "/admin-login.html"
        );

    }

}


// ========================================
// PROTECTED ADMIN PAGE
// ========================================

app.get(
    "/admin",
    requireAdmin,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "admin",
                "admin.html"
            )
        );

    }
);


// ========================================
// ADMIN LOGOUT
// ========================================

app.get(
    "/admin-logout",
    (req, res) => {

        req.session.destroy(() => {

            res.redirect(
                "/admin-login.html"
            );

        });

    }
);


// ========================================
// UPDATE BOOKING STATUS
// ========================================

app.put(
    "/api/bookings/:id/status",
    requireAdmin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findByIdAndUpdate(

                    req.params.id,

                    {
                        status:
                            req.body.status
                    },

                    {
                        new: true
                    }

                );


            if (!booking) {

                return res.status(404).json({

                    message:
                        "Booking not found"

                });

            }


            res.json(booking);


        } catch (error) {

            console.log(error);


            res.status(500).json({

                message:
                    "Status update failed"

            });

        }

    }
);


// ========================================
// DELETE BOOKING
// ========================================

app.delete(
    "/api/bookings/:id",
    requireAdmin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findByIdAndDelete(
                    req.params.id
                );


            if (!booking) {

                return res.status(404).json({

                    message:
                        "Booking not found"

                });

            }


            res.json({

                message:
                    "Booking deleted successfully"

            });


        } catch (error) {

            console.log(error);


            res.status(500).json({

                message:
                    "Delete failed"

            });

        }

    }
);


// ========================================
// START SERVER
// ========================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
