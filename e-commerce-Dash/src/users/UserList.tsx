import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Title,
  useDefaultTitle,
  useNotify,
  CreateButton,
  usePermissions,
  useTranslate,
} from "react-admin";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Alert,
  InputAdornment,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CloseIcon from "@mui/icons-material/Close";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import { getAuthHeaders, fetchWithRefresh } from "../auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3007/v1";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  imageURL?: string | null;
  createdAt?: string;
}

const UserProfile = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Edit profile dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete admin confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const appTitle = useDefaultTitle();
  const notify = useNotify();
  const { permissions } = usePermissions();
  const translate = useTranslate();

  const isSuperAdmin = permissions === "superAdmin" || user?.role === "superAdmin";

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetchWithRefresh(`${API_URL}/user/profile`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
        setEditName(json.data?.name || "");
        setEditPhone(json.data?.phone || "");
      }
    } catch (e) {
      console.error("Failed to load profile", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/user/admins`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setAdmins(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load admins", e);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin, fetchAdmins]);

  const handleOpenEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditName(user?.name || "");
    setEditPhone(user?.phone || "");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setImageFile(null);
    setPreview(null);
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    if (saving) return;
    setEditOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setImageFile(null);
    setPreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (newPassword) {
      if (newPassword.length < 6) {
        return notify(
          translate("pos.users.notification.password_min", { _: "كلمة السر يجب أن تكون 6 أحرف على الأقل" }),
          { type: "warning" }
        );
      }
      if (newPassword !== confirmPassword) {
        return notify(
          translate("pos.users.notification.password_mismatch", { _: "كلمتا السر غير متطابقتين" }),
          { type: "warning" }
        );
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      if (editName.trim()) fd.append("name", editName.trim());
      fd.append("phone", editPhone.trim());
      if (newPassword) fd.append("password", newPassword);
      if (imageFile) fd.append("image", imageFile);

      const res = await fetchWithRefresh(`${API_URL}/user/profile`, {
        method: "PUT",
        headers: { ...getAuthHeaders() },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || translate("pos.users.notification.save_failed", { _: "فشل حفظ التعديلات" }));
      }

      const json = await res.json();
      setUser(json.data);
      if (json.data?.name) {
        try {
          localStorage.setItem("full_name", json.data.name);
        } catch {}
      }

      notify(
        translate("pos.users.notification.profile_updated", { _: "تم تحديث الملف الشخصي بنجاح" }),
        { type: "success" }
      );
      handleCloseEdit();
    } catch (e: any) {
      notify(e.message, { type: "warning" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/user/admins/${deleteTarget._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message || translate("pos.users.notification.delete_admin_failed", { _: "فشل حذف حساب المشرف" })
        );
      }

      setAdmins((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      notify(
        translate("pos.users.notification.admin_deleted", { _: "تم حذف حساب المشرف بنجاح" }),
        { type: "success" }
      );
      setDeleteTarget(null);
    } catch (e: any) {
      notify(e.message, { type: "warning" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 350 }}>
        <CircularProgress size={36} sx={{ color: "#2563EB" }} />
      </Box>
    );
  }

  const roleStyles: Record<string, { bg: string; color: string; label: string }> = {
    superAdmin: { bg: "rgba(16, 29, 53, 0.12)", color: "#101D35", label: "سوبر أدمن" },
    admin: { bg: "rgba(37, 99, 235, 0.12)", color: "#2563EB", label: "مشرف" },
    user: { bg: "rgba(100, 116, 139, 0.12)", color: "#475569", label: "مستخدم" },
  };

  const userRoleCfg = roleStyles[user?.role || "superAdmin"] || roleStyles.superAdmin;
  const currentAvatarUrl = preview || user?.imageURL;

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto", mt: 3, mb: 6, px: { xs: 1.5, sm: 3 } }}>
      <title>{`${appTitle} - ${translate("pos.users.title.profile", { _: "ملفي الشخصي" })}`}</title>
      <Title title={translate("pos.users.title.profile", { _: "ملفي الشخصي" })} />

      {/* Top Header Row */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
            {translate("pos.users.title.profile", { _: "ملفي الشخصي" })}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {isSuperAdmin
              ? "لوحة تحكم السوبر أدمن — إدارة حسابك الشخصي والتحكم في حسابات المشرفين"
              : "عرض وتعديل بيانات حسابك الشخصي"}
          </Typography>
        </Box>

        {isSuperAdmin && (
          <CreateButton
            label="Create Admin"
            variant="contained"
            sx={{
              backgroundColor: "#2563EB",
              borderRadius: "10px",
              fontWeight: 700,
              px: 2.5,
              py: 1,
              textTransform: "none",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              "&:hover": {
                backgroundColor: "#1D4ED8",
                boxShadow: "0 6px 16px rgba(37, 99, 235, 0.35)",
              },
            }}
          />
        )}
      </Box>

      {/* Super Admin / User Account Card (Clickable to Edit) */}
      <Card
        onClick={() => handleOpenEdit()}
        sx={{
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 4px 20px rgba(16, 29, 53, 0.05)",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.25s ease-in-out",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "0 8px 26px rgba(37, 99, 235, 0.12)",
            transform: "translateY(-2px)",
          },
          mb: 4,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {/* Card Top Action Bar */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AdminPanelSettingsIcon sx={{ color: "#2563EB", fontSize: 22 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                {translate("pos.users.title.my_account", { _: "حسابي الشخصي" })}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={(e) => handleOpenEdit(e)}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: "rgba(37, 99, 235, 0.4)",
                color: "#2563EB",
                "&:hover": {
                  borderColor: "#2563EB",
                  backgroundColor: "rgba(37, 99, 235, 0.06)",
                },
              }}
            >
              {translate("pos.users.title.edit_account", { _: "تعديل الحساب" })}
            </Button>
          </Box>

          {/* User Hero Row */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 3,
              mb: 3,
            }}
          >
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={user?.imageURL || undefined}
                sx={{
                  width: { xs: 72, sm: 84 },
                  height: { xs: 72, sm: 84 },
                  fontSize: "2rem",
                  fontWeight: 700,
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: "#2563EB",
                  color: "white",
                  border: "2px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
              >
                <CameraAltIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {user?.name}
                </Typography>
                <Chip
                  label={user?.role || "superAdmin"}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    borderRadius: "6px",
                    backgroundColor: userRoleCfg.bg,
                    color: userRoleCfg.color,
                  }}
                />
                <Chip
                  label={user?.isActive ? "مفعّل" : "غير مفعّل"}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    borderRadius: "6px",
                    backgroundColor: user?.isActive
                      ? "rgba(22, 163, 74, 0.12)"
                      : "rgba(220, 38, 38, 0.12)",
                    color: user?.isActive ? "#16A34A" : "#DC2626",
                  }}
                />
              </Box>
              <Typography color="text.secondary" sx={{ fontSize: "0.925rem" }}>
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  mt: 0.75,
                  color: "#2563EB",
                  fontWeight: 600,
                  bgcolor: "rgba(37, 99, 235, 0.08)",
                  px: 1.25,
                  py: 0.25,
                  borderRadius: "6px",
                }}
              >
                {translate("pos.users.click_to_edit", { _: "انقر على البطاقة لتعديل بيانات حسابك" })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Quick Info Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                backgroundColor: "rgba(16, 29, 53, 0.02)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <EmailOutlinedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.email", { _: "البريد الإلكتروني:" })}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", wordBreak: "break-all" }}>
                {user?.email}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                backgroundColor: "rgba(16, 29, 53, 0.02)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <PhoneOutlinedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.phone", { _: "الهاتف:" })}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", direction: "ltr", textAlign: "left" }}>
                {user?.phone || "غير محدد"}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                backgroundColor: "rgba(16, 29, 53, 0.02)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <BadgeOutlinedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.role", { _: "الدور:" })}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: userRoleCfg.color }}>
                {userRoleCfg.label} ({user?.role})
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                backgroundColor: "rgba(16, 29, 53, 0.02)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.joined", { _: "تاريخ الانضمام:" })}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Super Admin Exclusive Section: Other Admin Accounts */}
      {isSuperAdmin && (
        <Box sx={{ mt: 5 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <PeopleOutlineIcon sx={{ color: "#2563EB", fontSize: 26 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
                {translate("pos.users.title.other_admins", { _: "حسابات المشرفين الآخرين" })}
              </Typography>
              <Chip
                label={`${admins.length} مشرف`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  bgcolor: "rgba(37, 99, 235, 0.1)",
                  color: "#2563EB",
                  borderRadius: "6px",
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              خاص بالسوبر أدمن — يمكنك حذف أي حساب مشرف مصرح له بالدخول
            </Typography>
          </Box>

          <Card
            sx={{
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 2px 10px rgba(16, 29, 53, 0.05)",
              overflow: "hidden",
            }}
          >
            {loadingAdmins ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 6 }}>
                <CircularProgress size={32} sx={{ color: "#2563EB" }} />
              </Box>
            ) : admins.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  px: 3,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <PeopleOutlineIcon sx={{ fontSize: 52, color: "text.disabled" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {translate("pos.users.empty_admins", { _: "لا توجد حسابات مشرفين أخرى حتى الآن" })}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 460 }}>
                  يمكنك إضافة مشرف جديد ومنحه صلاحيات إدارة المتجر عبر زر (Create Admin +) الموجود بأعلى الصفحة.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ backgroundColor: "rgba(16, 29, 53, 0.02)" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>المشرف</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>الهاتف</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>الدور</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>تاريخ الانضمام</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: "text.secondary" }}>
                        إجراءات
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {admins.map((adm) => {
                      const cfg = roleStyles[adm.role] || roleStyles.admin;
                      return (
                        <TableRow
                          key={adm._id}
                          hover
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            transition: "background-color 0.15s ease",
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar
                                src={adm.imageURL || undefined}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  fontSize: "1rem",
                                  fontWeight: 700,
                                  backgroundColor: "#2563EB",
                                  color: "#FFFFFF",
                                }}
                              >
                                {adm.name?.[0]?.toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                                  {adm.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                  {adm.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ direction: "ltr", display: "inline-block" }}>
                              {adm.phone || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={cfg.label}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                borderRadius: "6px",
                                backgroundColor: cfg.bg,
                                color: cfg.color,
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={adm.isActive ? "مفعّل" : "غير مفعّل"}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.7rem",
                                borderRadius: "6px",
                                backgroundColor: adm.isActive
                                  ? "rgba(22, 163, 74, 0.12)"
                                  : "rgba(220, 38, 38, 0.12)",
                                color: adm.isActive ? "#16A34A" : "#DC2626",
                              }}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                              {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : "—"}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Tooltip title="حذف حساب المشرف" arrow>
                              <IconButton
                                onClick={() => setDeleteTarget(adm)}
                                size="small"
                                sx={{
                                  color: "error.main",
                                  borderRadius: "8px",
                                  border: "1px solid",
                                  borderColor: "rgba(220, 38, 38, 0.2)",
                                  p: 1,
                                  "&:hover": {
                                    backgroundColor: "rgba(220, 38, 38, 0.08)",
                                    borderColor: "error.main",
                                  },
                                }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 19 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Box>
      )}

      {/* Edit Profile Modal Dialog */}
      <Dialog
        open={editOpen}
        onClose={handleCloseEdit}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EditOutlinedIcon sx={{ color: "#2563EB" }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {translate("pos.users.title.edit_account", { _: "تعديل بيانات الحساب" })}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseEdit} size="small" disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          {/* Avatar Edit Row */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={currentAvatarUrl || undefined}
                sx={{
                  width: 90,
                  height: 90,
                  fontSize: "2.2rem",
                  fontWeight: 700,
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                {editName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Button
                component="label"
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  minWidth: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "#2563EB",
                  color: "white",
                  border: "2px solid white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
                size="small"
              >
                <CameraAltIcon sx={{ fontSize: 16 }} />
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              </Button>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 1 }}>
              اضغط على الكاميرا لتغيير الصورة الشخصية
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label={translate("pos.users.form.name", { _: "الاسم" })}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              size="small"
              required
            />

            <TextField
              label={translate("pos.users.form.phone", { _: "رقم الهاتف" })}
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              fullWidth
              size="small"
              placeholder="+9665xxxxxxxx"
              sx={{ direction: "ltr" }}
            />

            <TextField
              label={translate("pos.users.form.email", { _: "البريد الإلكتروني" })}
              value={user?.email || ""}
              disabled
              fullWidth
              size="small"
              helperText="البريد الإلكتروني هو معرّف الحساب ولا يمكن تغييره هنا."
            />

            <Divider sx={{ my: 0.5 }}>
              <Chip
                icon={<LockResetOutlinedIcon sx={{ fontSize: 16 }} />}
                label="تغيير كلمة المرور (اختياري)"
                size="small"
                sx={{ fontSize: "0.75rem", fontWeight: 700 }}
              />
            </Divider>

            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              يمكنك كتابة كلمة مرور جديدة مباشرة دون الحاجة لكتابة القديمة. اترك الحقول فارغة إذا كنت لا ترغب في التغيير.
            </Typography>

            <TextField
              label="كلمة المرور الجديدة"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              size="small"
              placeholder="6 أحرف على الأقل"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small">
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="تأكيد كلمة المرور الجديدة"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
              placeholder="أعد إدخال كلمة المرور للتأكيد"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseEdit}
            disabled={saving}
            sx={{ borderRadius: "8px", fontWeight: 600 }}
          >
            {translate("pos.common.cancel", { _: "إلغاء" })}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={saving}
            sx={{
              backgroundColor: "#2563EB",
              borderRadius: "8px",
              fontWeight: 700,
              px: 3,
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
              "&:hover": { backgroundColor: "#1D4ED8" },
            }}
          >
            {saving ? <CircularProgress size={18} sx={{ mr: 1, color: "white" }} /> : null}
            {translate("pos.common.save", { _: "حفظ التغييرات" })}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Admin Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 1,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "error.main" }}>
          <WarningAmberRoundedIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {translate("pos.users.title.delete_admin_confirm", { _: "تأكيد حذف المشرف" })}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.primary", mb: 2 }}>
            هل أنت متأكد من رغبتك في حذف حساب المشرف التالي؟
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: "10px",
              backgroundColor: "rgba(220, 38, 38, 0.05)",
              border: "1px solid rgba(220, 38, 38, 0.15)",
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
              {deleteTarget?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {deleteTarget?.email}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              الدور: {deleteTarget?.role}
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ borderRadius: "8px", fontSize: "0.825rem" }}>
            تحذير: سيتم حذف هذا المشرف نهائياً ولن يتمكن من الدخول إلى لوحة التحكم مجدداً.
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ borderRadius: "8px", fontWeight: 600 }}
          >
            {translate("pos.common.cancel", { _: "إلغاء" })}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteAdmin}
            disabled={deleting}
            sx={{
              borderRadius: "8px",
              fontWeight: 700,
              px: 2.5,
              boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
              "&:hover": { backgroundColor: "#B91C1C" },
            }}
          >
            {deleting ? <CircularProgress size={18} sx={{ mr: 1, color: "white" }} /> : null}
            حذف المشرف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfile;
