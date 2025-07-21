# CodeTrackPro Backend

A comprehensive Node.js backend for tracking coding progress across multiple competitive programming platforms, featuring user authentication, profile management, real-time statistics, AI-powered chat, leaderboards, and event management.

## 🚀 Features

### Core Features
- **User Authentication & Authorization** - JWT-based auth with HTTP-only cookies
- **Profile Management** - User profiles with avatar upload and platform connections
- **Multi-Platform Integration** - Support for LeetCode, Codeforces, CodeChef, AtCoder, HackerRank
- **Real-time Statistics** - Automated stats synchronization and progress tracking
- **Dynamic Charts** - Rich chart data for progress visualization
- **AI-Powered Chat** - OpenAI integration for coding mentorship and suggestions
- **Global Leaderboards** - Comprehensive ranking system with C-Score algorithm
- **Event Management** - Contest and hackathon tracking with registration system

### Technical Features
- **Modular Architecture** - Clean separation of routes, controllers, models, and middleware
- **Security Best Practices** - Input validation, sanitization, rate limiting, and XSS protection
- **Automated Tasks** - Scheduled statistics updates and data maintenance
- **Comprehensive Logging** - Winston-based logging for monitoring and debugging
- **Error Handling** - Centralized error handling with detailed error responses
- **Data Validation** - Express-validator for robust input validation

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── profileController.js # Profile management
│   ├── statsController.js   # Statistics handling
│   ├── chartController.js   # Chart data generation
│   ├── chatController.js    # AI chat functionality
│   ├── leaderboardController.js # Leaderboard logic
│   └── eventController.js   # Event management
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Error handling middleware
│   └── validation.js       # Input validation rules
├── models/
│   ├── User.js             # User schema
│   ├── PlatformAccount.js  # Platform account schema
│   ├── StatsHistory.js     # Statistics history schema
│   └── Event.js            # Event schema
├── routes/
│   ├── authRoutes.js       # Authentication routes
│   ├── profileRoutes.js    # Profile routes
│   ├── statsRoutes.js      # Statistics routes
│   ├── chartRoutes.js      # Chart data routes
│   ├── chatRoutes.js       # Chat routes
│   ├── leaderboardRoutes.js # Leaderboard routes
│   └── eventRoutes.js      # Event routes
├── services/
│   └── scheduledTasks.js   # Background task services
├── utils/
│   └── logger.js           # Winston logger configuration
├── uploads/                # File upload directory
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
├── server.js              # Main application entry point
└── README.md              # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- OpenAI API key (for chat functionality)

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd CodeTrackPro/backend

# Install dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your configuration
```

### 3. Environment Variables
Configure the following variables in your `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/codetrackpro

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Email Configuration (for email verification)
EMAIL_FROM=noreply@codetrackpro.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_UPLOAD=1000000
```

### 4. Database Setup
```bash
# Start MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS

# The application will automatically connect to MongoDB
```

### 5. Run the Application
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start

# Run with debugging
npm run debug
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📚 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/logout            # User logout
GET    /api/auth/me                # Get current user
PUT    /api/auth/update-profile    # Update user profile
PUT    /api/auth/update-password   # Change password
POST   /api/auth/forgot-password   # Request password reset
PUT    /api/auth/reset-password/:token # Reset password
POST   /api/auth/send-verification # Send email verification
PUT    /api/auth/verify-email/:token   # Verify email
```

### Profile Management
```
GET    /api/profile                # Get user profile
PUT    /api/profile                # Update profile
POST   /api/profile/upload-picture # Upload profile picture
POST   /api/profile/platform       # Add platform account
DELETE /api/profile/platform/:id   # Remove platform account
PUT    /api/profile/platform/:id   # Update platform account
```

### Statistics
```
GET    /api/stats                  # Get user stats
PUT    /api/stats/sync             # Sync stats with platforms
GET    /api/stats/history          # Get stats history
GET    /api/stats/growth           # Get growth analytics
POST   /api/stats/update           # Manual stats update
```

### Chart Data
```
GET    /api/charts/problems-over-time    # Problems solved over time
GET    /api/charts/problem-distribution  # Difficulty distribution
GET    /api/charts/language-distribution # Language usage
GET    /api/charts/rating-history        # Rating progression
GET    /api/charts/platform-comparison   # Platform performance
GET    /api/charts/streak-data           # Streak statistics
GET    /api/charts/submission-calendar   # Activity calendar
```

