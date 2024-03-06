const mongoose = require("mongoose");

const timeslotSchema = new mongoose.Schema({
  start: {
    type: Number,
  },
  end: {
    type: Number,
  },
  machine: {
    type: Number,
  },
  course_id:{
    type: String
  }
});


const Time = mongoose.model("time_slot", timeslotSchema);

module.exports = Time;
