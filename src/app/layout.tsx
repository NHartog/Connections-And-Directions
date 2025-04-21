'use client'
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Stack } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import {useRouter} from "next/navigation";
import HomeIcon from '@mui/icons-material/Home';
import './globals.css'

const Layout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    return (
        <html lang="en">
            <body style={{ margin: 0, padding: 0 }}>
                <AppRouterCacheProvider>
                    <Box sx={{ width: '100dvw', height: '100dvh' }}>
                        <AppBar position="static" sx={{ backgroundColor: '#add8e6', height: '64px' }}>
                            <Toolbar>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{width: 1}}>
                                    <Typography variant="h6" sx={{ color: '#003366' }}>
                                        Connections & Directions
                                    </Typography>
                                    <Button
                                        onClick={() => router.push('/')}
                                        startIcon={<HomeIcon />}
                                        sx={{
                                            color: '#fff',
                                            backgroundColor: '#003366',
                                            '&:hover': { backgroundColor: '#001f4d' }
                                        }}
                                    >
                                        Home
                                    </Button>
                                </Stack>
                            </Toolbar>
                        </AppBar>
                        <Box sx={{ width: 1, height: 'calc(100% - 64px)' }}>{children}</Box>
                    </Box>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
};

export default Layout;
