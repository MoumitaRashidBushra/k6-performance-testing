import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  CircularProgress,
  Paper,
} from "@mui/material";
import API from "../services/api";
import Pagination from "./Pagination"; // Your existing Pagination component

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // Page number (one-based)
  const [rowsPerPage, setRowsPerPage] = useState(50); // Default limit per page
  const [totalCount, setTotalCount] = useState(0); // Total number of transactions
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const token = localStorage.getItem("token");
      setLoading(true);

      try {
        // Remove hardcoded limit and use dynamic params
        const response = await API.get(
          "/transaction/list",
          {
            params: {
              limit: rowsPerPage,
              offset: (currentPage - 1) * rowsPerPage,
            },
          }
        );

        setTransactions(response.data.transactions);
        setTotalCount(response.data.count); // Ensure the backend returns total count
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [currentPage, rowsPerPage]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, fontWeight: "bold" }}>
          Please wait... fetching transactions
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: 4,
        maxWidth: "1200px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <Typography variant="h4" sx={{ mb: 4 }}>
        Transaction List ({totalCount})
      </Typography>

      <Paper elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Account</strong></TableCell>
              <TableCell><strong>From Account</strong></TableCell>
              <TableCell><strong>To Account</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Transaction ID</strong></TableCell>
              <TableCell><strong>Debit</strong></TableCell>
              <TableCell><strong>Credit</strong></TableCell>
              <TableCell><strong>Created At</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>{transaction.account}</TableCell>
                <TableCell>{transaction.from_account}</TableCell>
                <TableCell>{transaction.to_account}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>{transaction.trnxId}</TableCell>
                <TableCell>{transaction.debit?.toFixed(2)}</TableCell>
                <TableCell>{transaction.credit?.toFixed(2)}</TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Pagination Component */}
      <Pagination
        total={totalCount}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        onRowsPerPageChange={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1); // Reset to first page when rows per page changes
        }}
      />
    </Box>
  );
};

export default TransactionList;
