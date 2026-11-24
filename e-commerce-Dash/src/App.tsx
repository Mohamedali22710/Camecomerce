import polyglotI18nProvider from "ra-i18n-polyglot";
import {
  Admin,
  CustomRoutes,
  Resource,
  localStorageStore,
  useStore,
  StoreContextProvider,
} from "react-admin";
import { Route } from "react-router";

import authProvider from "./authProvider";
import { AuthProvider } from "./context/AuthContext";
import categories from "./categories";
import subcategories from "./subcategories";
import { Dashboard } from "./dashboard";
import dataProviderFactory from "./dataProvider";
import englishMessages from "./i18n/en";
import arabicMessages from "./i18n/ar";
import { Layout, Login } from "./layout";
import orders from "./orders";
import products from "./products";
import users from "./users";
import settings from "./settings";
import { themes, ThemeName } from "./themes/themes";

const getInitialLocale = (): string => {
  try {
    const saved = localStorage.getItem("ECommerce.locale") || localStorage.getItem("locale");
    if (saved && ["ar", "en"].includes(saved)) {
      return saved;
    }
  } catch {}
  return "ar";
};

const initialLocale = getInitialLocale();

const messagesMap: Record<string, any> = {
  ar: arabicMessages,
  en: englishMessages,
};

const baseI18nProvider = polyglotI18nProvider(
  (locale) => {
    if (messagesMap[locale]) {
      return messagesMap[locale];
    }
    return arabicMessages;
  },
  initialLocale,
  [
    { locale: "ar", name: "العربية" },
    { locale: "en", name: "English" },
  ],
);

const i18nProvider = {
  ...baseI18nProvider,
  changeLocale: (newLocale: string, options?: any) => {
    try {
      localStorage.setItem("ECommerce.locale", newLocale);
      localStorage.setItem("locale", newLocale);
    } catch {}
    return baseI18nProvider.changeLocale(newLocale, options);
  },
};

const store = localStorageStore(undefined, "ECommerce");

const App = () => {
  const [themeName] = useStore<ThemeName>("themeName", "brand");
  const singleTheme = themes.find((theme) => theme.name === themeName)?.single;
  const lightTheme = themes.find((theme) => theme.name === themeName)?.light;
  const darkTheme = themes.find((theme) => theme.name === themeName)?.dark;
  return (
    <Admin
      title="Admin Dashboard"
      dataProvider={dataProviderFactory(import.meta.env.VITE_API_URL || "")}
      store={store}
      authProvider={authProvider}
      dashboard={Dashboard}
      loginPage={Login}
      layout={Layout}
      i18nProvider={i18nProvider}
      disableTelemetry
      theme={singleTheme}
      lightTheme={lightTheme}
      darkTheme={darkTheme}
      defaultTheme="light"
      requireAuth
    >
      <Resource name="categories" {...categories} />
      <Resource name="subcategories" {...subcategories} />
      <Resource name="products" {...products} />
      <Resource name="orders" {...orders} />
      <Resource name="users" {...users} />
      <CustomRoutes>
        <Route path="/shipping" element={<settings.page />} />
      </CustomRoutes>
    </Admin>
  );
};

const AppWrapper = () => (
  <StoreContextProvider value={store}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StoreContextProvider>
);

export default AppWrapper;

