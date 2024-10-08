const express = require("express");
const path = require("node:path");
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("@supabase/supabase-js");
const PORT = 3000;
const app = express();
const KEY = process.env.SUPABASE_KEY;
const URL = process.env.SUPABASE_URL;
const supabase = db.createClient(URL, KEY);

app.use(logger("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded data
function getUsername(req) {
  if (req.session?.user?.id) return req.session.user.id;
  return "ANON";
}

function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: "Unauthorized, please log in first" });
}
app.use(express.static(path.join(__dirname, "public")));
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");

let users = [];

// Middleware to check if a user is authenticated

// Register a new user

const register = (username, password) => {
  const hashedPassword = bcrypt.hash(password, 10);
  users.push({ id: uuidv4(), username, password: hashedPassword });
  return { username, password: hashedPassword };
};
app.post("/api/register", async (req, res) => {
  register(req.body.username, req.body.password);
  res.status(201).json({ message: "User registered successfully" });
});

// Login a user
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((user) => user.username === username);

  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.user = user; // Set session
    res.json({ message: "Login successful" });
  } else {
    // register the user
    register(req.body.username, req.body.password);
    res.status(201).json({ message: "User registered successfully" });
  }
});

// Logout a user
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logout successful" });
});

app.post("/api/links", async (req, res) => {
  const { url, title } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  const link = {
    id: uuidv4(),
    url,
    title,
    timestamp: new Date().toISOString(),
    user_id: getUsername(req),
  };
  const { data, error } = await supabase.from("links").insert([link]);

  if (error) {
    res.status(400).json({ message: error.message });
  } else {
    res.status(201).json({ message: "Link added successfully", link: link });
  }
});

app.get("/api/links", async (req, res) => {
  const { data, error } = await supabase.from("links").select("*");

  if (error) {
    res.status(400).json({ message: error.message });
  } else {
    res.json(data);
  }
});

app.delete("/api/links/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase.from("links").delete().eq("id", id);

  if (error) {
    res.status(400).json({ message: error.message });
  } else {
    res.json({ message: "Link deleted successfully", data });
  }
});

app.listen(PORT, () => {
  console.log(`LinkBucket server running at http://localhost:${PORT}`);
});
app.use("/", indexRouter);
app.use("/users", usersRouter);
