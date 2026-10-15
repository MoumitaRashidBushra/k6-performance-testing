'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  Stack,
} from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const menuCards = [
    {
      title: 'User List',
      description: 'View and manage all users',
      icon: <PeopleIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: '/admin/users',
    },
    {
      title: 'Create User',
      description: 'Add a new user to the system',
      icon: <PersonAddIcon sx={{ fontSize: 60, color: 'success.main' }} />,
      path: '/admin/users/create',
    },
    {
      title: 'Transaction List',
      description: 'View all transactions',
      icon: <ReceiptIcon sx={{ fontSize: 60, color: 'info.main' }} />,
      path: '/admin/transactions',
    },
  ];

  return (
    <DashboardLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Welcome to the D-Money Admin Portal. Manage users and monitor transactions.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 3,
          }}
        >
          {menuCards.map((card) => (
            <Card key={card.title} sx={{ height: '100%' }}>
              <CardActionArea
                onClick={() => router.push(card.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 2,
                  }}
                >
                  {card.icon}
                  <Typography variant="h6" component="div">
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>

        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick Stats
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the menu on the left to navigate through different sections.
          </Typography>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
