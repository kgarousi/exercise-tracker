const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
const mongoose = require('mongoose');
const { format } = require('date-fns');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


mongoose.connect(process.env.MONGO_URI)

const exerciseSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: Number,
  date: String
});

const userSchema = new mongoose.Schema({
  username: String,
  exercises: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.post("/api/users", async (req, res) =>{

  const username = req.body.username
  const user = new User({username})

  await user.save();
  res.json({"username": user.username,
            "_id" : user.id
  })
});

app.get("/api/users", async (req,res) => {
  const users = await User.find()
  let userList = []
    for(i = 0; i < users.length; i++){
        userList.push({"username" : users[i].username,
                            "_id" :users[i]._id
        })
    }
    res.send(userList)
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  const currentDate = new Date();

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let newDate = date ? new Date(date) : currentDate
    // Create a new exercise object with the provided or current date
    const newExercise = {
      _id: new mongoose.Types.ObjectId(),
      description,
      duration,
      date: date ? new Date(date) : currentDate
    };

    // Add the new exercise to the user's exercises array
    user.exercises.push(newExercise);
    
    // Save the updated user document
    await user.save();

    // Find the newly added exercise to get its ObjectId and formatted date
    const addedExercise = user.exercises.id(newExercise._id);

    // Format the date to "Mon Jan 01 1990" using date-fns
    const formattedDate = format(new Date(addedExercise.date), 'EEE MMM dd yyyy')

    // Respond with the updated user object and the new exercise details
    res.json({
      username: user.username,
      description: addedExercise.description,
      duration: addedExercise.duration,
      date: formattedDate,
      _id: userId
    });
  } catch (error) {
    console.error("Error occurred:", error); // Log the error for debugging
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

   const log = user.exercises.map(exercise =>{
    const dateObject = new Date(exercise.date)
    const dateString = dateObject.toDateString()
    return {
      ...exercise.toObject(), // Convert mongoose document to plain object
      date: dateString
    };
   })

       res.send({
      username: user.username,
      _id: userId,
      count: log.length,
      log
    });
  }
  catch (error) {
    console.error("Error occurred:", error); // Log the error for debugging
    res.status(500).json({ error: "Internal server error" });
  }
});
