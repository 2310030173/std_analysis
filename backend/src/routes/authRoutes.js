import { Router } from "express";

const router = Router();

const VALID_EMAIL = "2310030173@klh.edu.in";
const VALID_PASSWORD = "2310030173";

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    return res.json({
      success: true,
      user: {
        email,
        name: "Store Data Analyst"
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
});

export default router;
