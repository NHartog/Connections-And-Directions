import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
        <body style={{margin: 0, padding: 0}}>
        <Box>
            <AppBar position="static" sx={{backgroundColor: '#add8e6'}}>
                <Toolbar>
                    <Typography variant="h6" sx={{flexGrow: 1, color: '#003366'}}>
                        Connections & Directions
                    </Typography>
                    <Button sx={{
                        color: '#fff',
                        backgroundColor: '#003366',
                        '&:hover': {backgroundColor: '#001f4d'}
                    }}>LOGIN</Button>
                </Toolbar>
            </AppBar>
            <Container sx={{marginTop: 4}}>{children}</Container>
        </Box>
        </body>
        </html>
    );
};

export default Layout;