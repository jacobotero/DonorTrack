export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  organization: Organization | null;
};

export type Organization = {
  id: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  ein?: string;
  taxExemptStatus?: string;
  logoUrl?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpFromName?: string;
  smtpConfigured?: boolean;
};

export type Donor = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  donorType?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  totalGiving?: number;
  donationCount?: number;
};

export type Donation = {
  id: string;
  donorId: string;
  amount: number;
  donationDate: string;
  paymentMethod?: string;
  checkNumber?: string;
  fund?: string;
  campaign?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  donor?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
};

export type Fund = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DashboardStats = {
  monthlyTotal: number;
  monthlyCount: number;
  yearlyTotal: number;
  yearlyCount: number;
  totalDonors: number;
};

export type TaxLetter = {
  id: string;
  organizationId: string;
  donorId: string;
  year: number;
  totalAmount: number;
  letterDate: string;
  sentDate?: string;
  createdAt: string;
  donor?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
};
