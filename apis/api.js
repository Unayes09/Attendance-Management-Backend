const teacher = require('../models/teacher')
const times = require('../models/timeSlot')
const bcrypt = require("bcryptjs");

exports.TeacherRegistration = async(req,res)=>{
    const {name,email,password} = req.body
    const hashedPassword = await bcrypt.hash(password, 10);
    const regex = /@sust\.edu$/;
    if (regex.test(email)) {
        console.log("Email ends with '@sust.edu'");
    } else {
        return res.status(402).json({message: "Only teachers email required"})
    }
    teacher.findOne({email:email})
    .then(async user=>{
        if(user)return res.status(401).json({message: "Email already exists"})
        else{
            teacher.create({
                name:name,
                email:email,
                password:hashedPassword
            })
            return res.status(200).json({message:"Registration successfull"});
        }
    })
}

exports.TeacherLogin = async(req,res)=>{
    const {email,password} = req.body
    let pass = "";
    await teacher.findOne({ email: email })
      .then((result) => {
        pass = result.password;
      })
      .catch((err) => {
      });
    if (pass == "") {
      return res.status(401).json("Email is wrong!");
    } else {
      bcrypt.compare(password, pass, function (err, result) {
        if (err) console.log(err);
        if (result) {
          return res.status(200).json({ token: email})
        } else {
          return res.status(401).json("Password is wrong!")
        }
      });
    }
}

exports.AddCourse = async(req,res)=>{
  const { email, courseCode, courseTitle, regNo } = req.body;

  try {
    // Find the teacher by email
    const teach = await teacher.findOne({ email:email });

    if (!teach) {
      return res.status(404).json({ message: "Teacher not found" })
    }

    // Check if the course already exists
    const existingCourse = teach.course.find(course => course.course_code === courseCode)
    if (existingCourse) {
      return res.status(400).json({ message: "Course already exists" })
    }

    // Split the regNo string by comma and trim each registration number
    const regNos = regNo.split(",").map(reg => reg.trim())

    // Create an array of student objects with registration numbers
    const students = regNos.map(reg_no => ({ reg_no:reg_no,att:0,total:0 }))

    // Create the new course
    const newCourse = {
      course_code: courseCode,
      course_title: courseTitle,
      student: students
    }

    // Add the new course to the teacher's courses
    teach.course.push(newCourse)

    // Save changes
    await teach.save()

    res.status(200).json({ message: "Course added successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Internal Server Error" })
  }
}

exports.BiometricTime = async(req,res)=>{
  const {id,start,end,machine} = req.body
  await times.create({course_id:id,start:start,end:end,machine:machine})
  .then(result=>{
    return res.status(201).json({message:"Time added"})
  })
  .catch(err=>{
    return res.status(400).json({message:"Some error occured"})
  })
}

exports.allCourse = async(req,res)=>{
  const teach = req.query.teacher
  try {
    await teacher.findOne({email:teach})
    .then(async result=>{
      return res.status(200).json(result)
    })
  } catch (error) {
    return res.status(404).json({message:"Server Error"})
  }
}

exports.allStudent = async(req,res)=>{
  const courseCode = req.query.id

  try {
    // Find the course by course code
    const courses = await teacher.findOne({ "course._id": courseCode })

    if (!courses) {
      return res.status(404).json({ message: "Course not found" })
    }
    // Extract the course details
    const findCourse = courses.course.find(c => c._id.toString() === courseCode.toString())
    console.log(findCourse)
    return res.status(200).json({courses:findCourse})
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.manualAttendance = async(req,res)=>{
 
  const { courseId, classes, attendance } = req.body
  const classe = parseInt(classes,10)
  try {
    // Find the course by its ObjectId
    const course = await teacher.findOne({ "course._id": courseId });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the course index
    const courseIndex = course.course.findIndex(c => c._id.toString() === courseId.toString());

    if (courseIndex === -1) {
      return res.status(404).json({ message: "Course not found" });
    }

    const courseToUpdate = course.course[courseIndex];
    const studentsToUpdate = courseToUpdate.student;

    // Update attendance and total classes for each student
    studentsToUpdate.forEach(student => {
      
      // Find the corresponding attendance mark for the student
      const attendanceMark = attendance.find(att => att.reg_no === student.reg_no);
      //console.log(attendanceMark)
      if (attendanceMark !== undefined) {
        student.att += attendanceMark.attendance;
        student.total += classe;
      } else {
        // Handle the case when attendance mark is 0 and total is 0 initially
        student.att = attendanceMark.attendance;
        student.total = classe;
      }
    });

    // Update the course in the database
    await teacher.updateOne(
      { "course._id": courseId },
      { $set: { [`course.${courseIndex}.student`]: studentsToUpdate } }
    )
    .then(result=>{
      //console.log(result)
      return res.status(200).json({ message: "Attendance updated successfully" });
    })
    .catch(err=>{
      console.log(err)
      return res.status(404).json({ message: "Error" });
    })
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.deleteCourse = async(req,res)=>{
  const { courseId } = req.body;

  try {
    // Find the teacher containing the course
    const teach = await teacher.findOne({ "course._id": courseId });

    if (!teach) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Remove the course from the teacher's courses
    teach.course = teach.course.filter(course => course._id.toString() !== courseId);

    // Save the changes
    await teach.save();

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.studentReport = async(req,res)=>{
  const regNo = req.query.student
  try {
    // Find the student by registration number
    const student = await teacher.findOne({ "course.student.reg_no": regNo })

    if (!student) {
      return res.status(404).json({ message: "Student not found" })
    }

    const studentCourses = [];

    // Iterate through the courses to find the ones attended by the student
    student.course.forEach(course => {
      const attendedCourse = course.student.find(student => student.reg_no === regNo);
      if (attendedCourse) {
        studentCourses.push({
          course_title: course.course_title,
          course_code: course.course_code,
          att: attendedCourse.att,
          total: attendedCourse.total
        });
      }
    });

    return res.status(200).json({courses:studentCourses})
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}