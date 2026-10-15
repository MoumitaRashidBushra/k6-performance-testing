import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // Unique key for Avatar re-render
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await API.get(
          `/user/search/id/${userId}`
        );
        setUser(response.data.user);
        setEditedUser(response.data.user);
        setNotFound(false);
      } catch (error) {
        console.error("Error fetching user details:", error);
        if (error.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleUpdate = async () => {
    const token = localStorage.getItem("token");

    // Check if user info or photo is updated
    const userInfoUpdated =
      editedUser.name !== user.name ||
      editedUser.email !== user.email ||
      editedUser.password !== user.password ||
      editedUser.phone_number !== user.phone_number ||
      editedUser.nid !== user.nid ||
      editedUser.role !== user.role;
    const photoUpdated = !!selectedImage;

    try {
      if (userInfoUpdated) {
        const payload = {
          name: editedUser.name,
          email: editedUser.email,
          password: editedUser.password,
          phone_number: editedUser.phone_number,
          nid: editedUser.nid,
          role: editedUser.role,
        };

        await API.put(
          `/user/update/${userId}`,
          payload
        );
        alert("User details updated successfully!");
      }

      if (photoUpdated) {
        const formData = new FormData();
        formData.append("image", selectedImage);

        const response = await API.post(
          `/user/upload/${userId}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (response.data && response.data.fileName) {
          setUser((prevUser) => ({
            ...prevUser,
            photo: response.data.fileName,
          }));

          // Force Avatar re-render by updating the key
          setAvatarKey(Date.now());
        }

        alert("Image uploaded successfully!");
      }

      if (!userInfoUpdated && !photoUpdated) {
        alert("No changes were made.");
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user or uploading photo:", error);
      const errorMessage = error.response?.data?.message || "Failed to update user details or upload photo.";
      alert(errorMessage);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const token = localStorage.getItem("token");
    setDeleting(true);

    try {
      await API.delete(
        `/user/delete/${userId}`
      );
      
      alert("User deleted successfully!");
      navigate("/admin/user-list");
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete user. Please try again.";
      alert(errorMessage);
      setDeleting(false);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

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
          Please wait... fetching user data
        </Typography>
      </Box>
    );
  }

  if (notFound) {
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
        <Typography variant="h1" sx={{ fontSize: "120px", fontWeight: "bold", color: "#ccc" }}>
          404
        </Typography>
        <Typography variant="h4" sx={{ mt: 2, fontWeight: "bold" }}>
          User Not Found
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, color: "#666" }}>
          The user with ID {userId} does not exist.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 4 }}
          onClick={() => navigate("/profile")}
        >
          Go to Home Page
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: 4,
        maxWidth: "800px",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 4,
        height: "100vh",
      }}
    >
      <Card
        sx={{
          width: "100%",
          borderRadius: "8px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        <CardContent>
          <Typography variant="h5" sx={{ mb: 4, textAlign: "center" }}>
            User Profile
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Name"
              value={editedUser.name}
              onChange={(e) =>
                setEditedUser({ ...editedUser, name: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />
            <TextField
              label="Email"
              value={editedUser.email}
              onChange={(e) =>
                setEditedUser({ ...editedUser, email: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />
            <TextField
              label="Password"
              type="password"
              value={editedUser.password || ""}
              onChange={(e) =>
                setEditedUser({ ...editedUser, password: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />
            <TextField
              label="Phone"
              value={editedUser.phone_number}
              onChange={(e) =>
                setEditedUser({ ...editedUser, phone_number: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />
            <TextField
              label="NID"
              value={editedUser.nid}
              onChange={(e) =>
                setEditedUser({ ...editedUser, nid: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />
            <TextField
              label="Role"
              value={editedUser.role}
              onChange={(e) =>
                setEditedUser({ ...editedUser, role: e.target.value })
              }
              fullWidth
              disabled={!isEditing}
            />
            <TextField
              label="Balance"
              value={editedUser.balance}
              fullWidth
              disabled
            />
            <TextField
              label="Registration Date"
              value={new Date(user.createdAt).toLocaleDateString()}
              fullWidth
              disabled
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 4,
            }}
          >
            {!isEditing ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdate}
              >
                Update
              </Button>
            )}
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteClick}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </Box>
        </CardContent>
      </Card>
      <Box>
        <Avatar
          key={avatarKey} // Use the dynamic key for re-render
          src={
            user.photo
              ? `${process.env.REACT_APP_API_URL}/user/uploads/${user.photo}`
              : "/static/images/avatar/default-avatar.png"
          }
          alt={user.name}
          sx={{
            width: 200,
            height: 200,
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
          }}
        />
        {isEditing && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              sx={{ textTransform: "capitalize" }}
            >
              Browse
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files[0])}
              />
            </Button>
          </Box>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete user "{user?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfile;
