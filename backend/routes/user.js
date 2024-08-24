const express = require("express");
const zod = require("zod");
const JWT_SECRET = require("../config");
const { User, Account } = require("../db");
const { authMiddleware } = require("../middleware");
const jwt = require("jsonwebtoken");

const router = express.Router();

const signUpSchema = zod.object({
  username: zod.string(),
  password: zod.string(),
  firstName: zod.string(),
  lastName: zod.string(),
});

router.post("/signup", async (req, res) => {
  const body = req.body;
  const { success } = signUpSchema.safeParse(req.body);
  console.log(body)
  if (!success) {
    return res.json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  const existingUser = await User.findOne({
    username: body.username,
  });

  if (existingUser) {
    return res.json({
      message: "Email already taken / Incorrect inputs",
    });
  }

  const dbUser = await User.create(body);

  await Account.create({
    userId: dbUser._id,
    balance: 1 + Math.random() * 10000,
  });

  const token = jwt.sign(
    {
      userId: dbUser._id,
    },
    JWT_SECRET
  );

  res.json({
    message: "User created successfully",
    token: token,
  });
});

const signInSchema = zod.object({
  username: zod.string().email(),
  password: zod.string(),
});

router.post("/signin", async (req, res) => {
  const { success } = signInSchema.safeParse(req.body);
  if (!success) {
    return res.status(411).json({
      message: "Email already taken/ invalid inputs",
    });
  }

  const user = User.findOne({
    username: req.body.username,
    password: req.body.password,
  });

  if (!user) {
    return res.status(401).json({
      message: "Invalid username or password",
    });
  }

  if (user) {
    const token = jwt.sign(
      {
        userId: user._id,
      },
      JWT_SECRET
    );

    return res.json({
      token: token,
    });
  }

  res.status(411).json({
    message: "Error while logging in",
  });
});

const updateBody = zod.object({
  password: zod.string().optional(),
  firstName: zod.string().optional(),
  lastName: zod.string().optional(),
});

router.put("/", authMiddleware, async (req, res) => {
  const { success } = updateBody.safeParse(req.body);
  if (!success) {
    res.status(411).json({
      message: "Error while updating information",
    });
  }

  await User.updateOne(req.body, {
    id: req.userId,
  });

  return res.json({
    message: "Updated successfully",
  });
});

router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  const users = await User.find({
    $or: [
      {
        firstName: {
          $regex: filter,
        },
      },
      {
        lastName: {
          $regex: filter,
        },
      },
    ],
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
    })),
  });
});

module.exports = router;
