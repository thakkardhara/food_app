require("dotenv").config();
require("./db/db");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const http = require("http").createServer(app);

const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,PATCH,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    exposedHeaders: "Content-Length,X-Kuma-Revision",
    credentials: true,
    maxAge: 600,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("api working!");
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/addressRoutes"));
// Mount public restaurant menu routes before the restaurant router which applies
// router-level authentication. This ensures '/api/restaurant/menu/*' is handled
// by the menu router without being intercepted by restaurantRoutes' middleware.
app.use("/api/restaurant/menu", require("./routes/categoryRoutes"));
app.use("/api/restaurant", require("./routes/restaurantRoutes"));
app.use("/api/user/order", require("./routes/ordersRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Add admin routes
app.use("/api/admin", adminRoutes);
http.listen(port, () => {
  console.log(`Server running on ${process.env.PORT || 3000}...`);
});
