# How Admin Can Add Outlets - Complete Guide

## Overview
The admin can now manage outlets (restaurant locations) through a dedicated outlets management page in the admin dashboard.

## How to Access Outlet Management

### Step 1: Navigate to Outlets
1. Log into the admin dashboard
2. In the sidebar navigation, click on **"Outlets"**
3. This opens the outlets management page at `/outlets`

### Step 2: View Existing Outlets
- See all outlets in a card-based grid layout
- Each outlet card shows:
  - Outlet name and status (Active/Inactive)
  - Full address with map pin icon
  - Phone number and email
  - Creation date
  - Staff count (future feature)
  - Quick action buttons (Edit/Delete)

## How to Add a New Outlet

### Step 1: Click "Add New Outlet"
- Click the **"+ Add New Outlet"** button in the top-right corner
- This opens the outlet creation modal

### Step 2: Fill Out Outlet Information
**Required Fields:**
- **Outlet Name**: Name of the restaurant location (e.g., "Downtown Branch", "Mall Location")
- **Address**: Full address of the outlet (multi-line text area)

**Optional Fields:**
- **Phone Number**: Contact number for the outlet (format: +1-234-567-8900)
- **Email**: Email address for the outlet (e.g., downtown@restaurant.com)
- **Active Status**: Checkbox to set if outlet is active (checked by default)

### Step 3: Save the Outlet
- Click **"Create Outlet"** to save
- The system will validate the information
- On success, the modal closes and the outlets list refreshes
- The new outlet appears in the grid

## Outlet Management Features

### Search and Filter
- **Search Bar**: Search outlets by name or address
- **Status Filter**: Filter by "All Outlets", "Active Only", or "Inactive Only"

### Edit Existing Outlets
1. Click the **Edit** (pencil) icon on any outlet card
2. Modify the outlet information in the modal
3. Click **"Update Outlet"** to save changes

### Delete Outlets
1. Click the **Delete** (trash) icon on any outlet card
2. Confirm the deletion in the popup dialog
3. The outlet is permanently removed

### Outlet Status Management
- Toggle outlets between Active/Inactive status
- Inactive outlets are visually distinguished with red status badges
- Use filters to view only active or inactive outlets

## Technical Implementation

### Frontend Components
- **Main Page**: `/outlets` - Complete outlet management interface
- **Outlet Cards**: Display outlet information in an organized grid
- **Modal Forms**: Create and edit outlets with validation
- **Search/Filter**: Real-time filtering and search functionality

### Backend Integration
- **API Endpoints**: Full CRUD operations for outlets
  - `GET /api/tenants/:tenantId/outlets` - List outlets
  - `POST /api/tenants/:tenantId/outlets` - Create outlet
  - `PUT /api/tenants/:tenantId/outlets/:outletId` - Update outlet
  - `DELETE /api/tenants/:tenantId/outlets/:outletId` - Delete outlet

### Data Structure
```javascript
{
  id: "outlet-uuid",
  name: "Downtown Branch",
  address: "123 Main St, City, State 12345",
  phone: "+1-234-567-8900",
  email: "downtown@restaurant.com",
  managerId: null, // Future: Link to staff member
  isActive: true,
  createdAt: "2024-01-10T10:00:00Z",
  updatedAt: "2024-01-10T10:00:00Z"
}
```

## User Experience Features

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Grid layout adapts to screen size
- Modal forms are mobile-friendly

### Error Handling
- Form validation for required fields
- Network error handling with user-friendly messages
- Confirmation dialogs for destructive actions

### Loading States
- Loading spinners during API calls
- Disabled buttons during form submission
- Skeleton loading for initial page load

### Empty States
- Helpful message when no outlets exist
- Call-to-action button to create first outlet
- Search/filter empty states with suggestions

## Subscription Plan Limits

Based on the backend implementation, outlet limits vary by plan:
- **BASIC Plan**: Maximum 1 outlet
- **PREMIUM Plan**: Maximum 5 outlets  
- **ENTERPRISE Plan**: Unlimited outlets

The system will enforce these limits when creating new outlets.

## Future Enhancements

### Planned Features
1. **Manager Assignment**: Link outlets to staff members as managers
2. **Staff Count**: Display number of staff assigned to each outlet
3. **Performance Metrics**: Show sales/performance data per outlet
4. **Map Integration**: Display outlets on a map view
5. **Bulk Operations**: Import/export outlet data
6. **Advanced Filtering**: Filter by manager, performance, etc.

### Integration Points
- **Staff Management**: Assign staff to specific outlets
- **Inventory**: Track inventory per outlet
- **Analytics**: Generate reports per outlet
- **Menu Management**: Customize menus per outlet

## Files Created/Modified

### New Files
- `apps/admin-dashboard/app/outlets/page.js` - Complete outlets management page

### Existing Integration
- Sidebar navigation already includes "Outlets" link
- `tenantService.js` already has all required API methods
- Backend routes and services are fully implemented

The outlet management system is now complete and ready for use!