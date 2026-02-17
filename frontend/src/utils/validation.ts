// Form validation utilities

export const validateEmail = (email: string): string | null => {
  if (!email) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  return null;
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === "") return `${fieldName} is required`;
  return null;
};

export const validateAmount = (amount: string | number): string | null => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "Please enter a valid amount";
  if (numAmount <= 0) return "Amount must be greater than 0";
  if (numAmount > 999999999.99) return "Amount is too large";
  return null;
};

export const validateEIN = (ein: string): string | null => {
  if (!ein) return null; // EIN is optional
  const einRegex = /^\d{2}-\d{7}$/;
  if (!einRegex.test(ein)) return "EIN must be in format XX-XXXXXXX";
  return null;
};

export const validateZip = (zip: string): string | null => {
  if (!zip) return null; // ZIP is optional
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zip)) return "ZIP must be in format XXXXX or XXXXX-XXXX";
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Phone is optional
  if (phone.length > 50) return "Phone number is too long";
  return null;
};

export const validateDate = (date: string): string | null => {
  if (!date) return "Date is required";
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return "Please enter a valid date";
  if (dateObj > new Date()) return "Date cannot be in the future";
  return null;
};

// Helper to check if there are any validation errors
export const hasErrors = (errors: Record<string, string | null>): boolean => {
  return Object.values(errors).some((error) => error !== null);
};

// Helper to get first error message
export const getFirstError = (errors: Record<string, string | null>): string | null => {
  for (const error of Object.values(errors)) {
    if (error) return error;
  }
  return null;
};
