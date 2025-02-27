import type { Metadata } from "next";
import "./globals.css";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

export const metadata: Metadata = {
  title: "Connections and Directions",
  description: "Your one stop shop for Chen's and Crow's foot notation for ERD diagrams & databases",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Box sx={{ width: '100vw', height: '100vh' }}>
            {children}
          </Box>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
