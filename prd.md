New chat
So I already have a sophisticated admin panel, but currently this is only login and MC, only one level.
Below is the requirement: I want you to properly make a prompt out of it so that I can just give it to the cloud code.

What we need (simple step-by-step requirements)
    1.    Master Admin account (used by our team)
    •    Full view of everything: all drivers, all cabs, all students, all owners, all earnings and reports.
    •    Ability to create, edit, suspend sub-admins (fleet owners).
    •    Ability to map/unmap cabs and drivers to owners.
    •    Audit/history of any mapping or override actions.
    2.    Sub-Admin account (for each fleet owner who wants to log in as a sub admin.
    •    Owner sees only their own fleet: list of their cabs, drivers, students, and earnings.
    •    Owner can request driver assignments, view reports, download CSVs.
    •    Owner cannot see other owners’ data and cannot act as a driver.
Cabs here for sub admin are mapped by main admin owner.

Sub admin will be able to see only data for cab mapped by main admin

Show more
Here's a well-structured prompt for Claude Code:

Project: Multi-Level Admin Panel with Role-Based Access Control

Context: I have an existing admin panel with basic login and management capabilities, currently operating at a single level. I need to extend this to support a two-tier administrative hierarchy with proper role-based access control and data isolation.

Requirements:

1. Master Admin Role (Our Team)

Implement a Master Admin role with the following capabilities:

Complete System Visibility:
View all drivers across the entire system
View all cabs (vehicles) across the entire system
View all students/users
View all fleet owners (sub-admins)
Access to all earnings data and comprehensive reports
Sub-Admin Management:
Create new sub-admin accounts for fleet owners
Edit existing sub-admin account details
Suspend/deactivate sub-admin accounts
Reactivate suspended sub-admin accounts
Fleet Assignment & Mapping:
Map/assign cabs to specific fleet owners (sub-admins)
Unmap/remove cabs from fleet owners
Map/assign drivers to specific cabs and owners
Unmap/reassign drivers as needed
Audit Trail:
Complete audit log of all mapping actions (cab-to-owner, driver-to-cab)
History of all override actions performed by master admin
Timestamp and admin user information for all changes
Ability to view audit history with filtering options
2. Sub-Admin Role (Fleet Owners)

Implement a Sub-Admin role with the following capabilities:

Isolated Fleet View:
View ONLY cabs that have been mapped to them by the master admin
View ONLY drivers assigned to their mapped cabs
View ONLY students/users associated with their fleet
View ONLY earnings and financial data related to their fleet
Operational Capabilities:
Request driver assignments (subject to master admin approval or auto-assignment based on availability)
View fleet-specific reports and analytics
Download CSV exports of their own fleet data
Monitor their fleet's performance metrics
Access Restrictions:
Cannot view any data from other fleet owners
Cannot access or view other owners' cabs, drivers, or earnings
Cannot perform driver role functions (strictly administrative access only)
Cannot modify cab-to-owner mappings (read-only on assignments)
Key Data Relationships:

Cabs are mapped to Sub-Admins by Master Admin
Sub-Admins see only data for cabs mapped to them
All mappings are controlled exclusively by Master Admin
Data isolation must be enforced at the database query level
Technical Considerations:

Implement proper authentication and authorization middleware
Use role-based access control (RBAC) patterns
Ensure database queries include proper filtering based on user role and ownership
Implement secure session management
Add proper error handling for unauthorized access attempts
Expected Deliverables:

Database schema updates (if needed) to support the two-tier structure
Authentication and authorization implementation
Separate dashboard views for Master Admin and Sub-Admin
Audit logging system
Updated API endpoints with proper permission checks
UI components for both admin levels
Please implement this multi-level admin system with proper security, data isolation, and user experience for both Master Admin and Sub-Admin roles.








