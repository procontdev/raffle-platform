import './styles.css';

export const metadata = {
  title: 'Raffle Platform',
  description: 'Verifiable raffle platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
