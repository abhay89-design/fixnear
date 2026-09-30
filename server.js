require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");

const Booking = require("./models/Booking");

const app = express();

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB
if (!process.env.MONGO_URI) {
    console.log("ERROR: MONGO_URI environment variable set nahi hai!");
}

mongoose.connection.on("connected", () => {
    console.log("MongoDB connection state: CONNECTED");
    console.log("Database name:", mongoose.connection.name);
});

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB connection state: DISCONNECTED");
});

mongoose.connection.on("error", (error) => {
    console.log("MongoDB connection error:", error.message);
});

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
})
.then(() => {
    console.log("MongoDB Connected Successfully!");
    console.log("Mongoose readyState:", mongoose.connection.readyState);
    console.log("DATABASE NAME:", mongoose.connection.name);
})
.catch((error) => {
    console.log("MongoDB Connection Error:", error.message);
});

// Public folder
app.use(express.static("public"));

// Create booking
app.post("/book", async (req, res) => {
    try {
        console.log(
            "Booking request received. MongoDB readyState:",
            mongoose.connection.readyState
        );

        console.log(
            "Booking database:",
            mongoose.connection.name
        );

        const booking = new Booking({
            name: req.body.name,
            phone: req.body.phone,
            service: req.body.service,
            address: req.body.address,
            date: req.body.date,
            status: "Pending"
        });

        await booking.save();

        console.log("Booking saved successfully!");

        res.redirect(`/booking-success.html?id=${booking._id}`);

    } catch (error) {
        console.log("Booking error:", error.message);

        res.status(500).send("Booking failed! " + error.message);
    }
});

// Get all bookings
app.get("/api/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Unable to fetch bookings" });
    }
});

// Get single booking
app.get("/api/booking/:id", async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json(booking);

    } catch (error) {
        console.log(error);
        res.status(400).json({ message: "Invalid Booking ID" });
    }
});

// Admin Login
app.post("/admin-login", (req, res) => {
    const password = req.body.password;

    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect("/admin");
    } else {
        res.send(`
            <h2>Wrong Password ❌</h2>
            <a href="/admin-login.html">Try Again</a>
        `);
    }
});

// Admin authentication
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.redirect("/admin-login.html");
    }
}

// Protected Admin Page
app.get("/admin", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "admin.html"));
});

app.get("/admin-logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/admin-login.html");
    });
});

// Update booking status
app.put("/api/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json(booking);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Status update failed" });
    }
});

// Delete booking
app.delete("/api/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.json({ message: "Booking deleted successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Delete failed" });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});