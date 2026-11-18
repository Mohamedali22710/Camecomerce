import * as React from "react";
import { useState } from "react";
import { Title, useDefaultTitle, useNotify, useTranslate } from "react-admin";
import {
  Card,
  CardContent,
  Box,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import { fetchWithRefresh, getAuthHeaders } from "../auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3007/v1";

const AdminCreate = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const appTitle = useDefaultTitle();
  const notify = useNotify();
  const translate = useTranslate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return notify(translate("pos.users.notification.email_required"), { type: "warning" });
    if (password.length < 6) return notify(translate("pos.users.notification.password_min"), { type: "warning" });
    if (password !== confirmPassword) return notify(translate("pos.users.notification.password_mismatch"), { type: "warning" });

    setSaving(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ email, password, confirmPassword, phone: phone || undefined, role: "admin" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create admin");
      }

      notify("Admin created", { type: "success" });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPhone("");
    } catch (e: any) {
      notify(e.message, { type: "warning" });
    }
    setSaving(false);
  };

  return (
    <Box sx={{ maxWidth: 540, mx: "auto", mt: 4, mb: 4 }}>
      <title>{`${appTitle} - Create Admin`}</title>
      <Title title="Create Admin" />
      <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", boxShadow: "0 2px 6px rgba(16, 29, 53, 0.05)" }}>
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2 }}>
            <PersonAddOutlinedIcon sx={{ color: "primary.main", fontSize: 26 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
                إنشاء حساب مشرف جديد
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                منح صلاحيات إدارة المنتجات والطلبات والتصنيفات
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label={translate("pos.users.form.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              size="small"
            />
            <TextField
              label={translate("pos.users.form.password")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              size="small"
              inputProps={{ minLength: 6 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label={translate("pos.users.form.confirm_password")}
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              size="small"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small">
                        {showConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label={translate("pos.users.form.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="small"
              sx={{ direction: "ltr" }}
            />
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                sx={{
                  backgroundColor: "#2563EB",
                  borderRadius: "8px",
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                  "&:hover": { backgroundColor: "#1D4ED8" },
                }}
              >
                {saving ? <CircularProgress size={18} sx={{ mr: 1, color: "white" }} /> : null}
                Create Admin
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminCreate;
