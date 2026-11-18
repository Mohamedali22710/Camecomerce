import * as React from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useLogin, useNotify, useLocale, Notification } from "react-admin";
import { motion } from "motion/react";
import { RTLWrapper } from "./RTLWrapper";
import { CustomLocaleSwitcher } from "./CustomLocaleSwitcher";
import { brandLightTheme } from "../themes/brandTheme";

// Force the Login page to always use the Light theme regardless of dashboard state
const forcedLightTheme = createTheme(brandLightTheme);

const Login = () => {
  const login = useLogin();
  const notify = useNotify();
  const locale = useLocale();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const logoSrc = `${import.meta.env.BASE_URL}logo.jpg`;

  const subtitle =
    locale === "ar"
      ? "لكاميرات المراقبة والأنظمة الأمنية"
      : locale === "fr"
        ? "Solutions de caméras & sécurité"
        : "Smart CCTV & Security Solutions";

  const loginTitle =
    locale === "ar"
      ? "تسجيل الدخول إلى لوحة التحكم"
      : locale === "fr"
        ? "Connexion au panneau d'administration"
        : "Sign In to Admin Dashboard";

  const loginSubtitle =
    locale === "ar"
      ? "أدخل بيانات حسابك للمتابعة"
      : locale === "fr"
        ? "Entrez vos identifiants pour continuer"
        : "Enter your credentials to continue";

  const usernameLabel =
    locale === "ar"
      ? "البريد الإلكتروني / اسم المستخدم"
      : locale === "fr"
        ? "Email / Nom d'utilisateur"
        : "Email / Username";

  const passwordLabel =
    locale === "ar"
      ? "كلمة المرور"
      : locale === "fr"
        ? "Mot de passe"
        : "Password";

  const submitLabel =
    locale === "ar"
      ? "تسجيل الدخول"
      : locale === "fr"
        ? "Se connecter"
        : "Sign In";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      notify(
        locale === "ar"
          ? "يرجى إدخال اسم المستخدم وكلمة المرور"
          : "Please enter username and password",
        { type: "warning" },
      );
      return;
    }

    setLoading(true);
    try {
      await login({ username: username.trim(), password });
    } catch (error: any) {
      setLoading(false);
      let rawMsg = typeof error === "string" ? error : error?.message || "";

      if (
        !rawMsg ||
        rawMsg.includes("Failed to fetch") ||
        rawMsg.includes("NetworkError") ||
        rawMsg.includes("Network Error")
      ) {
        const msg =
          locale === "ar"
            ? "تعذر الاتصال بالخادم. يرجى التأكد من تشغيل السيرفر (Backend Server) مرة أخرى."
            : "Unable to connect to the backend server. Please verify the server is running and try again.";
        notify(msg, { type: "error" });
      } else if (
        rawMsg.includes("timed out") ||
        rawMsg.includes("timeout") ||
        rawMsg.includes("connectTimeoutMS") ||
        rawMsg.includes("secureConnect")
      ) {
        const msg =
          locale === "ar"
            ? "استغرق الاتصال بقاعدة البيانات وقتاً أطول من المعتاد. يرجى المحاولة مرة أخرى."
            : "Database connection timed out. Please try again.";
        notify(msg, { type: "error" });
      } else {
        notify(rawMsg, { type: "error" });
      }
    }
  };

  return (
    <RTLWrapper>
      <ThemeProvider theme={forcedLightTheme}>
        <Box
          sx={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxSizing: "border-box",
            p: { xs: 2.5, sm: 3 },
            background:
              "radial-gradient(circle at 50% 15%, #172554 0%, #0F172A 55%, #0B0F19 100%)",
          }}
        >
          {/* Ambient glowing orbs strictly clipped within container */}
          <Box
            sx={{
              position: "absolute",
              top: "-10%",
              right: "-5%",
              width: { xs: 280, md: 450 },
              height: { xs: 280, md: 450 },
              borderRadius: "50%",
              background: "rgba(37, 99, 235, 0.16)",
              filter: "blur(100px)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: "-10%",
              left: "-5%",
              width: { xs: 280, md: 450 },
              height: { xs: 280, md: 450 },
              borderRadius: "50%",
              background: "rgba(30, 58, 138, 0.20)",
              filter: "blur(100px)",
              pointerEvents: "none",
            }}
          />

          {/* Top utilities bar (Language Switcher only - Light mode is permanently enforced) */}
          <Box
            sx={{
              position: "absolute",
              top: 20,
              insetInlineEnd: { xs: 16, sm: 24 },
              display: "flex",
              alignItems: "center",
              zIndex: 20,
            }}
          >
            <CustomLocaleSwitcher />
          </Box>

          {/* Main Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              width: "100%",
              maxWidth: 440,
              position: "relative",
              zIndex: 10,
              boxSizing: "border-box",
              margin: "auto 0",
            }}
          >
            <Card
              elevation={0}
              sx={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: "24px",
                backgroundColor: "#FFFFFF",
                boxShadow:
                  "0 25px 60px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)",
                p: { xs: 3.5, sm: 4.5 },
              }}
            >
              {/* Brand Identity Header */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mb: 2.5,
                }}
              >
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "16px",
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    p: 0.75,
                    boxShadow: "0 4px 14px rgba(16, 29, 53, 0.08)",
                    mb: 1.5,
                  }}
                >
                  {!imgError ? (
                    <img
                      src={logoSrc}
                      alt="الحارث الذكي"
                      onError={() => setImgError(true)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "12px",
                        background:
                          "linear-gradient(135deg, #101D35 0%, #2563EB 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                      }}
                    >
                      <VideocamIcon sx={{ fontSize: 30, color: "#FFFFFF" }} />
                    </Box>
                  )}
                </Box>

                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: "#101D35",
                    letterSpacing: "-0.02em",
                    fontSize: "1.45rem",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  الحارث الذكي
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748B",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    mt: 0.5,
                    textAlign: "center",
                  }}
                >
                  {subtitle}
                </Typography>
              </Box>

              <Divider sx={{ my: 2, borderColor: "#F1F5F9" }} />

              {/* Card Section Title */}
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "#0F172A",
                    fontSize: "1.05rem",
                    lineHeight: 1.3,
                  }}
                >
                  {loginTitle}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748B",
                    fontSize: "0.825rem",
                    mt: 0.25,
                  }}
                >
                  {loginSubtitle}
                </Typography>
              </Box>

              {/* Login Form */}
              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Box sx={{ mb: 2.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 0.75,
                      fontWeight: 600,
                      color: "#334155",
                      fontSize: "0.825rem",
                    }}
                  >
                    {usernameLabel}
                  </Typography>
                  <TextField
                    fullWidth
                    autoFocus
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="username"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon
                            sx={{ color: "#94A3B8", fontSize: 20 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "#F8FAFC",
                        color: "#0F172A",
                        "& fieldset": {
                          borderColor: "#E2E8F0",
                        },
                        "&:hover fieldset": {
                          borderColor: "#CBD5E1",
                        },
                        "&.Mui-focused": {
                          backgroundColor: "#FFFFFF",
                          "& fieldset": {
                            borderColor: "#2563EB",
                            borderWidth: 2,
                          },
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        py: 1.5,
                        fontSize: "0.925rem",
                        color: "#0F172A",
                        "&:-webkit-autofill": {
                          WebkitBoxShadow:
                            "0 0 0 100px #F8FAFC inset !important",
                          WebkitTextFillColor: "#0F172A !important",
                          caretColor: "#0F172A",
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 0.75,
                      fontWeight: 600,
                      color: "#334155",
                      fontSize: "0.825rem",
                    }}
                  >
                    {passwordLabel}
                  </Typography>
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon
                            sx={{ color: "#94A3B8", fontSize: 20 }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: "#94A3B8" }}
                          >
                            {showPassword ? (
                              <VisibilityOffOutlinedIcon
                                sx={{ fontSize: 20 }}
                              />
                            ) : (
                              <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: "#F8FAFC",
                        color: "#0F172A",
                        "& fieldset": {
                          borderColor: "#E2E8F0",
                        },
                        "&:hover fieldset": {
                          borderColor: "#CBD5E1",
                        },
                        "&.Mui-focused": {
                          backgroundColor: "#FFFFFF",
                          "& fieldset": {
                            borderColor: "#2563EB",
                            borderWidth: 2,
                          },
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        py: 1.5,
                        fontSize: "0.925rem",
                        color: "#0F172A",
                        "&:-webkit-autofill": {
                          WebkitBoxShadow:
                            "0 0 0 100px #F8FAFC inset !important",
                          WebkitTextFillColor: "#0F172A !important",
                          caretColor: "#0F172A",
                        },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    height: 48,
                    borderRadius: "12px",
                    backgroundColor: "#2563EB",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    textTransform: "none",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#1D4ED8",
                      boxShadow: "0 6px 20px rgba(37, 99, 235, 0.45)",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: "rgba(37, 99, 235, 0.5)",
                      color: "#FFFFFF",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={22} sx={{ color: "#FFFFFF" }} />
                  ) : (
                    submitLabel
                  )}
                </Button>
              </Box>
            </Card>
          </motion.div>

          {/* Footer copyright */}
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255, 255, 255, 0.55)",
              fontSize: "0.8rem",
              mt: 3,
              textAlign: "center",
              zIndex: 10,
            }}
          >
            جميع الحقوق محفوظة © 2026 الحارث الذكي
          </Typography>

          <Notification />
        </Box>
      </ThemeProvider>
    </RTLWrapper>
  );
};

export default Login;

