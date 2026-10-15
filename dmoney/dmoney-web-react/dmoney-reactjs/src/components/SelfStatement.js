import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import API from "../services/api";
import Pagination from "./Pagination"; // Assuming you already have a Pagination component

const SelfStatement = () => {
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const fetchUserPhone = async () => {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email"); // Fetch email from localStorage
  
      if (!email) {
        console.error("Email not found in localStorage.");
        return;
      }
  
      try {
        const res = await API.post(
          "/user/search/email", // POST endpoint
          { email } // Send email in the body
        );
  
        setPhoneNumber(res.data.user.phone_number); // Set phone number for API calls
      } catch (error) {
        console.error("Error fetching user phone number:", error);
      }
    };
  
    fetchUserPhone();
  }, []);
  

  useEffect(() => {
    if (!phoneNumber) return; // Wait until phoneNumber is loaded

    const fetchTransactions = async () => {
      const token = localStorage.getItem("token");
      setLoading(true);

      try {
        const response = await API.get(
          `/transaction/statement/${phoneNumber}`
        );

        setTransactions(response.data.transactions);
        setTotalCount(response.data.count); // Total count from API
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [phoneNumber]);

  // Pagination logic
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentTransactions = transactions.slice(startIndex, startIndex + rowsPerPage);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: 4,
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
        Transaction History ({totalCount})
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>From Account</strong></TableCell>
              <TableCell><strong>To Account</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Transaction ID</strong></TableCell>
              <TableCell><strong>Debit</strong></TableCell>
              <TableCell><strong>Credit</strong></TableCell>
              <TableCell><strong>Transaction Date</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>{transaction.from_account}</TableCell>
                <TableCell>{transaction.to_account}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>{transaction.trnxId}</TableCell>
                <TableCell>{transaction.debit.toFixed(2)}</TableCell>
                <TableCell>{transaction.credit.toFixed(2)}</TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString()}{" "}
                  {new Date(transaction.createdAt).toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Pagination
        total={totalCount}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
      />
    </Box>
  );
};

export default SelfStatement;
