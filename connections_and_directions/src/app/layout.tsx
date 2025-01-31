import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
