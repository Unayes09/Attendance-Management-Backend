const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  reg_no: {
    type: String,
  },
  att: {
    type: Number,
  },
  total: {
    type: Number,
  }
});

const courseSchema = new mongoose.Schema({
    course_code: {
      type: String,
    },
    course_title: {
      type: String,
    },
    student:[studentSchema]
  });

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  course: [courseSchema]
});

const Project = mongoose.model("teacher", teacherSchema);

module.exports = Project;