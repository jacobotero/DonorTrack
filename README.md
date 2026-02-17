# DonorTrack

**Modern donor management and donation tracking for small nonprofits and churches.**

DonorTrack is a comprehensive web application designed to help small organizations track donations, manage donor relationships, generate reports, and create IRS-compliant tax letters.

## Features

### Core Features
- **Donor Management**: Track donor information, contact details, and giving history
- **Donation Tracking**: Record and categorize donations with flexible filtering
- **Fund Management**: Organize donations by funds and campaigns
- **Reporting**: Generate summary reports, fund reports, and top donor lists
- **Tax Letters**: Create IRS-compliant year-end tax receipts with one click
- **Email Integration**: Send tax letters directly to donors via email
- **Data Export**: Export data to CSV and PDF formats
- **Batch Operations**: Import donors via CSV, batch generate tax letters

### Security
- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection protection via Prisma ORM
- Secure password hashing with bcrypt
- HTTPS recommended for production

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **PDF Generation**: PDFKit
- **Email**: Nodemailer (SMTP)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd DonorTrack
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate deploy
npx prisma generate
npm run dev
```

3. **Setup Frontend**
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/donortrack"
JWT_SECRET="your-secret-key-min-32-characters"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# Email (Optional - for sending tax letters)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME="Your Organization"
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3000
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.

### Quick Production Checklist
- [ ] Change JWT_SECRET to a secure random string (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Use PostgreSQL with SSL
- [ ] Configure SMTP for email sending
- [ ] Set up HTTPS with SSL certificate
- [ ] Configure CORS for your production domain
- [ ] Set up database backups
- [ ] Configure monitoring and error tracking

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Database Migrations
```bash
cd backend

# Create a new migration
npx prisma migrate dev --name description_of_change

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
DonorTrack/
├── backend/
│   ├── prisma/           # Database schema and migrations
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Utility functions
│   │   ├── app.ts        # Express app setup
│   │   └── server.ts     # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Libraries and utilities
│   │   ├── pages/        # Page components
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx       # Main app component
│   └── package.json
├── DEPLOYMENT.md         # Deployment guide
└── README.md            # This file
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new organization
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Donors
- `GET /api/donors` - List donors (with pagination & filters)
- `POST /api/donors` - Create donor
- `GET /api/donors/:id` - Get donor details
- `PUT /api/donors/:id` - Update donor
- `DELETE /api/donors/:id` - Delete donor
- `POST /api/donors/import` - Import donors from CSV
- `GET /api/donors/export` - Export donors to CSV

### Donations
- `GET /api/donations` - List donations
- `POST /api/donations` - Create donation
- `PUT /api/donations/:id` - Update donation
- `DELETE /api/donations/:id` - Soft delete donation

### Tax Letters
- `POST /api/tax-letters/generate` - Generate tax letters for a year
- `GET /api/tax-letters/:id/pdf` - Download individual PDF
- `GET /api/tax-letters/batch/zip` - Download batch as ZIP
- `POST /api/tax-letters/:id/send-email` - Email letter to donor
- `PATCH /api/tax-letters/:id/mark-sent` - Mark as sent
- `PATCH /api/tax-letters/:id/mark-unsent` - Mark as not sent

### Reports
- `GET /api/reports/summary` - Summary report (PDF/CSV)
- `GET /api/reports/funds` - Fund breakdown report
- `GET /api/reports/top-donors` - Top donors report

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions, please visit the GitHub repository.

## Acknowledgments

Built with modern web technologies to serve small nonprofits and churches.
