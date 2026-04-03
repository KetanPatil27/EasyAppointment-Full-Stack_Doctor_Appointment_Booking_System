# Admin Portal & Management Guide

## Overview
The EasyAppointment platform now includes a comprehensive admin portal accessible from the home page with full login and registration functionality.

## Accessing the Admin Portal

### From Home Page
1. Visit the landing page at `/`
2. Scroll to the "Admin & Management Portal" section
3. Choose between:
   - **Admin Login**: For existing administrators
   - **Create Admin**: To register as a new administrator

### Direct Navigation
- **Admin Login**: `/admin/login`
- **Admin Register**: `/admin/register`
- **Admin Dashboard**: `/admin`

## Admin Credentials

### Demo Admin Account
- **Email**: admin@easyappointment.com
- **Password**: admin123

### Creating New Admin Accounts
- **Registration Code**: ADMIN2024
- A registration code is required for security purposes
- Only users with the code can create admin accounts

## Admin Features

### 1. Dashboard Overview (`/admin`)
- Real-time statistics:
  - Total registered users
  - Active doctors count
  - Appointments scheduled
  - Monthly revenue
- Recent appointments table
- System activity overview

### 2. Doctor Management (`/admin/doctors`)
- View all registered doctors
- Add new doctors with specialization, experience, fees
- Edit doctor information
- Manage doctor availability and schedules
- Delete doctor profiles
- Track doctor performance metrics

### 3. Appointment Management (`/admin/appointments`)
- View all appointments across the platform
- Filter by status: Pending, Confirmed, Completed, Cancelled
- Approve or reject pending appointments
- View appointment details
- Monitor appointment timeline

### 4. User Management (`/admin/users`)
- Manage patient accounts
- Search and filter users
- Suspend or restore user accounts
- View user activity and history
- Track user join dates and appointment records

### 5. Analytics & Reporting (`/admin/analytics`)
- Appointment trends (6-month view)
- Top performing doctors
- Revenue analytics
- Appointment status distribution
- Export reports to CSV
- Key performance indicators (KPIs)

### 6. System Settings (`/admin/settings`)
- General platform settings
- System configuration
- Notification preferences
- Maintenance mode
- Security settings

## Admin Registration Process

### Step-by-Step Guide

1. **Navigate to Admin Register Page**
   - Click "Create Admin" button on home page
   - Or visit `/admin/register`

2. **Fill Registration Form**
   - Full Name: Your complete name
   - Email Address: Your admin email
   - Admin Registration Code: ADMIN2024 (demo)
   - Password: Create a strong password (min 6 characters)
   - Confirm Password: Re-enter password

3. **Submit Registration**
   - Click "Create Admin Account"
   - You'll be automatically logged in and redirected to dashboard

4. **Start Managing**
   - Access all admin features from the dashboard

## Security Notes

- Admin registration requires a security code to prevent unauthorized access
- All passwords are hashed and stored securely
- Session management via localStorage
- Only users with admin role can access admin pages
- Unauthorized access attempts redirect to login page

## Navigation Menu

From any admin page, use the sidebar to navigate:
- Dashboard
- Doctors
- Appointments
- Users
- Analytics
- Settings
- Logout

## Common Tasks

### Add a New Doctor
1. Go to Doctors → Add New
2. Fill in doctor details
3. Set specialization and fees
4. Configure availability
5. Save

### View Appointment Details
1. Go to Appointments
2. Select status filter if needed
3. Click on appointment to view details
4. Update status as needed

### Generate Reports
1. Go to Analytics
2. Select date range
3. View metrics and trends
4. Click "Export Report" for CSV

### Manage User Account
1. Go to Users
2. Search for user by name, email, or phone
3. View user details
4. Suspend/restore account if needed

## Troubleshooting

### Can't Login
- Verify email and password are correct
- Check if admin account exists
- Use demo credentials to test: admin@easyappointment.com / admin123

### Registration Failed
- Verify registration code is correct (ADMIN2024)
- Check if email is already registered
- Ensure password is at least 6 characters

### Can't Access Admin Dashboard
- Ensure you're logged in as admin
- Non-admin users will be redirected to login
- Clear browser cache and try again

## Support

For issues or feature requests, contact the platform management team.
