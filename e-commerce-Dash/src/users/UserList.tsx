import * as React from "react";
import { useState, useEffect } from "react";
import { Title, useDefaultTitle, useNotify, CreateButton, usePermissions, useTranslate } from "react-admin";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Divider,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { getAuthHeaders, fetchWithRefresh } from "../auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3007/v1";

const UserProfile = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const appTitle = useDefaultTitle();
  const notify = useNotify();
  const { permissions } = usePermissions();
  const translate = useTranslate();

  useEffect(() => {
    fetchWithRefresh(`${API_URL}/user/profile`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((json) => {
        setUser(json.data);
        setPhone(json.data?.phone || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (phone) fd.append("phone", phone);
      if (imageFile) fd.append("image", imageFile);

      const res = await fetchWithRefresh(`${API_URL}/user/profile`, {
        method: "PUT",
        headers: { ...getAuthHeaders() },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || translate("pos.users.notification.save_failed"));
      }

      const json = await res.json();
      setUser(json.data);
      setImageFile(null);
      setPreview(null);
      notify(translate("pos.users.notification.profile_updated"), { type: "success" });
    } catch (e: any) {
      notify(e.message, { type: "warning" });
    }
    setSaving(false);
  };

  if (loading) return null;

  const displayUrl = preview || user?.imageURL;

  const roleStyles: Record<string, { bg: string; color: string }> = {
    superAdmin: { bg: 'rgba(16, 29, 53, 0.15)', color: '#101D35' },
    admin: { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' },
    user: { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569' },
  };
  const roleCfg = roleStyles[user?.role] || roleStyles.user;

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", mt: 3, mb: 4 }}>
      <title>{`${appTitle} - Profile`}</title>
      <Title title={translate("pos.users.title.profile")} />
      
      {permissions === "superAdmin" && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <CreateButton
            label="Create Admin"
            variant="contained"
            sx={{
              backgroundColor: '#2563EB',
              borderRadius: '8px',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
              '&:hover': {
                backgroundColor: '#1D4ED8',
              },
            }}
          />
        </Box>
      )}

      <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", boxShadow: "0 2px 6px rgba(16, 29, 53, 0.05)" }}>
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={displayUrl}
                sx={{
                  width: 84,
                  height: 84,
                  fontSize: '2rem',
                  fontWeight: 700,
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
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
                  border: '2px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  "&:hover": { bgcolor: "#1D4ED8" },
                }}
                size="small"
              >
                <CameraAltIcon sx={{ fontSize: 16 }} />
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              </Button>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {user?.name}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: '0.9rem', mb: 1 }}>
                {user?.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={user?.role}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    backgroundColor: roleCfg.bg,
                    color: roleCfg.color,
                  }}
                />
                <Chip
                  label={user?.isActive ? "مفعّل" : "غير مفعّل"}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    borderRadius: '6px',
                    backgroundColor: user?.isActive ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                    color: user?.isActive ? '#16A34A' : '#DC2626',
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label={translate("pos.common.phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              size="small"
              sx={{ direction: 'ltr' }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                p: 2,
                borderRadius: "10px",
                backgroundColor: "rgba(16, 29, 53, 0.02)",
                border: "1px solid #E5E7EB",
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.email")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.25 }}>
                  {user?.email}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.role")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.25 }}>
                  {user?.role}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.active")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: user?.isActive ? '#16A34A' : '#DC2626', mt: 0.25 }}>
                  {user?.isActive ? "Yes / نعم" : "No / لا"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {translate("pos.users.info.joined")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.25 }}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  backgroundColor: '#2563EB',
                  borderRadius: '8px',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': { backgroundColor: '#1D4ED8' },
                }}
              >
                {saving ? <CircularProgress size={18} sx={{ mr: 1, color: 'white' }} /> : null}
                {translate("pos.common.save")}
              </Button>
              {(imageFile || phone !== (user?.phone || "")) && (
                <Button
                  variant="outlined"
                  onClick={() => { setPhone(user?.phone || ""); setImageFile(null); setPreview(null); }}
                  sx={{ borderRadius: '8px' }}
                >
                  {translate("pos.common.cancel")}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserProfile;
