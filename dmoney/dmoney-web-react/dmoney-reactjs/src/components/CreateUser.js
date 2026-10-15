import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Card,
} from "@mui/material";

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone_number: "",
    nid: "",
    role: "Customer",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await API.post("/user/create", formData);
      alert("User created successfully");
      navigate("/admin/user-list");
    } catch (error) {
      alert("Failed to create user");
    }
  };

  return (
    <Box
      sx={{
        padding: 4,
        maxWidth: "800px", // Match the maxWidth of UserProfile
        margin: "0 auto",
        display: "flex",
        justifyContent: "center", // Center horizontally
        alignItems: "center", // Center vertically
        height: "100vh", // Take full height to center properly
      }}
    >
      <Card
        sx={{
          width: "100%",
          borderRadius: "8px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: 4,
          }}
        >
          <Typography component="h1" variant="h5" align="center" sx={{ mb: 4 }}>
            Create User
          </Typography>

          {/* Name Field */}
          <TextField
            label="Name"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          {/* Email Field */}
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          {/* Password Field */}
          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          {/* Phone Number Field */}
          <TextField
            label="Phone Number"
            type="text"
            fullWidth
            required
            value={formData.phone_number}
            onChange={(e) =>
              setFormData({ ...formData, phone_number: e.target.value })
            }
          />

          {/* NID Field */}
          <TextField
            label="NID"
            type="text"
            fullWidth
            required
            value={formData.nid}
            onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
          />

          {/* Role Dropdown */}
          <FormControl fullWidth required>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              label="Role"
            >
              <MenuItem value="Customer">Customer</MenuItem>
              <MenuItem value="Agent">Agent</MenuItem>
              <MenuItem value="Merchant">Merchant</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>

          {/* Submit Button */}
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
            Create User
          </Button>
        </Box>
      </Card>
    </Box>
  );
};

export default CreateUser;
