const express = require("express");
const { authMiddleware } = require("../middleware");
const { Account } = require("../db");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
  const account = await Account.findOne({
    userId: req.userId,
  });
  res.json({
    balance: account.balance,
  });
});

router.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  const { amount, to } = req.body;

  const account = await Account.findOne({ userId: req.userId }).session(
    session
  );
  if (!account || account.balance < amount) {
    await session.abortTransaction();
    return res.json({
      message: "Account doesn't exist or Insufficient Balance",
    });
  }

  const toAccount = await Account.findOne({ userId: to }).session(session);
  if (!toAccount) {
    await session.abortTransaction();
    return res.json({
      message: "Invalid account",
    });
  }

  await Account.findOneAndUpdate(
    { userId: req.userId },
    { $inc: { balance: -amount } }
  ).session(session);
  await Account.findOneAndUpdate(
    { userId: to },
    { $inc: { balance: amount } }
  ).session(session);

  await session.commitTransaction();

  res.json({
    message: "Transaction successful",
  });
});

module.exports = router;
