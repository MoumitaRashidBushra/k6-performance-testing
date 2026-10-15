// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';
import DashboardLayout from './components/DashboardLayout';
import UserList from './components/UserList';
import UserProfile from './components/UserProfile';
import CreateUser from './components/CreateUser';
import TransactionList from './components/TransactionList';
import Deposit from './components/Deposit';
import Payment from './components/Payment';
import SelfStatement from './components/SelfStatement';
import SendMoney from './components/SendMoney';
import Withdraw from './components/Withdraw';
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Home Route - Redirects based on authentication */}
        <Route path="/" element={<Home />} />
        
        {/* Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        >
          <Route path="user-list" element={<UserList />} />
          <Route path="user-profile/:userId" element={<UserProfile />} />
          <Route path="create-user" element={<CreateUser />} />
          <Route path="transactions" element={<TransactionList />} />
        </Route>
        <Route
          path="/agent"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        >
          <Route path="cash-in" element={<Deposit />} />
          <Route path="payment" element={<Payment />} />
          <Route path="self-statement" element={<SelfStatement />} />
        </Route>
        <Route
          path="/customer"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        >
          <Route path="self-statement" element={<SelfStatement />} />
          <Route path="payment" element={<Payment />} />
          <Route path="send-money" element={<SendMoney />} />
          <Route path="cash-out" element={<Withdraw />} />
        </Route>
        <Route
          path="/merchant"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        >
          <Route path="self-statement" element={<SelfStatement />} />
          <Route path="cash-out" element={<Withdraw />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
