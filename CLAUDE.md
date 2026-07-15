# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

School Cab Admin is a React TypeScript web application for managing school transportation services. It's an admin dashboard for managing schools, drivers, students, routes, and bookings with authentication and role-based access control.

## Tech Stack & Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui with Radix UI primitives + Tailwind CSS
- **State Management**: React Context (AuthContext) + TanStack React Query
- **Backend**: Supabase (PostgreSQL database + authentication)
- **Routing**: React Router v6 with protected routes
- **Forms**: React Hook Form + Zod validation

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Project Structure

### Core Architecture

- **src/App.tsx**: Main app component with routing configuration
- **src/main.tsx**: Application entry point
- **src/contexts/auth-context.tsx**: Authentication state management with Supabase
- **src/integrations/supabase/**: Supabase client configuration and TypeScript types

### Feature Organization

- **src/pages/**: Page components organized by feature (drivers/, schools/, auth/, etc.)
- **src/components/**: Reusable components organized by purpose (ui/, forms/, tables/, dashboard/)
- **src/services/**: API service layer for data operations
- **src/hooks/**: Custom React hooks for data fetching and state management
- **src/types/**: TypeScript type definitions

### Key Components

- **DashboardLayout**: Main layout wrapper with sidebar navigation and header
- **ProtectedRoute**: Authentication guard for protected pages
- **AppSidebar**: Navigation sidebar component

## Authentication & Authorization

- Uses Supabase authentication with email/password
- **AuthContext** provides user state and auth methods throughout the app
- **ProtectedRoute** component wraps pages requiring authentication
- Admin role checking is implemented but currently hardcoded to `true` for all authenticated users
- Route protection: public routes (/login, /reset-password) vs protected routes (everything else)

## Database Integration

- **Supabase client**: `src/integrations/supabase/client.ts`
- **Database types**: Auto-generated in `src/integrations/supabase/types.ts`
- **Custom hooks**: `useDrivers.ts`, `useSchools.ts`, `useServiceAreas.ts` for data fetching
- **Service layer**: `driverService.ts`, `schoolService.ts`, `studentService.ts` for API operations

## UI/UX Patterns

- **shadcn/ui components**: Extensive use of pre-built components in `src/components/ui/`
- **Form handling**: Consistent use of React Hook Form with Zod validation
- **Toast notifications**: Sonner for user feedback
- **Loading states**: Loader2 from Lucide React for loading indicators
- **Responsive design**: Tailwind CSS with mobile-first approach

## Important Notes

- The codebase uses absolute imports with `@/` alias pointing to `src/`
- Environment runs on port 8080 by default
- Supabase configuration includes public anon key (safe for client-side)
- ESLint configured with TypeScript and React rules, unused vars and explicit any disabled
- No test framework currently configured - check for testing setup before implementing tests

---

## Database Architecture & Analysis

### Supabase Project: "Mycab" (Region: ap-south-1)

#### Current Data Snapshot
- **Students**: 27 registered
- **Drivers**: 11 total (⚠️ 0 verified, 11 pending verification)
- **Schools**: 17 active schools
- **Active Bookings**: 7 confirmed
- **Booking Requests**: 50 total (29 pending)
- **Subscription Cycles**: 12 active
- **Total Revenue**: ₹5,400.00
- **Trip Sessions**: 30 tracked trips
- **Notifications**: 1,142 sent

### Database Schema (33+ Tables)

#### 1. Core Entities
- **`drivers`** (11 records)
  - Driver profiles with verification status, ratings, service areas
  - Fields: name, phone, cab_number, cab_capacity, license_number, vehicle_type, is_verified, schools_serving
  - Relations: service areas, bookings, payments, withdrawals, locations

- **`students`** (27 records)
  - Student profiles with GPS coordinates for pickup/drop
  - Fields: name, school_id, pickup/drop addresses, pincodes, times, class, section
  - GPS tracking: pickup/drop lat/lng, accuracy, location_source (manual/google_maps/gps)
  - Relations: school, bookings, trip_students

- **`schools`** (17 records)
  - School information with geolocation and operating hours
  - Fields: name, address, locality, pincode, contact, email, principal details
  - GPS: latitude, longitude, location_accuracy, google_place_id
  - JSONB: operating_hours (Mon-Sun schedule)

- **`user_roles`** (63 records)
  - Role-based access: 'user', 'driver', 'admin'
  - Links auth.users to application roles

#### 2. Booking System
- **`booking_requests`** (50 records)
  - Initial booking requests from users
  - Status: pending, confirmed, in_progress, completed, cancelled
  - Types: one_way, round_trip, monthly
  - JSONB: lock_status for concurrent handling

- **`driver_quotations`** (30 records)
  - Price quotes from drivers for booking requests
  - Status: pending, accepted, rejected

- **`driver_rejections`** (2 records)
  - Tracks individual driver rejections
  - Prevents requests from disappearing when one driver rejects

- **`bookings`** (10 records)
  - Confirmed bookings with driver assignments
  - Fields: fare, booking_date, pickup/drop details, duration
  - Subscription fields: subscription_model (daily/cycle), last_cycle_end_date

- **`unserviced_requests`** (2 records)
  - Students without available drivers in their area
  - Status: pending, assigned, resolved

#### 3. Payment & Subscription System
- **`payments`** (7 records)
  - Individual payment transactions
  - Types: subscription, one_time
  - Status: pending, completed, failed, refunded
  - Modes: cash, online, wallet

- **`subscription_cycles`** (12 records)
  - Bulk payment cycles for monthly subscriptions
  - Support: 1, 3, 6, 12 month prepayments
  - Fields: monthly_fare, months_paid, discount_amount, final_amount
  - Payment status: pending, partial, paid, overdue
  - Escalation tracking: reminder_sent_count, escalated, escalated_at

- **`subscription_payments`** (6 records)
  - Actual payments for subscription cycles
  - Razorpay integration: order_id, payment_id, signature
  - Coupon support: coupon_code, discount_applied

- **`coupon_codes`** (4 records)
  - Admin-managed discount coupons
  - Fields: code, applicable_months (1/3/6/12), discount_type (percentage/fixed_amount)
  - Usage tracking: max_uses, used_count, validity dates

- **`coupon_usage_logs`**
  - Detailed usage analytics with device info, IP address

- **`discount_rules`** (1 record)
  - Automated discount rules based on subscription duration

- **`payment_reminders`** (44 records)
  - Automated reminder system
  - Types: cycle_start, daily (day_0 to day_6), escalation (day_7 to day_30)
  - Delivery status: sent, delivered, failed, bounced

- **`escalation_settings`**
  - Per-school escalation configuration
  - Fields: escalation_threshold_days (default: 7), auto_suspend_days (14)

- **`admin_actions`**
  - Audit log of manual admin interventions
  - Track adjustments, waives, suspensions

#### 4. Trip Management & Tracking
- **`trip_sessions`** (30 records)
  - Daily trip instances (pickup/drop runs)
  - Fields: trip_type (pickup/drop/round_trip/return), status, scheduled/actual times
  - Route data: start/end coordinates, distance, duration
  - Student tracking: total_students, students_dropped
  - JSONB: route_data, return_route_data

- **`trip_students`** (28 records)
  - Individual student status per trip
  - Pickup status: scheduled, picked_up, absent, cancelled
  - Drop status: scheduled, dropped, cancelled
  - Order tracking: pickup_order, drop_order for route optimization
  - Parent notifications: parent_notified_pickup, parent_notified_drop

- **`driver_locations`** (505 records)
  - Real-time GPS tracking
  - Fields: latitude, longitude, accuracy, heading, speed
  - Status: online, offline, busy, on_trip
  - Battery monitoring: battery_level (0-100)
  - Timestamps: last_seen_at, created_at

- **`journeys`** (6 records)
  - Historical journey records
  - Links drivers to schools with time ranges

#### 5. Service Areas
- **`driver_service_areas`** (41 records)
  - Pincode-based service coverage
  - Used for driver-student matching

#### 6. Financial Management
- **`driver_withdrawals`** (1 record)
  - Driver payout requests
  - Status: pending, completed, rejected
  - Fields: amount, transaction_id, school_id (for multi-school drivers)

#### 7. Communication
- **`notifications`** (1,142 records)
  - In-app notification history
  - Fields: type, title, message, is_read, read_at

- **`push_notification_queue`** (76 records)
  - Expo push notification queue
  - Status: pending, sent, failed, retrying
  - Retry tracking: attempts, last_attempt_at, error_message

- **`benefits`** (1 record)
  - Feature benefits display for user types (student/driver/both)

#### 8. Reviews & Ratings
- **`reviews`** (0 records)
  - Booking reviews (1-5 stars)
  - Fields: rating, comment

### Data Flow Architecture

```
Component (React)
    ↓
Custom Hook (useDrivers, useSchools, useStudents)
    ↓ React Query (caching, revalidation)
Service Layer (driverService, schoolService, studentService)
    ↓
Supabase Client
    ↓
PostgreSQL Database (Supabase)
```

### Current Admin Panel Coverage

#### Implemented Features ✅
1. **Dashboard** - Real-time stats, recent activity
2. **Schools Management** - CRUD, geolocation, operating hours
3. **Drivers Management** - Profiles, verification, earnings, service areas
4. **Students Management** - Profiles, school assignments
5. **Routes & Areas** - Service area management
6. **Analytics** - Data insights
7. **Benefits** - Feature showcase management
8. **Coupons** - Discount code creation and tracking
9. **Notifications** - Communication center
10. **Settings** - Admin preferences

#### Missing Critical Features ⚠️

**High Priority:**
1. **Booking Request Management**
   - No UI for 29 pending booking requests
   - Driver quotation approval workflow missing
   - Unserviced request handling (2 pending students)

2. **Driver Verification Dashboard**
   - 11 drivers awaiting verification
   - Document review interface needed
   - Bulk verification actions

3. **Subscription Management**
   - No interface for 12 active subscription cycles
   - Payment reminder tracking (44 pending)
   - Escalation workflow (7+ days overdue)
   - Manual admin actions logging

4. **Trip Monitoring**
   - No real-time trip dashboard (30 active sessions)
   - Student pickup/drop status tracking
   - Live driver location map (505 GPS points)
   - Route optimization interface

5. **Financial Reports**
   - Revenue analytics dashboard
   - Driver earnings breakdown
   - Payment collection rate tracking
   - Coupon usage analytics

6. **Driver Withdrawal Approvals**
   - No interface for processing withdrawal requests
   - Transaction management

7. **Bookings List Page**
   - Only detail page exists, no list/search page
   - Need filtering by status, driver, student, school

8. **Payments List Page**
   - Only detail page exists
   - Need comprehensive payment history with filters

### Key Technical Insights

#### 1. Geolocation Features
- Multi-source location tracking: manual, Google Maps API, GPS, current_location
- Accuracy tracking in meters
- Google Place ID integration for reliable addressing
- Both schools and student pickup/drop points have coordinates

#### 2. Subscription System Sophistication
- Flexible duration: 1, 3, 6, 12 months
- Coupon system with percentage and fixed discounts
- 30-day payment reminder escalation system
- Per-school escalation configuration
- Automatic suspension after 14 days

#### 3. Real-time Capabilities
- Driver status tracking (online/offline/busy/on_trip)
- Live GPS with heading, speed, accuracy
- Battery monitoring for driver devices
- Trip progress tracking with student-level granularity

#### 4. Booking Workflow
```
User Request → booking_requests (pending)
    ↓
Drivers receive notification
    ↓
driver_quotations (price offers) OR driver_rejections
    ↓
User selects quotation
    ↓
bookings (confirmed) + subscription_cycle created
    ↓
subscription_payments (with Razorpay)
    ↓
trip_sessions created for daily trips
    ↓
trip_students tracking per student per trip
```

### Critical Issues to Address

1. **Admin Role Hardcoded** (src/contexts/auth-context.tsx:119)
   ```typescript
   const isUserAdmin = true; // ⚠️ ALL users are currently admin!
   ```
   Should query `user_roles` table instead.

2. **High Verification Backlog**
   - 0/11 drivers verified (0% verification rate)
   - Blocking driver activation

3. **Payment Collection Gap**
   - 44 payment reminders pending
   - Need escalation workflow UI

4. **Booking Request Bottleneck**
   - 29/50 requests still pending (58%)
   - Need streamlined approval process

### Recommended Development Priorities

1. **Phase 1: Critical Operations**
   - Driver verification dashboard
   - Booking request management
   - Fix admin role check

2. **Phase 2: Financial Management**
   - Subscription cycle dashboard
   - Payment reminder tracking
   - Driver withdrawal approvals
   - Financial analytics

3. **Phase 3: Real-time Operations**
   - Trip monitoring dashboard
   - Live driver location map
   - Student pickup/drop tracking

4. **Phase 4: Analytics & Optimization**
   - Revenue analytics
   - Payment collection metrics
   - Route optimization tools
   - Coupon effectiveness tracking
