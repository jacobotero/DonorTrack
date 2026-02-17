import { body, param, query, ValidationChain, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
      })),
    });
  }
  next();
};

// Auth validation rules
export const registerValidation: ValidationChain[] = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("organizationName")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Organization name must be 2-255 characters")
    .escape(),
];

export const loginValidation: ValidationChain[] = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Donor validation rules
export const donorValidation: ValidationChain[] = [
  body("firstName")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("First name is required (max 100 characters)")
    .escape(),
  body("lastName")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Last name is required (max 100 characters)")
    .escape(),
  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage("Phone must be max 50 characters"),
  body("addressLine1")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .escape(),
  body("city")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .escape(),
  body("state")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .escape(),
  body("zip")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .escape(),
  body("donorType")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(["Individual", "Family", "Business", "Foundation"])
    .withMessage("Invalid donor type"),
  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Notes must be max 5000 characters"),
];

// Donation validation rules
export const donationValidation: ValidationChain[] = [
  body("donorId")
    .isUUID()
    .withMessage("Valid donor ID is required"),
  body("amount")
    .isFloat({ min: 0.01, max: 999999999.99 })
    .withMessage("Amount must be between 0.01 and 999,999,999.99"),
  body("donationDate")
    .isISO8601()
    .withMessage("Valid donation date is required"),
  body("paymentMethod")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(["Cash", "Check", "Credit Card", "Bank Transfer", "Other"])
    .withMessage("Invalid payment method"),
  body("checkNumber")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .escape(),
  body("fund")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .escape(),
  body("campaign")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .escape(),
  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Notes must be max 5000 characters"),
];

// Organization validation rules
export const organizationValidation: ValidationChain[] = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Organization name must be 2-255 characters")
    .escape(),
  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail()
    .normalizeEmail(),
  body("ein")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{2}-\d{7}$/)
    .withMessage("EIN must be in format XX-XXXXXXX"),
  body("addressLine1")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .escape(),
  body("city")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .escape(),
  body("state")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .escape(),
  body("zip")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("ZIP must be in format XXXXX or XXXXX-XXXX"),
];

// UUID param validation
export const uuidParamValidation = [
  param("id").isUUID().withMessage("Valid UUID is required"),
];

// Pagination validation
export const paginationValidation: ValidationChain[] = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];
