import './globals.css';

export const metadata = { title: 'Withings Body Scan – Alešův osobní dashboard' };

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
