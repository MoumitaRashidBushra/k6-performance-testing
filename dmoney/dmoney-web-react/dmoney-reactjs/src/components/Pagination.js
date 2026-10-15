import React from "react";
import { Pagination as MuiPagination, MenuItem, Select, Box, Typography } from "@mui/material";

const Pagination = ({ total, rowsPerPage, currentPage, onPageChange, onRowsPerPageChange }) => {
  const totalPages = Math.ceil(total / rowsPerPage);

  const handlePageChange = (event, value) => {
    onPageChange(value);
  };

  // Don't render pagination if there are no pages
  if (totalPages === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No users found
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        marginTop: 3,
        gap: 2,
      }}
    >
      {/* Pagination Controls */}
      <MuiPagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        siblingCount={1}
        boundaryCount={1}
        showFirstButton
        showLastButton
        size="medium"
        sx={{
          "& .MuiPagination-ul": {
            justifyContent: "center",
          },
        }}
      />

      {/* Rows Per Page Selector */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Rows per page:
        </Typography>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          sx={{
            width: 100,
            "& .MuiSelect-select": {
              textAlign: "center",
            },
          }}
        >
          {[10, 50, 100].map((rows) => (
            <MenuItem key={rows} value={rows}>
              {rows}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
};

export default Pagination;
