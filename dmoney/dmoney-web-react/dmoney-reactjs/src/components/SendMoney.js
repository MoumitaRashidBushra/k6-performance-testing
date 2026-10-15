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

const SendMoney = () => {
  const [formData, setFormData] = useState({
    from_account: "",
    to_account: "",
    amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
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
    }

    if (balance) {
      setCurrentBalance(parseFloat(balance)); // Set balance from localStorage
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isConfirmed = window.confirm(
      "Are you sure you want to proceed with sending money?"
    );
    if (!isConfirmed) return;

    setLoading(true);
    setErrorMessage("");
    setResponse(null);
    const token = localStorage.getItem("token");

    try {
      const res = await API.post(
        "/transaction/sendmoney",
        formData
      );
      setResponse(res.data);

      if (res.data.currentBalance !== undefined) {
        const updatedBalance = res.data.currentBalance;
        setCurrentBalance(updatedBalance); // Update UI balance
        localStorage.setItem("balance", updatedBalance); // Update localStorage
      }
    } catch (error) {
      console.error("Error processing send money request:", error);
      setErrorMessage(
        error.response?.data?.message || "Failed to send money. Please try again."
      );
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
          Send Money
        </Typography>
        <form onSubmit={handleSubmit}>
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
              "Send Money"
            )}
          </Button>
        </form>

        {errorMessage && (
          <Typography variant="body1" color="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Typography>
        )}

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
              {response.message || "Transaction successful"}
            </Typography>
            <Typography>Transaction ID: {response.trnxId || "N/A"}</Typography>
            <Typography>
              Fee: {response.fee ? response.fee.toFixed(2) : "N/A"}
            </Typography>
            <Typography>
              Current Balance:{" "}
              {response.currentBalance
                ? response.currentBalance.toFixed(2)
                : "N/A"}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SendMoney;
