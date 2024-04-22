import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "***",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

// let users = [
//   { id: 1, name: "Angela", color: "teal" },
//   { id: 2, name: "Jack", color: "powderblue" },
// ];

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getUser(){
  const result = await db.query("SELECT * FROM users");
  let users=[];
  result.rows.forEach((user)=>{
    users.push(user);
  })
  users=users.sort(function(a,b){
    return a.id-b.id;
  })
  return users;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const users=await getUser();
  const curr_user=users.find((user)=>user.id==currentUserId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: curr_user.user_color,
  });
});
app.post("/add", async (req, res) => {
  console.log(req.body);
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1,$2)",
        [countryCode,currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
      const countries = await checkVisisted();
      const users=await getUser();
      const curr_user=users.find((user)=>user.id==currentUserId)
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: curr_user.user_color,
        error:"Country already visited. Try again."
      });
    }
  } catch (err) {
    console.log(err);
    const countries = await checkVisisted();
    const users=await getUser();
    const curr_user=users.find((user)=>user.id==currentUserId)
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: curr_user.user_color,
      error:"Invalid country name. Try again."
    });
  }
});
app.post("/user", async (req, res) => {
  console.log(req.body);
  if(req.body.user){
    currentUserId=parseInt(req.body.user);
    res.redirect("/");
  }
  else if(req.body.add){
    res.render("new.ejs");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  console.log(req.body);
  const color=req.body.color;
  const name=req.body.name;
  const result=await db.query("INSERT INTO users (user_name,user_color) VALUES ($1,$2) RETURNING *",[name,color]);
  currentUserId=result.rows[0].id;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
