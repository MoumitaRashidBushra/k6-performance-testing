// src/components/LeftMenu.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemText, Toolbar } from '@mui/material';

const LeftMenu = () => {
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const role = localStorage.getItem('role'); // Get role from localStorage

    // Define role-based menus
    const roleBasedMenu = {
      Admin: [
        { name: 'User List', path: '/admin/user-list' },
        { name: 'Create User', path: '/admin/create-user' },
        { name: 'Transaction List', path: '/admin/transactions' },
      ],
      Agent: [
        { name: 'Cash In', path: '/agent/cash-in' },
        { name: 'Payment', path: '/agent/payment' },
        { name: 'Self Statement', path: '/agent/self-statement' },
      ],
      Customer: [
        { name: 'Send Money', path: '/customer/send-money' },
        { name: 'Cash Out', path: '/customer/cash-out' },
        { name: 'Payment', path: '/customer/payment' },
        { name: 'Self Statement', path: '/customer/self-statement' },
      ],
      Merchant: [
        { name: 'Cash Out', path: '/merchant/cash-out' },
        { name: 'Self Statement', path: '/merchant/self-statement' },
      ],
    };

    // Set menu items based on role
    setMenuItems(roleBasedMenu[role] || []);
  }, []);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
      }}
    >
      {/* Add a Toolbar component for spacing */}
      <Toolbar />
      <List sx={{ mt: 2 }}> {/* Add margin-top for spacing */}
        {menuItems.map((item) => (
          <ListItem button key={item.name} component={Link} to={item.path}>
            <ListItemText primary={item.name} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default LeftMenu;
