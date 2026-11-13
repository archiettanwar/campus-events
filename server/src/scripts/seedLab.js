import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import LabResource from '../models/LabResource.js';
import LabSchedule from '../models/LabSchedule.js';
import CheckoutRequest from '../models/CheckoutRequest.js';

const seedLab = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for CampusLab seeding...');

    // Clean existing collections
    await Promise.all([
      User.deleteMany({}),
      LabResource.deleteMany({}),
      LabSchedule.deleteMany({}),
      CheckoutRequest.deleteMany({}),
    ]);

    // 1. Seed Multiple Lab Assistants & Demo Student
    const [assistant1, assistant2] = await User.create([
      {
        name: 'Rajesh Sharma',
        email: 'assistant1@campus.edu',
        password: 'Lab@1234',
        role: 'lab_assistant',
        department: 'Computer Engineering',
        labAssigned: 'Computer & AI Labs (3rd Floor)',
      },
      {
        name: 'Priya Nair',
        email: 'assistant2@campus.edu',
        password: 'Lab@1234',
        role: 'lab_assistant',
        department: 'Electronics & IoT',
        labAssigned: 'Hardware & Embedded Lab (2nd Floor)',
      },
      {
        name: 'Aarav Patel',
        email: 'student@campus.edu',
        password: 'Student@1234',
        role: 'student',
        department: 'Computer Engineering',
        rollNumber: 'CE-2026-042',
      },
    ]);

    // 2. Seed Lab Rooms & Hardware Equipment
    const [compLab1, iotLab, aiLab] = await LabResource.create([
      {
        name: 'Computer Lab 1 (Software & Web)',
        resourceType: 'lab_room',
        category: 'Computer Lab',
        description: '40 Ubuntu/Windows dual-boot workstations with VS Code, Docker, and high-speed LAN.',
        location: 'Block A, 3rd Floor, Room 301',
        totalQuantity: 40,
        availableQuantity: 40,
        specifications: 'Intel i7, 16GB RAM, 512GB NVMe SSD',
      },
      {
        name: 'Embedded & IoT Hardware Lab',
        resourceType: 'lab_room',
        category: 'Hardware Lab',
        description: 'Workbenches equipped with digital oscilloscopes, soldering stations, and power supplies.',
        location: 'Block B, 2nd Floor, Room 204',
        totalQuantity: 25,
        availableQuantity: 25,
        specifications: '12 ESD Workbenches, DSOs, Logic Analyzers',
      },
      {
        name: 'AI & High-Performance Computing Lab',
        resourceType: 'lab_room',
        category: 'Research Lab',
        description: 'GPU-accelerated workstations for deep learning training and council hackathons.',
        location: 'Block A, 4th Floor, Room 402',
        totalQuantity: 20,
        availableQuantity: 20,
        specifications: 'RTX 4070 Ti GPUs, 32GB RAM',
      },
      {
        name: 'Arduino Uno R4 WiFi Kit',
        resourceType: 'equipment',
        category: 'Microcontrollers',
        description: 'Complete starter kit with Arduino Uno R4, breadboard, jumper wires, and USB-C cable.',
        location: 'Hardware Lab — Rack A1',
        totalQuantity: 15,
        availableQuantity: 15,
        specifications: 'Renesas RA4M1, Built-in ESP32-S3 WiFi/BLE',
      },
      {
        name: 'Raspberry Pi 5 (8GB) Developer Bundle',
        resourceType: 'equipment',
        category: 'Single-Board Computers',
        description: 'Includes Raspberry Pi 5 8GB, active cooler, 64GB microSD, and 27W USB-C PSU.',
        location: 'Hardware Lab — Rack A2',
        totalQuantity: 8,
        availableQuantity: 8,
        specifications: '2.4GHz Quad-Core Cortex-A76, 8GB LPDDR4X',
      },
      {
        name: 'ESP32-CAM & Sensor Pack',
        resourceType: 'equipment',
        category: 'IoT & Sensors',
        description: 'ESP32-CAM module with ultrasonic, DHT22, PIR motion, and MPU6050 accelerometer sensors.',
        location: 'Hardware Lab — Drawer B3',
        totalQuantity: 12,
        availableQuantity: 12,
        specifications: 'OV2640 2MP Camera, 6-Axis IMU, Temp/Humidity',
      },
      {
        name: 'Saleae 8-Channel USB Logic Analyzer',
        resourceType: 'equipment',
        category: 'Testing & Measurement',
        description: 'Portable 8-channel digital/analog logic analyzer for SPI, I2C, and UART debugging.',
        location: 'Hardware Lab — Cabinet C1',
        totalQuantity: 5,
        availableQuantity: 5,
        specifications: '100 MS/s Digital, 10 MS/s Analog',
      },
      {
        name: 'Meta Quest 3 VR Headset',
        resourceType: 'equipment',
        category: 'AR / VR Hardware',
        description: 'Mixed-reality headset for spatial computing, Unity/WebXR testing, and demo showcases.',
        location: 'AI Lab — Locker D1',
        totalQuantity: 3,
        availableQuantity: 3,
        specifications: '128GB Storage, Touch Plus Controllers',
      },
      {
        name: 'Portable HDMI Projector & Clicker',
        resourceType: 'equipment',
        category: 'Council & Event Gear',
        description: '1080p portable projector with HDMI cable and wireless slide presenter for council meetings.',
        location: 'Computer Lab 1 — Desk 1',
        totalQuantity: 4,
        availableQuantity: 4,
        specifications: '1080p Full HD, Auto-Keystone, HDMI/USB-C',
      },
    ]);

    // 3. Seed Weekly Timetable Blocks (1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat)
    const weeklyBlocks = [
      // Computer Lab 1
      { labRoom: compLab1._id, title: 'SE Full-Stack Web Practical', activityType: 'Practical', dayOfWeek: 1, startTime: '09:00', endTime: '11:00', createdBy: assistant1._id },
      { labRoom: compLab1._id, title: 'TE Database Management Lab', activityType: 'Practical', dayOfWeek: 1, startTime: '14:00', endTime: '16:00', createdBy: assistant1._id },
      { labRoom: compLab1._id, title: 'DSA Coding Assessment', activityType: 'Test', dayOfWeek: 2, startTime: '10:00', endTime: '12:00', createdBy: assistant1._id },
      { labRoom: compLab1._id, title: 'Operating Systems Practical', activityType: 'Practical', dayOfWeek: 3, startTime: '11:00', endTime: '13:00', createdBy: assistant1._id },
      { labRoom: compLab1._id, title: 'Computer Networks Lab', activityType: 'Practical', dayOfWeek: 4, startTime: '09:00', endTime: '11:00', createdBy: assistant1._id },
      { labRoom: compLab1._id, title: 'CSI Student Council Weekly Sync', activityType: 'Council Meeting', dayOfWeek: 5, startTime: '16:00', endTime: '17:30', createdBy: assistant1._id },

      // Embedded & IoT Lab
      { labRoom: iotLab._id, title: 'Microcontrollers & Interfacing Lab', activityType: 'Practical', dayOfWeek: 1, startTime: '11:00', endTime: '13:00', createdBy: assistant2._id },
      { labRoom: iotLab._id, title: 'Digital Logic Design Lecture', activityType: 'Lecture', dayOfWeek: 2, startTime: '09:00', endTime: '11:00', createdBy: assistant2._id },
      { labRoom: iotLab._id, title: 'IoT Mini-Project Viva & Testing', activityType: 'Test', dayOfWeek: 3, startTime: '14:00', endTime: '16:30', createdBy: assistant2._id },
      { labRoom: iotLab._id, title: 'Embedded Systems Practical', activityType: 'Practical', dayOfWeek: 5, startTime: '10:00', endTime: '12:00', createdBy: assistant2._id },

      // AI & HPC Lab
      { labRoom: aiLab._id, title: 'Machine Learning Practical', activityType: 'Practical', dayOfWeek: 2, startTime: '14:00', endTime: '16:00', createdBy: assistant1._id },
      { labRoom: aiLab._id, title: 'Deep Learning Seminar Lecture', activityType: 'Lecture', dayOfWeek: 4, startTime: '11:00', endTime: '13:00', createdBy: assistant1._id },
      { labRoom: aiLab._id, title: 'Server & GPU Maintenance', activityType: 'Maintenance', dayOfWeek: 6, startTime: '10:00', endTime: '12:00', createdBy: assistant1._id },
    ];

    await LabSchedule.insertMany(weeklyBlocks);

    console.log('CampusLab seeded successfully!');
    console.log('Lab Assistant 1: assistant1@campus.edu / Lab@1234');
    console.log('Lab Assistant 2: assistant2@campus.edu / Lab@1234');
    console.log('Demo Student:    student@campus.edu / Student@1234');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedLab();