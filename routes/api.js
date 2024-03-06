const express = require("express");
const router = express.Router();
const authController = require("../apis/api");

router.post('/teacherRegistration',authController.TeacherRegistration)

router.post('/teacherLogin',authController.TeacherLogin)

router.post('/add',authController.AddCourse)

router.post('/biometric',authController.BiometricTime)

router.get('/course',authController.allCourse)

router.get('/student',authController.allStudent)

router.post('/manual',authController.manualAttendance)

router.delete('/delete',authController.deleteCourse)

router.get('/report',authController.studentReport)

module.exports = router;