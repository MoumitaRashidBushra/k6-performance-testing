import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import API from "../services/api";

const Deposit = () => {
  const [formData, setFormData] = useState({
    from_account: "",
    to_account: "",
    amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(null);

  useEffect(() => {
    // Retrieve the logged-in user's phone number and balance from localStorage
    const phoneNumber = localStorage.getItem("phoneNumber");
    const balance = localStorage.getItem("balance");

    if (phoneNumber) {
      setFormData((prevData) => ({
        ...prevData,
        from_account: phoneNumber, // Set from_account from localStorage
      }));
    } else {
      console.error("Phone number not found in localStorage");
    }

    if (balance) {
      setCurrentBalance(parseFloat(balance)); // Set balance from localStorage
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.from_account) {
      alert("Phone number not set. Please wait or try again.");
      return;
    }

    const isConfirmed = window.confirm(
      "Are you sure you want to proceed with the deposit?"
    );
    if (!isConfirmed) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const res = await API.post(
        "/transaction/deposit",
        formData
      );

      setResponse(res.data);

      if (res.data.currentBalance !== undefined) {
        // Update the local state and localStorage with the new balance
        const updatedBalance = res.data.currentBalance;
        setCurrentBalance(updatedBalance);
        localStorage.setItem("balance", updatedBalance); // Update balance in localStorage
      }
    } catch (error) {
      console.error("Error processing deposit:", error);
      alert("Deposit failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f7f7f7",
        padding: 2,
        position: "relative",
      }}
    >
      {/* Current Balance Display */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          backgroundColor: "#fff",
          padding: "10px 20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Current Balance:{" "}
          {currentBalance !== null ? currentBalance.toFixed(2) : "Loading..."}
        </Typography>
      </Box>

      <Paper
        elevation={3}
        sx={{
          padding: 4,
          maxWidth: 500,
          width: "100%",
          textAlign: "center",
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" sx={{ mb: 3 }}>
          Cash-in
        </Typography>
        <form onSubmit={handleSubmit}>
          {/* To Account */}
          <TextField
            label="To Account"
            fullWidth
            required
            value={formData.to_account}
            onChange={(e) =>
              setFormData({ ...formData, to_account: e.target.value })
            }
            sx={{ mb: 2 }}
          />

          {/* Amount */}
          <TextField
            label="Amount"
            type="number"
            fullWidth
            required
            value={formData.amount}
            onChange={(e) =>
              setFormData({
                ...formData,
                amount: parseInt(e.target.value, 10) || 0,
              })
            }
            sx={{ mb: 2 }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ height: 50, fontSize: 16 }}
          >
            {loading ? (
              <>
                <CircularProgress size={24} sx={{ color: "#fff", mr: 1 }} />
                Transaction is processing...
              </>
            ) : (
              "Deposit"
            )}
          </Button>
        </form>

        {/* Response Section */}
        {response && (
          <Box sx={{ mt: 3, textAlign: "left" }}>
            <Typography
              variant="h6"
              sx={{
                color: response.message.toLowerCase().includes("successful")
                  ? "success.main"
                  : "error.main",
              }}
            >
              {response.message}
            </Typography>
            <Typography>Transaction ID: {response.trnxId || "-"}</Typography>
            <Typography>
              Commission:{" "}
              {response.commission !== undefined
                ? response.commission.toFixed(2)
                : "-"}
            </Typography>
            <Typography>
              Current Balance:{" "}
              {response.currentBalance !== undefined
                ? response.currentBalance.toFixed(2)
                : "N/A"}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Deposit;