### AI Chat
```
POST   /api/chat/message           # Send message to AI
GET    /api/chat/history           # Get chat history
DELETE /api/chat/history           # Clear chat history
GET    /api/chat/suggestions       # Get AI suggestions
```

### Leaderboards
```
GET    /api/leaderboard            # Get main leaderboard
GET    /api/leaderboard/rank       # Get user rank
GET    /api/leaderboard/top        # Get top performers
GET    /api/leaderboard/category/:cat # Category leaderboard
GET    /api/leaderboard/stats      # Global statistics
```

### Events
```
GET    /api/events                 # Get all events
POST   /api/events                 # Create event (admin)
GET    /api/events/upcoming        # Get upcoming events
GET    /api/events/:id             # Get event details
PUT    /api/events/:id             # Update event (admin)
DELETE /api/events/:id             # Delete event (admin)
POST   /api/events/:id/join        # Join event
POST   /api/events/:id/leave       # Leave event
GET    /api/events/:id/participants # Get participants
```

## 🔧 Configuration

### Security Features
- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - API rate limiting to prevent abuse
- **Input Validation** - Comprehensive input validation and sanitization
- **XSS Protection** - Cross-site scripting prevention
- **NoSQL Injection Prevention** - MongoDB injection protection
- **Helmet Security** - HTTP security headers
- **CORS Configuration** - Cross-origin resource sharing setup

### Scheduled Tasks
The application runs automated background tasks:
- **Stats Synchronization** - Updates user statistics every 6 hours
- **Event Status Updates** - Updates event statuses based on time
- **Data Cleanup** - Removes old statistics history (365+ days)
- **Ranking Updates** - Recalculates user rankings daily

### Logging
Winston-based logging with different levels:
- **Error** - Application errors and exceptions
- **Warn** - Warning messages and potential issues
- **Info** - General application information
- **Debug** - Detailed debugging information (development only)

## 🚦 Testing

### Manual Testing
Use tools like Postman or curl to test API endpoints:

```bash
# Test health check
curl http://localhost:5000/health

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","username":"testuser","email":"test@example.com","password":"password123"}'
```

### Load Testing
For performance testing, use tools like Artillery or Apache Bench:

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml
```

## 🔄 Deployment

### Production Setup
1. **Environment Variables** - Set production environment variables
2. **Database** - Use MongoDB Atlas or dedicated MongoDB instance
3. **SSL/HTTPS** - Configure SSL certificates
4. **Process Management** - Use PM2 for process management
5. **Reverse Proxy** - Use Nginx for reverse proxy and static file serving
6. **Monitoring** - Set up application monitoring and logging

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 Configuration
```json
{
  "name": "codetrackpro-backend",
  "script": "server.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 📊 Performance Optimization

### Database Optimization
- **Indexing** - Proper MongoDB indexes for query optimization
- **Aggregation** - Efficient aggregation pipelines for complex queries
- **Connection Pooling** - MongoDB connection pooling
- **Query Optimization** - Optimized database queries

### Caching Strategy
- **In-Memory Caching** - Redis for session and frequently accessed data
- **API Response Caching** - Cache API responses for read-heavy endpoints
- **Static File Caching** - CDN for static file delivery

### Monitoring
- **Application Metrics** - Monitor API response times and error rates
- **Database Metrics** - Track database performance and query times
- **System Metrics** - Monitor CPU, memory, and disk usage
- **Error Tracking** - Comprehensive error logging and alerting

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Issues**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/codetrackpro
```

**OpenAI API Issues**
```bash
# Verify API key in .env
OPENAI_API_KEY=your-valid-api-key

# Check API quota and billing
```

**File Upload Issues**
```bash
# Check upload directory permissions
chmod 755 uploads/

# Verify file size limits in .env
MAX_FILE_UPLOAD=1000000
```

**JWT Token Issues**
```bash
# Check JWT secret configuration
JWT_SECRET=your-super-secret-jwt-key

# Verify cookie settings for your domain
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code structure and naming conventions
- Add proper error handling and validation
- Write comprehensive comments for complex logic
- Test your changes thoroughly
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Express.js** - Web framework
- **MongoDB** - Database
- **OpenAI** - AI chat functionality
- **JWT** - Authentication
- **Winston** - Logging
- **Mongoose** - MongoDB ODM
- **Helmet** - Security middleware

---

For more information, visit the [CodeTrackPro Documentation](https://docs.codetrackpro.com) or contact the development team.
