import Expense from "../models/Expense.js";

// GET expenses with filters
export const getExpenses = async (req, res) => {
  const { category, dateFilter, start, end } = req.query;

  let query = {};

  // Category filter
  if (category && category !== "All") {
    query.category = category;
  }

  // Date filters
  const now = new Date();
  if (dateFilter === "Current Month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    query.date = { $gte: firstDay, $lte: lastDay };
  } else if (dateFilter === "Current Year") {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    query.date = { $gte: firstDay, $lte: lastDay };
  }

  if (start && end) {
    query.date = { $gte: new Date(start), $lte: new Date(end) };
  }

  const expenses = await Expense.find(query).sort({ date: -1 });
  res.json(expenses);
};

// POST new expense
export const createExpense = async (req, res) => {
  const { category, title, amount, date } = req.body;
  if (!category || !title || !amount)
    return res.status(400).json({ message: "All fields required" });

  const newExpense = new Expense({ category, title, amount, date });
  await newExpense.save();
  res.status(201).json(newExpense);
};

// PUT update expense
export const updateExpense = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Not found" });

  expense.category = req.body.category || expense.category;
  expense.title = req.body.title || expense.title;
  expense.amount = req.body.amount || expense.amount;
  expense.date = req.body.date || expense.date;

  await expense.save();
  res.json(expense);
};

// DELETE expense
export const deleteExpense = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Not found" });

  await expense.deleteOne();
  res.json({ message: "Expense deleted" });
};
// gg 