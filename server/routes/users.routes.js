import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,loginUser
} from "../controllers/users.controllers.js";

const router = express.Router();

router.get("/users", getUsers);
router.get("/user/:id", getUserById);
router.post("/user", createUser);
router.put("/user/:id", updateUser);
router.delete("/user/:id", deleteUser);
router.post("/login",loginUser)

export default router;
