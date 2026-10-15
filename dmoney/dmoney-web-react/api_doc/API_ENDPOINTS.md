# D-Money API Endpoints Documentation

Based on the Postman collection, here are all the API endpoints used in the D-Money application.

## Authentication

### Login
- **Method**: `POST`
- **Endpoint**: `/user/login`
- **Body**: 
  ```json
  {
    "email": "admin@roadtocareer.net",
    "password": "1234"
  }
  ```
  OR
  ```json
  {
    "email": "01686606901",
    "password": "1234"
  }
  ```
- **Response**: Returns `token`
- **Note**: The `email` property accepts both email addresses and phone numbers as values
- **Status**: ✅ Implemented in `/app/login/page.tsx` (Frontend supports both email and phone number login)

## User Management

### Get User List
- **Method**: `GET`
- **Endpoint**: `/user/list?count=20&page=1`
- **Headers**: 
  - `Authorization: Bearer {token}`
- **Query Params**:
  - `count`: Number of users per page
  - `page`: Page number
- **Status**: ✅ Implemented in `/app/admin/users/page.tsx`

### Search User by ID
- **Method**: `GET`
- **Endpoint**: `/user/search/id/{id}`
- **Headers**: 
  - `Authorization: Bearer {token}`
- **Status**: ⚠️ Not fully implemented (only in UserProfile page)

### Search User by Phone Number
- **Method**: `GET`
- **Endpoint**: `/user/search/phonenumber/{phoneNumber}`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Status**: ⚠️ Partially implemented in UserList component

### Search User by Email
- **Method**: `GET`
- **Endpoint**: `/user/search/email/{email}`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Status**: ✅ Fixed - now using GET instead of POST

### Search User by Role
- **Method**: `GET`
- **Endpoint**: `/user/search/{role}` (e.g., `/user/search/customer`)
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Status**: ⚠️ Partially implemented in UserList component

### Create New User
- **Method**: `POST`
- **Endpoint**: `/user/create`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "1234",
    "phone_number": "01501234567",
    "nid": "1234567890",
    "role": "Customer"
  }
  ```
- **Status**: ✅ Implemented in `/app/admin/users/create/page.tsx`

### Update User (Full)
- **Method**: `PUT`
- **Endpoint**: `/user/update/{id}`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: All user fields
- **Status**: ❌ Not implemented

### Update User (Partial)
- **Method**: `PATCH`
- **Endpoint**: `/user/update/{id}`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: Only fields to update
- **Status**: ❌ Not implemented

### Delete User
- **Method**: `DELETE`
- **Endpoint**: `/user/delete/{id}`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Status**: ❌ Not implemented

### Upload Photo
- **Method**: `POST`
- **Endpoint**: `/user/upload/{id}`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: `multipart/form-data` with `image` field
- **Status**: ❌ Not implemented

## Transaction Management

### Get Transaction List
- **Method**: `GET`
- **Endpoint**: `/transaction/list?limit=50&offset=0`
- **Headers**: 
  - `Authorization: Bearer {token}`
- **Query Params**:
  - `limit`: Number of transactions per request
  - `offset`: Starting position
- **Status**: ✅ Implemented in `/app/admin/transactions/page.tsx`

### Get User Statement
- **Method**: `GET`
- **Endpoint**: `/transaction/statement?limit=10&offset=0`
- **Headers**: 
  - `Authorization: Bearer {token}`
- **Query Params**:
  - `limit`: Number of transactions
  - `offset`: Starting position
- **Status**: ✅ Implemented in `/app/customer/statement/page.tsx`

### Send Money
- **Method**: `POST`
- **Endpoint**: `/transaction/sendMoney`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: Transaction details
- **Status**: ✅ Implemented in `/app/customer/send-money/page.tsx`

### Deposit (Cash In)
- **Method**: `POST`
- **Endpoint**: `/transaction/deposit`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: Deposit details
- **Status**: ✅ Implemented in `/app/agent/cash-in/page.tsx`

### Withdraw (Cash Out)
- **Method**: `POST`
- **Endpoint**: `/transaction/withdraw`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: Withdrawal details
- **Status**: ✅ Implemented in `/app/customer/cash-out/page.tsx`

### Payment
- **Method**: `POST`
- **Endpoint**: `/transaction/payment`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `X-AUTH-SECRET-KEY: ROADTOSDET`
- **Body**: Payment details
- **Status**: ✅ Implemented in `/app/customer/payment/page.tsx`

## Important Notes

### Headers
All authenticated requests require:
- `Authorization: Bearer {token}` - The JWT token received from login

Some endpoints also require:
- `X-AUTH-SECRET-KEY: ROADTOSDET` - Secret key for certain operations

### Pagination
Two patterns are used:
1. **User List**: Uses `count` and `page` parameters
2. **Transaction List/Statement**: Uses `limit` and `offset` parameters

### Recent Fixes
- ✅ Fixed `/user/search/email` from POST to GET method
- ✅ Fixed transaction list to use `limit` and `offset` instead of `page`
- ✅ Fixed user list to include `count` parameter
- ✅ Fixed API response field names to match actual response structure

## TODO: Features Not Yet Implemented
- [ ] User update functionality (PUT/PATCH)
- [ ] User delete functionality
- [ ] Photo upload feature
- [ ] Advanced user search UI improvements
