const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require('multer');
const csvParser = require('csv-parser');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const TeacherModel = require('./models/teacher');
const TimeslotModel = require('./models/timeSlot');

const app = express();
app.use(cors());
app.use(express.json());

dotenv.config({ path: "./.env" });

mongoose
  .connect(process.env.URI)
  .then((err) => {
    console.log("MyDB is connected");
  })
  .catch((err) => {
    console.log("Check your internet connection");
  });

  const csvSchema = new mongoose.Schema({
    reg_no: String,
    timestamp: Number,
    locationID: Number
});

const CSVModel = mongoose.model('CSVModel', csvSchema);

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
      return res.status(400).send('No files were uploaded.');
  }

  const results = [];
  const file = req.file.path;

  // Parse CSV file
  fs.createReadStream(file)
      .pipe(csvParser())
      .on('data', (data) => {
          const reg_no = data['No.'];
          const timestamp = new Date(data['Date/Time']).getTime() / 1000;
          const locationID = parseInt(data['Location ID'].substring(1));

          results.push({ reg_no, timestamp, locationID });
      })
      .on('end', () => {
          // Save data to MongoDB
          CSVModel.insertMany(results)
              .then(() => {
                  // Delete the CSV file
                  fs.unlink(file, (err) => {
                      if (err) {
                          console.error('Error deleting file:', err);
                      } else {
                          console.log('CSV file deleted successfully.');
                      }
                  });
                  res.send('File uploaded successfully.');
              })
              .catch((err) => {
                  console.error(err);
                  res.status(500).send('Internal server error.');
              });
      });
});

// Define the API endpoint to handle the timeslot processing
app.post('/process-all-timeslots', async (req, res) => {
  try {
      // Fetch all timeslots from the database
      const timeslots = await TimeslotModel.find();

      // Iterate through each timeslot
      for (const timeslot of timeslots) {
          // Find the corresponding course in the teacher schema
          const teacher = await TeacherModel.findOne({ 'course._id': timeslot.course_id });

          if (!teacher) {
              console.error('Course not found for course_id:', timeslot.course_id);
              continue;
          }

          // Iterate through each student in the course
          const work = async()=>{
            for (const course of teacher.course) {
              // Iterate through each student in the course
              if(course._id==timeslot.course_id){
                for (const student of course.student) {
                  // Increase total count for the student
                  student.total++;

                  // Check if the student's reg_no is found in the CSV model
                  const csvData = await CSVModel.findOne({
                      reg_no: student.reg_no,
                      timestamp: { $gte: timeslot.start, $lte: timeslot.end },
                      locationID: timeslot.machine
                  });
                  //console.log(csvData)
                  if (csvData) {
                      student.att++;
                  }
              }
              }
          }

          }
          await work()
          // Save the changes to the teacher schema
          await teacher.save();
      }
      await CSVModel.deleteMany();

      res.send('All timeslots processed successfully.');
  } catch (error) {
      console.error('Error processing all timeslots:', error);
      res.status(500).send('Internal server error.');
  }
});


app.listen(8000, () => {
  console.log("server is running");
});

app.use("/api", require("./routes/api"));